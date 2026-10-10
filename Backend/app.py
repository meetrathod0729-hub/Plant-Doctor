
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.mongodb import client
from routes.auth import router as auth_router
from routes.history import router as history_router
from routes.diagnosis import router as diagnosis_router


app = FastAPI(
    title="Plant Doctor API",
    description="AI-powered plant health diagnosis API",
    version="1.0.0",
)

# Set FRONTEND_URL in Render to your deployed frontend URL.
# Locally, localhost origins are allowed by default.
frontend_url = os.getenv("FRONTEND_URL", "").strip()

allowed_origins = [
    origin.strip().rstrip("/")
    for origin in frontend_url.split(",")
    if origin.strip()
]

if not allowed_origins:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth_router)
app.include_router(history_router)
app.include_router(diagnosis_router)


@app.get("/")
async def root():
    return {
        "message": "Plant Doctor API is running 🌱"
    }


@app.get("/health")
async def health_check():
    try:
        client.admin.command("ping")
        return {
            "status": "healthy",
            "database": "connected",
        }
    except Exception:
        # Avoid returning internal database details publicly.
        return {
            "status": "unhealthy",
            "database": "disconnected",
        }
