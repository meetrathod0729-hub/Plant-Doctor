
import logging

from google import genai
from google.genai import types

from config import settings
from prompt import DIAGNOSIS_PROMPT

logger = logging.getLogger(__name__)

client = None


def get_client():
    """Create the Gemini client only when it is first needed."""
    global client

    if client is None:
        api_key = settings.GEMINI_API_KEY

        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is missing from the backend environment."
            )

        client = genai.Client(api_key=api_key)

    return client


def diagnose_plant(image_bytes: bytes) -> str:
    """
    Analyze a plant image using Gemini Vision.

    Args:
        image_bytes: JPEG image bytes from prepare_image().

    Returns:
        The model's JSON response as a string.
    """
    if not image_bytes:
        raise ValueError("The plant image is empty.")

    gemini = get_client()

    response = gemini.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[
            DIAGNOSIS_PROMPT,
            types.Part.from_bytes(
                data=image_bytes,
                mime_type="image/jpeg",
            ),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
            max_output_tokens=1500,
        ),
    )

    result = response.text

    if not result or not result.strip():
        logger.warning("Gemini returned an empty diagnosis.")
        raise RuntimeError("Gemini returned an empty response.")

    return result.strip()
