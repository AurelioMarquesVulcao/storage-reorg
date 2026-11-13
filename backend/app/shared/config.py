from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    PORT: int = 8070
    HDS: List[str] = [
        "/mnt/dados",
        "/mnt/aurelio-yasmin",
        "/mnt/1tera",
        "/mnt/samsung300",
        "/mnt/1tb-filmes",
    ]
    VIDEO_EXTENSIONS: List[str] = [".mkv", ".mp4", ".avi", ".mov", ".wmv", ".m4v"]

    class Config:
        env_file = ".env"


settings = Settings()
