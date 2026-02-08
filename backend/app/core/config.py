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
    N8N_WEBHOOK_URL: str
    N8N_API_KEY: str
    N8N_CALLBACK_BASE_URL: Optional[str] = None  # Your backend's public URL for n8n callbacks
    USE_N8N_PROCESSING: bool = True  # Set to False to use mock processing

    class Config:
        env_file = BASE_DIR / ".env"
        env_file_encoding = "utf-8"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.USE_N8N_PROCESSING and not self.N8N_CALLBACK_BASE_URL:
            import warnings
            warnings.warn(
                "N8N_CALLBACK_BASE_URL is not set. n8n workflow will not be able to "
                "send callbacks unless the URL is hardcoded in the workflow.",
                UserWarning
            )


settings = Settings()
