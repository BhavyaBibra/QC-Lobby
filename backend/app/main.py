import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import health
from app.core.config import settings
from app.api.v1 import teams
from app.api.v1 import jobs
from app.api.v1 import onboarding
from app.api.v1 import callbacks
from app.workers.auto_job_processor import auto_process_jobs
from fastapi.security import HTTPBearer


security = HTTPBearer()


app = FastAPI(
    title="QC Lobby API",
    description="Video Quality Control SaaS Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Start background job processor on application startup."""
    print(f"[startup] n8n processing enabled: {settings.USE_N8N_PROCESSING}")
    print(f"[startup] n8n webhook URL: {settings.N8N_WEBHOOK_URL}")
    asyncio.create_task(auto_process_jobs())


app.include_router(health.router, prefix="/v1", tags=["health"])

@app.get("/")
async def root():
    return {"message": "QC Lobby API", "version": "1.0.0"}


app.include_router(teams.router, prefix="/v1", tags=["teams"])
app.include_router(jobs.router, prefix="/v1", tags=["jobs"])
app.include_router(onboarding.router, prefix="/v1", tags=["onboarding"])
app.include_router(callbacks.router, prefix="/v1", tags=["n8n-callbacks"])


print("REGISTERED ROUTES:")
for route in app.routes:
    print(route.path)


