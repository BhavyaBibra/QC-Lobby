from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.core.supabase import supabase
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


@router.get("/jobs")
def list_jobs(user=Depends(get_current_user)):
    """List all jobs for the current user's team only."""
    # Get user's team_id for authorization
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
    
    # Only return jobs belonging to this team
    response = (
        supabase
        .table("qc_jobs")
        .select("*")
        .eq("team_id", team_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data


@router.get("/jobs/{job_id}")
def get_job(job_id: UUID, user=Depends(get_current_user)):
    # Get user's team_id for authorization
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
    
    # Fetch the job
    job_res = (
        supabase
        .table("qc_jobs")
        .select("*")
        .eq("id", job_id)
        .eq("team_id", team_id)
        .execute()
    )
    
    if not job_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    return job_res.data[0]


@router.post("/jobs")
def create_job(job: JobCreate, user=Depends(get_current_user)):
    # #region agent log
    import json, time; open('/Users/gargichandna/Desktop/QC Lobby/.cursor/debug.log','a').write(json.dumps({"hypothesisId":"E,F","location":"jobs.py:create_job:entry","message":"Job creation request received","data":{"qc_mode":job.qc_mode,"video_url":job.video_url[:50],"duration_sec":job.duration_sec},"timestamp":int(time.time()*1000),"sessionId":"debug-session"})+'\n')
    # #endregion
    # Get user's team_id
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

    # Fetch team credits
    team_res = (
        supabase
        .table("teams")
        .select("credits")
        .eq("id", team_id)
        .execute()
    )

    if not team_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    team_credits = team_res.data[0]["credits"] or 0

    # Count active jobs (pending or processing)
    pending_res = (
        supabase
        .table("qc_jobs")
        .select("id", count="exact")
        .eq("team_id", team_id)
        .eq("status", JobStatus.pending.value)
        .execute()
    )
    
    processing_res = (
        supabase
        .table("qc_jobs")
        .select("id", count="exact")
        .eq("team_id", team_id)
        .eq("status", JobStatus.processing.value)
        .execute()
    )
    
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
    
    # #region agent log
    import json, time; open('/Users/gargichandna/Desktop/QC Lobby/.cursor/debug.log','a').write(json.dumps({"hypothesisId":"F","location":"jobs.py:create_job:before_insert","message":"Job data to insert","data":{"job_data":job_data},"timestamp":int(time.time()*1000),"sessionId":"debug-session"})+'\n')
    # #endregion
    job_response = supabase.table("qc_jobs").insert(job_data).execute()

    if not job_response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create job"
        )

    # #region agent log
    import json, time; open('/Users/gargichandna/Desktop/QC Lobby/.cursor/debug.log','a').write(json.dumps({"hypothesisId":"F","location":"jobs.py:create_job:after_insert","message":"Job created in DB","data":{"job_id":job_response.data[0].get("id"),"qc_mode_stored":job_response.data[0].get("qc_mode"),"status":job_response.data[0].get("status")},"timestamp":int(time.time()*1000),"sessionId":"debug-session"})+'\n')
    # #endregion

    # Deduct credits from team
    new_credits = team_credits - credits_used
    supabase.table("teams").update({"credits": new_credits}).eq("id", team_id).execute()

    # Job is now pending - the background worker (auto_job_processor) will pick it up
    # and dispatch it to n8n for processing
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

    # Fetch the job to check existence and team ownership
    job_res = (
        supabase
        .table("qc_jobs")
        .select("*")
        .eq("id", job_id)
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

    # Update the job status
    update_res = (
        supabase
        .table("qc_jobs")
        .update({"status": new_status.value})
        .eq("id", job_id)
        .execute()
    )
    if not update_res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update the job status"
        )
    return update_res.data[0]
