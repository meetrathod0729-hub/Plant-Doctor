
from datetime import datetime, timezone

from bson import ObjectId

from database.mongodb import diagnoses_collection
from models.diagnosis import StoredDiagnosis


def save_diagnosis(user_id: str, diagnosis: dict) -> dict:
    record = StoredDiagnosis(
        user_id=user_id,
        **diagnosis,
    )

    document = record.model_dump()

    # Convert the authenticated user ID to MongoDB ObjectId.
    document["user_id"] = ObjectId(user_id)

    # Ensure a timestamp is present before inserting.
    document.setdefault("created_at", datetime.now(timezone.utc))

    result = diagnoses_collection.insert_one(document)
    document["_id"] = result.inserted_id

    return serialize_diagnosis(document)


def get_user_diagnoses(user_id: str, limit: int = 20) -> list[dict]:
    records = diagnoses_collection.find(
        {"user_id": ObjectId(user_id)}
    ).sort("created_at", -1).limit(limit)

    return [serialize_diagnosis(record) for record in records]


def serialize_diagnosis(record: dict) -> dict:
    created_at = record.get("created_at")

    if created_at is None:
        created_at = datetime.now(timezone.utc)

    return {
        "id": str(record["_id"]),
        "plant_name": record.get("plant_name", "Unknown plant"),
        "health_status": record["health_status"],
        "likely_issue": record["likely_issue"],
        "confidence": record["confidence"],
        "observations": record.get("observations", []),
        "recommendations": record.get("recommendations", []),
        "next_check": record.get("next_check", "Within 24–48 hours"),
        "created_at": created_at.isoformat(),
    }
