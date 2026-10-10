
import io
import json
import logging
import warnings

from bson import ObjectId
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import ValidationError

from config import settings
from models.diagnosis import DiagnosisRecord
from services.diagnosis_service import save_diagnosis
from utils.security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/diagnose",
    tags=["Plant Diagnosis"],
)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

MAX_IMAGE_SIZE = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 25_000_000
MAX_IMAGE_DIMENSION = 1280
JPEG_QUALITY = 85


def get_diagnosis_provider():
    """Return the diagnosis function for the configured AI provider."""

    provider = settings.AI_PROVIDER

    if provider == "gemini":
        from providers.gemini_provider import diagnose_plant

        return diagnose_plant

    if provider == "ollama":
        from providers.ollama_provider import diagnose_plant

        return diagnose_plant

    raise RuntimeError(
        f"Unsupported AI_PROVIDER: {provider!r}. "
        "Use 'gemini' or 'ollama'."
    )


def prepare_image(image_bytes: bytes) -> bytes:
    """Validate an uploaded image and return a resized JPEG."""

    try:
        with warnings.catch_warnings():
            warnings.simplefilter(
                "error",
                Image.DecompressionBombWarning,
            )

            with Image.open(io.BytesIO(image_bytes)) as source:
                if source.format not in ALLOWED_FORMATS:
                    raise HTTPException(
                        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                        detail=(
                            "The file must contain a valid JPEG, PNG, "
                            "or WebP image."
                        ),
                    )

                width, height = source.size

                if width <= 0 or height <= 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="The uploaded image has invalid dimensions.",
                    )

                if width * height > MAX_IMAGE_PIXELS:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=(
                            "Image dimensions are too large. "
                            "Please upload a smaller image."
                        ),
                    )

                source.load()
                corrected = ImageOps.exif_transpose(source)

                # Flatten transparent images onto a white background.
                if corrected.mode in ("RGBA", "LA") or (
                    corrected.mode == "P"
                    and "transparency" in corrected.info
                ):
                    rgba = corrected.convert("RGBA")
                    background = Image.new(
                        "RGBA",
                        rgba.size,
                        (255, 255, 255, 255),
                    )
                    corrected = Image.alpha_composite(
                        background,
                        rgba,
                    ).convert("RGB")
                else:
                    corrected = corrected.convert("RGB")

                # Preserve aspect ratio while limiting image dimensions.
                corrected.thumbnail(
                    (MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION),
                    Image.Resampling.LANCZOS,
                )

                output = io.BytesIO()
                corrected.save(
                    output,
                    format="JPEG",
                    quality=JPEG_QUALITY,
                    optimize=True,
                )

                return output.getvalue()

    except HTTPException:
        raise
    except (
        UnidentifiedImageError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        OSError,
        ValueError,
    ) as exc:
        logger.warning(
            "Invalid or unsafe uploaded image: %s",
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This image is invalid or could not be processed. "
                "Please upload another photo."
            ),
        ) from exc


@router.post("/")
async def create_diagnosis(
    image: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    # Validate authenticated user identity.
    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identity.",
        )

    # Check the declared content type.
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload a JPEG, PNG, or WebP image.",
        )

    # Read at most 10 MB plus one byte to detect oversized uploads.
    try:
        image_bytes = await image.read(MAX_IMAGE_SIZE + 1)
    finally:
        await image.close()

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded image is empty.",
        )

    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image must be 10 MB or smaller.",
        )

    # Verify the actual file and normalize it to JPEG.
    prepared_image = prepare_image(image_bytes)

    # Select Gemini or Ollama according to AI_PROVIDER.
    try:
        diagnose_plant = get_diagnosis_provider()
        raw_result = diagnose_plant(prepared_image)

    except Exception as exc:
        logger.exception(
            "Plant inference failed using provider %r",
            settings.AI_PROVIDER,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Plant analysis failed. Please try again.",
        ) from exc

    # Parse and validate the provider's JSON response.
    try:
        parsed_result = json.loads(raw_result)
        diagnosis = DiagnosisRecord.model_validate(parsed_result)

    except (
        json.JSONDecodeError,
        ValidationError,
        TypeError,
    ) as exc:
        logger.exception(
            "Invalid diagnosis JSON returned by the AI provider"
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "The AI returned an invalid diagnosis. "
                "Please try again."
            ),
        ) from exc

    # Save the validated diagnosis to the database.
    try:
        saved_diagnosis = save_diagnosis(
            user_id=user_id,
            diagnosis=diagnosis.model_dump(),
        )

    except Exception as exc:
        logger.exception("Failed to save plant diagnosis")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "The diagnosis was generated but could not be saved."
            ),
        ) from exc

    return {
        "message": "Plant analyzed and diagnosis saved successfully",
        "diagnosis": saved_diagnosis,
    }
