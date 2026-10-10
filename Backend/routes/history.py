from fastapi import APIRouter, Depends, Query

from services.diagnosis_service import get_user_diagnoses
from utils.security import get_current_user


router = APIRouter(
    prefix="/api/history",
    tags=["Plant History"]
)


@router.get("/")
async def get_history(
    user_id: str = Depends(get_current_user),
    limit: int = Query(default=20, ge=1, le=100)
):
    diagnoses = get_user_diagnoses(
        user_id=user_id,
        limit=limit
    )

    return {
        "count": len(diagnoses),
        "diagnoses": diagnoses
    }