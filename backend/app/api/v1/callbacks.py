"""
n8n Callback Endpoints

These endpoints are called by n8n workflows to report:
- Progress updates
- Completion with QC results
- Failures

Supports both:
1. Structured format (recommended): { comments: [...], summary: {...} }
2. Legacy format (Frame.io style): [{ timestamp, text }, ...]
"""

import re
from fastapi import APIRouter, HTTPException, status, Header
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Union
from app.core.supabase import supabase
from app.services.n8n import n8n_service


router = APIRouter()


# ============================================
# Pydantic Models
# ============================================

class ProgressUpdate(BaseModel):
    job_id: str
    progress: int  # 0-100
    message: Optional[str] = None


class CompletionPayload(BaseModel):
    job_id: str
    qc_result: Union[Dict[str, Any], List[Dict[str, Any]]]  # Supports both formats
    artifacts: Optional[Dict[str, str]] = None  # URLs to PDF, XML, EDL files


class LegacyCompletionPayload(BaseModel):
    """Legacy format from Frame.io/n8n workflow"""
    job_id: str
    results: List[Dict[str, str]]  # [{ timestamp, text }, ...]
    artifacts: Optional[Dict[str, str]] = None


class FailurePayload(BaseModel):
    job_id: str
    error: str
    error_code: Optional[str] = None


# ============================================
# Format Transformation Utilities
# ============================================

def parse_timestamp(ts: Union[str, int, float]) -> dict:
    """
    Parse timestamp string to display format and seconds.
    Handles formats: "00:00:03:00" (HH:MM:SS:FF), "00:00:03" (HH:MM:SS),
    float seconds (12.5), or int seconds (12).
    """
    # Handle non-string inputs (e.g. raw seconds from AI output)
    if isinstance(ts, (int, float)):
        seconds = int(ts)
        # Convert seconds to HH:MM:SS
        h = seconds // 3600
        m = (seconds % 3600) // 60
        s = seconds % 60
        return {
            "display": f"{h:02d}:{m:02d}:{s:02d}",
            "seconds": seconds
        }

    # Handle string inputs
    ts = str(ts).strip()
    
    # Try parsing as float string "12.5"
    try:
        seconds = int(float(ts))
        h = seconds // 3600
        m = (seconds % 3600) // 60
        s = seconds % 60
        return {
            "display": f"{h:02d}:{m:02d}:{s:02d}",
            "seconds": seconds
        }
    except ValueError:
        pass
    
    parts = ts.split(':')
    try:
        hours = int(parts[0]) if len(parts) > 0 else 0
        mins = int(parts[1]) if len(parts) > 1 else 0
        secs = int(parts[2]) if len(parts) > 2 else 0
        # Ignore frame number if present (4th part)
        
        display = f"{hours:02d}:{mins:02d}:{secs:02d}"
        total_seconds = hours * 3600 + mins * 60 + secs
        
        return {
            "display": display,
            "seconds": total_seconds
        }
    except (ValueError, IndexError):
        # Fallback for completely unparsable strings
        return {
            "display": ts,
            "seconds": 0
        }


def parse_legacy_comment(item: dict) -> dict:
    """
    Transform legacy format item to structured comment.
    
    Legacy formats:
    1. Caption correction: "Current Text: X\nCorrection: Y\nReason: Z"
    2. Issue type: "Issue Type: COPYRIGHT\nCurrent Observation: ...\nRecommendation: ...\nSeverity: MEDIUM"
    """
    timestamp_str = item.get("timestamp", "00:00:00")
    text = item.get("text", "")
    
    ts = parse_timestamp(timestamp_str)
    
    # Check if it's an Issue Type entry
    if "Issue Type:" in text:
        # Parse issue type format
        issue_type_match = re.search(r"Issue Type:\s*(\w+)", text)
        observation_match = re.search(r"Current Observation:\s*(.+?)(?=\n|$)", text)
        recommendation_match = re.search(r"Recommendation:\s*(.+?)(?=\n|$)", text)
        severity_match = re.search(r"Severity:\s*(\w+)", text)
        
        issue_type = issue_type_match.group(1) if issue_type_match else "Other"
        observation = observation_match.group(1).strip() if observation_match else text
        recommendation = recommendation_match.group(1).strip() if recommendation_match else ""
        severity_raw = severity_match.group(1) if severity_match else "MEDIUM"
        
        # Map issue types to categories
        category_map = {
            "COPYRIGHT": "Copyright",
            "META_SAFE_SPACE": "SafeZone",
            "RENDER_ISSUE": "Technical",
            "AUDIO": "Audio",
            "VISUAL": "Visual",
        }
        category = category_map.get(issue_type, issue_type.title())
        
        # Map severity
        severity_map = {"HIGH": "error", "MEDIUM": "warning", "LOW": "info"}
        severity = severity_map.get(severity_raw.upper(), "warning")
        
        return {
            "timestamp": ts["display"],
            "timestamp_sec": ts["seconds"],
            "category": category,
            "description": observation,
            "suggestion": recommendation,
            "severity": severity
        }
    
    # Grammar/caption correction format
    current_match = re.search(r"Current Text:\s*(.+?)(?=\n|$)", text)
    correction_match = re.search(r"Correction:\s*(.+?)(?=\n|$)", text)
    reason_match = re.search(r"Reason:\s*(.+?)(?=\n|$)", text)
    
    current_text = current_match.group(1).strip() if current_match else ""
    correction = correction_match.group(1).strip() if correction_match else ""
    reason = reason_match.group(1).strip() if reason_match else text
    
    if current_text and correction:
        description = f'"{current_text}" → "{correction}"'
    else:
        description = text
    
    return {
        "timestamp": ts["display"],
        "timestamp_sec": ts["seconds"],
        "category": "Grammar",
        "description": description,
        "suggestion": reason,
        "severity": "warning"
    }


def transform_legacy_results(results: List[dict]) -> dict:
    """
    Transform legacy results array to structured qc_result format.
    """
    comments = [parse_legacy_comment(item) for item in results]
    
    # Build category summary
    by_category = {}
    for comment in comments:
        cat = comment["category"]
        by_category[cat] = by_category.get(cat, 0) + 1
    
    return {
        "comments": comments,
        "summary": {
            "total_issues": len(comments),
            "by_category": by_category
        }
    }


def normalize_qc_result(qc_result: Union[Dict, List]) -> dict:
    """
    Normalize qc_result to structured format regardless of input format.
    
    Handles:
    1. List of legacy items: [{ timestamp, text }, ...]
    2. Dict with 'results': { results: [{ timestamp, text }, ...] }
    3. Dict with 'issues': { issues: [{ timestamp, text }, ...], qc_mode, video_url }
    4. Dict with legacy item: { timestamp, text }
    5. Already structured: { comments: [...], summary: {...} }
    """
    # If it's already a list, treat as legacy format
    if isinstance(qc_result, list):
        return transform_legacy_results(qc_result)
    
    # If it's a dict but has 'results' key with a list, it's legacy wrapper
    if isinstance(qc_result, dict) and "results" in qc_result and isinstance(qc_result["results"], list):
        return transform_legacy_results(qc_result["results"])
    
    # Handle n8n format: { issues: [...], qc_mode, video_url, analyzed_at }
    if isinstance(qc_result, dict) and "issues" in qc_result and isinstance(qc_result["issues"], list):
        issues = qc_result["issues"]
        transformed = transform_legacy_results(issues)
        # Preserve additional metadata from n8n
        if "qc_mode" in qc_result:
            transformed["qc_mode"] = qc_result["qc_mode"]
        if "video_url" in qc_result:
            transformed["video_url"] = qc_result["video_url"]
        if "analyzed_at" in qc_result:
            transformed["analyzed_at"] = qc_result["analyzed_at"]
        return transformed
    
    # If it's a dict with legacy items (timestamp + text), transform it
    if isinstance(qc_result, dict) and "timestamp" in qc_result and "text" in qc_result:
        return transform_legacy_results([qc_result])
    
    # Already in structured format, ensure it has required fields
    if isinstance(qc_result, dict):
        if "comments" not in qc_result:
            qc_result["comments"] = []
        if "summary" not in qc_result:
            comments = qc_result.get("comments", [])
            by_category = {}
            for c in comments:
                cat = c.get("category", "Other")
                by_category[cat] = by_category.get(cat, 0) + 1
            qc_result["summary"] = {
                "total_issues": len(comments),
                "by_category": by_category
            }
    
    return qc_result


def validate_n8n_auth(x_api_key: Optional[str] = Header(None)):
    """Validate the API key from n8n."""
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header"
        )
    
    if not n8n_service.validate_api_key(x_api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )


@router.post("/callbacks/n8n/progress")
def update_job_progress(
    payload: ProgressUpdate,
    x_api_key: Optional[str] = Header(None)
):
    """
    Called by n8n to report job progress.
    Updates the job's progress field (if you have one) or just confirms receipt.
    """
    validate_n8n_auth(x_api_key)
    
    # Verify job exists
    job_res = (
        supabase
        .table("qc_jobs")
        .select("id, status")
        .eq("id", payload.job_id)
        .execute()
    )
    
    if not job_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Update job progress (optional: add a progress column to qc_jobs)
    # For now, we just acknowledge and ensure status is "processing"
    update_data = {"status": "processing"}
    
    supabase.table("qc_jobs").update(update_data).eq("id", payload.job_id).execute()
    
    return {
        "status": "ok",
        "job_id": payload.job_id,
        "progress": payload.progress
    }


@router.post("/callbacks/n8n/complete")
def complete_job(
    payload: CompletionPayload,
    x_api_key: Optional[str] = Header(None)
):
    """
    Called by n8n when QC processing is complete.
    Stores the QC result and marks job as completed.
    
    Accepts both structured and legacy formats:
    - Structured: { comments: [...], summary: {...} }
    - Legacy: [{ timestamp, text }, ...]
    """
    validate_n8n_auth(x_api_key)
    
    # Debug: log incoming payload to understand n8n format
    print(f"[callback] Received complete callback for job: {payload.job_id}")
    print(f"[callback] qc_result type: {type(payload.qc_result)}")
    if isinstance(payload.qc_result, list):
        print(f"[callback] qc_result is list with {len(payload.qc_result)} items")
        if payload.qc_result:
            print(f"[callback] First item keys: {payload.qc_result[0].keys() if isinstance(payload.qc_result[0], dict) else 'not a dict'}")
    elif isinstance(payload.qc_result, dict):
        print(f"[callback] qc_result keys: {payload.qc_result.keys()}")
    
    # Verify job exists and is in a valid state
    job_res = (
        supabase
        .table("qc_jobs")
        .select("id, status")
        .eq("id", payload.job_id)
        .execute()
    )
    
    if not job_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    job = job_res.data[0]
    
    # Prevent updating already completed/failed jobs (idempotency)
    if job["status"] in ["completed", "failed"]:
        return {
            "status": "already_completed",
            "job_id": payload.job_id,
            "message": f"Job already has status: {job['status']}"
        }
    
    # Normalize qc_result to structured format
    normalized_result = normalize_qc_result(payload.qc_result)
    
    # Update job with QC result
    update_data = {
        "status": "completed",
        "qc_result": normalized_result
    }
    
    # Store artifact URLs if provided
    if payload.artifacts:
        update_data["artifacts"] = payload.artifacts
    
    supabase.table("qc_jobs").update(update_data).eq("id", payload.job_id).execute()
    
    return {
        "status": "ok",
        "job_id": payload.job_id,
        "message": "Job completed successfully",
        "comments_count": len(normalized_result.get("comments", []))
    }


@router.post("/callbacks/n8n/complete-legacy")
def complete_job_legacy(
    payload: LegacyCompletionPayload,
    x_api_key: Optional[str] = Header(None)
):
    """
    Legacy endpoint for Frame.io style results.
    Accepts: { job_id, results: [{ timestamp, text }, ...], artifacts? }
    """
    validate_n8n_auth(x_api_key)
    
    # Verify job exists
    job_res = (
        supabase
        .table("qc_jobs")
        .select("id, status")
        .eq("id", payload.job_id)
        .execute()
    )
    
    if not job_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    job = job_res.data[0]
    
    if job["status"] in ["completed", "failed"]:
        return {
            "status": "already_completed",
            "job_id": payload.job_id,
            "message": f"Job already has status: {job['status']}"
        }
    
    # Transform legacy results to structured format
    normalized_result = transform_legacy_results(payload.results)
    
    update_data = {
        "status": "completed",
        "qc_result": normalized_result
    }
    
    if payload.artifacts:
        update_data["artifacts"] = payload.artifacts
    
    supabase.table("qc_jobs").update(update_data).eq("id", payload.job_id).execute()
    
    return {
        "status": "ok",
        "job_id": payload.job_id,
        "message": "Job completed successfully",
        "comments_count": len(normalized_result.get("comments", []))
    }


@router.post("/callbacks/n8n/failed")
def fail_job(
    payload: FailurePayload,
    x_api_key: Optional[str] = Header(None)
):
    """
    Called by n8n when QC processing fails.
    Marks job as failed and stores error info.
    """
    validate_n8n_auth(x_api_key)
    
    # Verify job exists
    job_res = (
        supabase
        .table("qc_jobs")
        .select("id, status")
        .eq("id", payload.job_id)
        .execute()
    )
    
    if not job_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    job = job_res.data[0]
    
    # Prevent updating already completed jobs
    if job["status"] == "completed":
        return {
            "status": "already_completed",
            "job_id": payload.job_id,
            "message": "Job already completed, cannot mark as failed"
        }
    
    # Update job as failed
    update_data = {
        "status": "failed",
        "qc_result": {
            "error": payload.error,
            "error_code": payload.error_code
        }
    }
    
    supabase.table("qc_jobs").update(update_data).eq("id", payload.job_id).execute()
    
    return {
        "status": "ok",
        "job_id": payload.job_id,
        "message": "Job marked as failed"
    }


@router.get("/callbacks/n8n/health")
def n8n_health_check():
    """Health check endpoint for n8n to verify connectivity."""
    return {"status": "ok", "service": "qc-lobby-n8n-callbacks"}
