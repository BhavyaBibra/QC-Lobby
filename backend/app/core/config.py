from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional


BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    # App
    app_name: str = "QC Lobby"
    app_version: str = "1.0.0"
    debug: bool = False

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str

    # n8n Integration
    N8N_WEBHOOK_URL: str = "https://n8n.srv1108165.hstgr.cloud/webhook/90dbb8a2-87c5-4705-9944-22b90d976c32"
    N8N_API_KEY: str = "qclobby_n8n_key_7d5c9f3a2b8e41c0a9f6e2d7b3c1f5a8"
    N8N_CALLBACK_BASE_URL: Optional[str] = None  # Your backend's public URL for n8n callbacks
    USE_N8N_PROCESSING: bool = True  # Set to False to use mock processing

    class Config:
        env_file = BASE_DIR / ".env"
        env_file_encoding = "utf-8"


settings = Settings()
