from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.core.supabase import supabase, with_retry
from app.core.auth import get_current_user
from enum import Enum
from typing import Literal, Optional


class JobStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


router = APIRouter()


class JobCreate(BaseModel):
    video_url: str
    duration_sec: int = Field(gt=0, description="Video duration in seconds")
    qc_mode: Literal["polisher", "guardian"] = Field(description="QC processing mode")
    thumbnail_url: Optional[str] = Field(default=None, description="Base64 thumbnail of the video")


class JobStatusUpdate(BaseModel):
    status: JobStatus


@with_retry()
def _query_user_team(user_id: str):
    """Get user's team_id with retry on transient failures."""
    return supabase.table("users").select("team_id").eq("id", user_id).execute()


@with_retry()
def _query_team_credits(team_id: str):
    """Get team credits with retry on transient failures."""
    return supabase.table("teams").select("credits").eq("id", team_id).execute()


@with_retry()
def _query_jobs_by_team(team_id: str):
    """List all jobs for a team with retry on transient failures."""
    return supabase.table("qc_jobs").select("*").eq("team_id", team_id).order("created_at", desc=True).execute()


@with_retry()
def _query_job_by_id(job_id: UUID, team_id: str = None):
    """Get a specific job with retry on transient failures."""
    query = supabase.table("qc_jobs").select("*").eq("id", job_id)
    if team_id:
        query = query.eq("team_id", team_id)
    return query.limit(1).execute()


@with_retry()
def _count_jobs_by_status(team_id: str, status_val: str):
    """Count jobs by status with retry on transient failures."""
    return supabase.table("qc_jobs").select("id", count="exact").eq("team_id", team_id).eq("status", status_val).execute()


@with_retry()
def _insert_job(job_data: dict):
    """Insert a new job with retry on transient failures."""
    return supabase.table("qc_jobs").insert(job_data).execute()


@with_retry()
def _update_team_credits(team_id: str, new_credits: int):
    """Update team credits with retry on transient failures."""
    return supabase.table("teams").update({"credits": new_credits}).eq("id", team_id).execute()


@with_retry()
def _update_job_status(job_id: UUID, new_status: str):
    """Update job status with retry on transient failures."""
    return supabase.table("qc_jobs").update({"status": new_status}).eq("id", job_id).execute()


@router.get("/jobs")
def list_jobs(user=Depends(get_current_user)):
    """List all jobs for the current user's team only."""
    user_profile = _query_user_team(user.id)
    
    if not user_profile.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    team_id = user_profile.data[0]["team_id"]
    response = _query_jobs_by_team(team_id)
    return response.data


@router.get("/jobs/{job_id}")
def get_job(job_id: UUID, user=Depends(get_current_user)):
    user_profile = _query_user_team(user.id)
    
    if not user_profile.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    team_id = user_profile.data[0]["team_id"]
    job_res = _query_job_by_id(job_id, team_id)
    
    if not job_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    return job_res.data[0]


@router.post("/jobs")
def create_job(job: JobCreate, user=Depends(get_current_user)):
    # Get user's team_id
    user_profile = _query_user_team(user.id)

    if not user_profile.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    team_id = user_profile.data[0]["team_id"]

    # Fetch team credits
    team_res = _query_team_credits(team_id)

    if not team_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    team_credits = team_res.data[0]["credits"] or 0

    # Count active jobs (pending or processing)
    pending_res = _count_jobs_by_status(team_id, JobStatus.pending.value)
    processing_res = _count_jobs_by_status(team_id, JobStatus.processing.value)
    
    active_jobs_count = (pending_res.count or 0) + (processing_res.count or 0)

    # Check concurrency limit
    if active_jobs_count >= 2:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Maximum 2 active jobs allowed. Please wait for current jobs to complete."
        )

    # Calculate credits needed
    credits_per_second = 1 if job.qc_mode == "polisher" else 2
    credits_used = job.duration_sec * credits_per_second

    # Check if team has enough credits
    if team_credits < credits_used:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient credits. Required: {credits_used}, Available: {team_credits}"
        )

    # Insert the job
    job_data = {
        "team_id": team_id,
        "video_url": job.video_url,
        "status": JobStatus.pending.value,
        "qc_mode": job.qc_mode,
        "duration_sec": job.duration_sec,
        "credits_used": credits_used
    }
    
    # Add thumbnail if provided
    if job.thumbnail_url:
        job_data["thumbnail_url"] = job.thumbnail_url

    job_response = _insert_job(job_data)

    if not job_response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create job"
        )

    # Deduct credits from team
    new_credits = team_credits - credits_used
    _update_team_credits(team_id, new_credits)

    # Job is now pending - the background worker will pick it up
    return job_response.data[0]


@router.patch("/jobs/{job_id}/status")
def update_job_status(
    job_id: UUID,
    status_update: JobStatusUpdate,
    user=Depends(get_current_user)
):
    # Only allow certain status updates
    allowed_statuses = {JobStatus.processing, JobStatus.completed, JobStatus.failed}
    new_status = status_update.status
    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status update. Allowed: {[s.value for s in allowed_statuses]}"
        )

    # Fetch the user's team
    user_profile = _query_user_team(user.id)
    if not user_profile.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    team_id = user_profile.data[0]["team_id"]

    # Fetch the job to check existence and team ownership
    job_res = _query_job_by_id(job_id)
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

    # Update the job status
    update_res = _update_job_status(job_id, new_status.value)
    if not update_res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update the job status"
        )
    return update_res.data[0]
