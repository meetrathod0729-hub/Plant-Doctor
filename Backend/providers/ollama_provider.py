
import base64
import json

import requests

from config import settings
from prompt import DIAGNOSIS_PROMPT


PLANT_IDENTIFICATION_GUIDANCE = """

Additional plant-identification guidance:
- Inspect the entire image, not just individual leaves.
- Consider flower shape and color, leaf arrangement, stem appearance,
  and the plant's overall growth pattern.
- Use distinctive visible features to support identification.
- Identify the plant at the broadest reliable level.
- Do not infer plant identity solely from symptoms.
- Do not mistake the background, pot, or nearby plants for the plant.
- If the image does not support identification, use "Unknown plant".

For health assessment:
- Describe visible symptoms separately from possible causes.
- Yellowing, browning, and spots can have multiple causes.
- Do not claim a disease is confirmed from appearance alone.
- Use "Uncertain" when the evidence is insufficient.

Return only the required JSON object.
"""


REQUIRED_KEYS = {
    "plant_name",
    "health_status",
    "likely_issue",
    "confidence",
    "observations",
    "recommendations",
    "next_check",
}

ALLOWED_STATUSES = {
    "Healthy",
    "Needs attention",
    "Uncertain",
}


def _validate_response(result: str) -> dict:
    """Parse and validate the model's structured response."""

    try:
        parsed = json.loads(result)
    except json.JSONDecodeError as exc:
        raise ValueError("The model returned invalid JSON.") from exc

    if not isinstance(parsed, dict):
        raise ValueError("The model response must be a JSON object.")

    missing_keys = REQUIRED_KEYS - parsed.keys()

    if missing_keys:
        raise ValueError(
            f"The model response is missing keys: {sorted(missing_keys)}"
        )

    for field in ("plant_name", "likely_issue", "next_check"):
        value = parsed[field]

        if not isinstance(value, str) or not value.strip():
            raise ValueError(
                f"The model field '{field}' must be a non-empty string."
            )

        parsed[field] = value.strip()

    if parsed["health_status"] not in ALLOWED_STATUSES:
        raise ValueError("The model returned an invalid health_status.")

    confidence = parsed["confidence"]

    if (
        isinstance(confidence, bool)
        or not isinstance(confidence, (int, float))
        or not 0.0 <= confidence <= 1.0
    ):
        raise ValueError("The model returned an invalid confidence score.")

    for field in ("observations", "recommendations"):
        value = parsed[field]

        if (
            not isinstance(value, list)
            or not all(isinstance(item, str) for item in value)
        ):
            raise ValueError(
                f"The model field '{field}' must be an array of strings."
            )

        parsed[field] = [
            item.strip() for item in value if item.strip()
        ]

    return parsed


def _call_ollama(image_base64: str, prompt: str) -> str:
    """Send an image and prompt to the local Ollama server."""

    response = requests.post(
        f"{settings.OLLAMA_URL.rstrip('/')}/api/generate",
        json={
            "model": settings.OLLAMA_MODEL,
            "prompt": prompt,
            "images": [image_base64],
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.2,
                "num_ctx": 4096,
                "num_gpu": 0,
            },
        },
        timeout=180,
    )

    if not response.ok:
        print("\n--- OLLAMA HTTP ERROR ---", flush=True)
        print("Status:", response.status_code, flush=True)
        print("Body:", response.text[:2000], flush=True)
        print("-------------------------", flush=True)
        response.raise_for_status()

    data = response.json()
    result = data.get("response", "").strip()

    if not result:
        print("\n--- EMPTY OLLAMA RESPONSE ---", flush=True)

        for key in (
            "error",
            "done",
            "done_reason",
            "prompt_eval_count",
            "eval_count",
            "total_duration",
            "load_duration",
        ):
            print(
                f"{key}: {data.get(key, '<missing>')}",
                flush=True,
            )

        print("Response keys:", list(data.keys()), flush=True)
        print("-----------------------------", flush=True)

        raise ValueError("The model returned an empty response.")

    return result


def diagnose_plant(image_bytes: bytes) -> str:
    """
    Analyze a plant image using the local Ollama vision model.

    Returns:
        A validated JSON string compatible with the diagnosis route.
    """

    if not image_bytes:
        raise ValueError("The uploaded image is empty.")

    image_base64 = base64.b64encode(image_bytes).decode("utf-8")
    prompt = DIAGNOSIS_PROMPT + PLANT_IDENTIFICATION_GUIDANCE

    # First attempt.
    result = _call_ollama(image_base64, prompt)

    try:
        parsed = _validate_response(result)

    except ValueError as first_error:
        # Retry once for malformed JSON or invalid output fields.
        retry_prompt = (
            prompt
            + "\nYour previous response failed validation: "
            + str(first_error)
            + "\nAnalyze the same image again. Return one corrected JSON "
              "object with all required keys and valid values. "
              "Do not include explanatory text."
        )

        result = _call_ollama(image_base64, retry_prompt)
        parsed = _validate_response(result)

    return json.dumps(parsed, ensure_ascii=False)
