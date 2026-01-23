from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.supabase import supabase
from app.core.auth import get_current_user
from enum import Enum

from app.workers.job_processor import process_pending_jobs  # ✅ moved to top


# ---------------- ENUM ----------------

class JobStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


# ---------------- ROUTER ----------------

router = APIRouter()


# ---------------- SCHEMAS ----------------

class JobCreate(BaseModel):
    video_url: str


class JobStatusUpdate(BaseModel):
    status: JobStatus


# ---------------- ROUTES ----------------

@router.get("/jobs")
def list_jobs(user=Depends(get_current_user)):
    response = supabase.table("qc_jobs").select("*").execute()
    return response.data


@router.post("/jobs")
def create_job(job: JobCreate, user=Depends(get_current_user)):
    user_profile = (
        supabase
        .table("users")
        .select("team_id")
        .eq("id", user.id)
        .execute()
    )

    if not user_profile.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    team_id = user_profile.data[0]["team_id"]

    response = supabase.table("qc_jobs").insert({
        "team_id": team_id,
        "video_url": job.video_url,
        "status": JobStatus.pending.value
    }).execute()

    return response.data[0]


@router.patch("/jobs/{job_id}/status")
def update_job_status(
    job_id: UUID,
    status_update: JobStatusUpdate,
    user=Depends(get_current_user)
):
    allowed_statuses = {
        JobStatus.processing,
        JobStatus.completed,
        JobStatus.failed
    }

    if status_update.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status update. Allowed: {[s.value for s in allowed_statuses]}"
        )

    user_profile = (
        supabase
        .table("users")
        .select("team_id")
        .eq("id", user.id)
        .execute()
    )

    if not user_profile.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    team_id = user_profile.data[0]["team_id"]

    job_res = (
        supabase
        .table("qc_jobs")
        .select("*")
        .eq("id", str(job_id))
        .limit(1)
        .execute()
    )

    if not job_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    job = job_res.data[0]

    if job["team_id"] != team_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this job"
        )

    update_res = (
        supabase
        .table("qc_jobs")
        .update({"status": status_update.status.value})
        .eq("id", str(job_id))
        .execute()
    )

    return update_res.data[0]


@router.post("/jobs/process")
def process_jobs(user=Depends(get_current_user)):
    process_pending_jobs()
    return {"message": "Job processor executed"}
