from bson import ObjectId

from database.mongodb import users_collection
from utils.security import (
    hash_password,
    verify_password,
    create_access_token
)


def create_user(name: str, email: str, password: str):
    existing_user = users_collection.find_one({
        "email": email.lower()
    })

    if existing_user:
        return None

    user = {
        "name": name,
        "email": email.lower(),
        "password": hash_password(password)
    }

    result = users_collection.insert_one(user)

    return {
        "id": str(result.inserted_id),
        "name": name,
        "email": email.lower()
    }


def authenticate_user(email: str, password: str):
    user = users_collection.find_one({
        "email": email.lower()
    })

    if not user:
        return None

    if not verify_password(password, user["password"]):
        return None

    token = create_access_token(str(user["_id"]))

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"]
        }
    }


def get_user_by_id(user_id: str):
    try:
        user = users_collection.find_one({
            "_id": ObjectId(user_id)
        })
    except Exception:
        return None

    if not user:
        return None

    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"]
    }