
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


HealthStatus = Literal[
    "Healthy",
    "Needs attention",
    "Uncertain",
]


class DiagnosisRecord(BaseModel):
    """Validates the diagnosis returned by the AI model."""

    model_config = ConfigDict(str_strip_whitespace=True)

    plant_name: str = Field(
        default="Unknown plant",
        min_length=1,
    )

    health_status: HealthStatus = Field(
        description="Must be Healthy, Needs attention, or Uncertain."
    )

    likely_issue: str = Field(min_length=1)

    confidence: float = Field(ge=0.0, le=1.0)

    observations: list[str] = Field(default_factory=list)

    recommendations: list[str] = Field(default_factory=list)

    next_check: str = Field(
        default="Within 24–48 hours",
        min_length=1,
    )


class StoredDiagnosis(DiagnosisRecord):
    """Adds application-managed fields for MongoDB storage."""

    user_id: str

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
