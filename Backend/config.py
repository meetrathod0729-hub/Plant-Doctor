
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    MONGO_URI = os.getenv("MONGO_URI")
    DATABASE_NAME = os.getenv("DATABASE_NAME", "plant_doctor")

    JWT_SECRET = os.getenv(
        "JWT_SECRET",
        "change-this-secret"
    )
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRATION_MINUTES = 60 * 24

    # AI provider selection
    AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama").lower()

    # Ollama configuration (local development)
    OLLAMA_URL = os.getenv(
        "OLLAMA_URL",
        "http://localhost:11434"
    )
    OLLAMA_MODEL = os.getenv(
        "OLLAMA_MODEL",
        "qwen2.5vl:3b"
    )

    # Gemini configuration (hosted deployment)
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = os.getenv(
        "GEMINI_MODEL",
        "gemini-3.8-flash"
    )


settings = Settings()
