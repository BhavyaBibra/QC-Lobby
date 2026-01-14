from fastapi import FastAPI
from app.api.v1 import health
from app.core.config import settings

app = FastAPI(
    title="QC Lobby API",
    description="Video Quality Control SaaS Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.include_router(health.router, prefix="/v1", tags=["health"])

@app.get("/")
async def root():
    return {"message": "QC Lobby API", "version": "1.0.0"}
