from pymongo import MongoClient
from config import settings

client = MongoClient(
    settings.MONGO_URI,
    serverSelectionTimeoutMS=5000
)

db = client[settings.DATABASE_NAME]

users_collection = db["users"]
diagnoses_collection = db["diagnoses"]