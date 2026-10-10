from fastapi import APIRouter, HTTPException, status

from models.user import (
    UserSignup,
    UserLogin
)

from services.auth_service import (
    create_user,
    authenticate_user
)
from fastapi import Depends
from utils.security import get_current_user
from services.auth_service import get_user_by_id


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


@router.post("/signup")
async def signup(user: UserSignup):

    new_user = create_user(
        name=user.name,
        email=user.email,
        password=user.password
    )

    if new_user is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    return {
        "message": "Account created successfully",
        "user": new_user
    }


@router.post("/login")
async def login(user: UserLogin):

    result = authenticate_user(
        email=user.email,
        password=user.password
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    return result

@router.get("/me")
async def get_me(user_id: str = Depends(get_current_user)):

    user = get_user_by_id(user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return {
        "user": user
    }