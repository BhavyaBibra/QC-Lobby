from fastapi import FastAPI
from app.api.v1 import health
from app.core.config import settings
from app.api.v1 import teams
from app.api.v1 import jobs
from fastapi.security import HTTPBearer


security = HTTPBearer()


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


app.include_router(teams.router, prefix="/v1", tags=["teams"])
app.include_router(jobs.router, prefix="/v1", tags=["jobs"])


print("REGISTERED ROUTES:")
for route in app.routes:
    print(route.path)


