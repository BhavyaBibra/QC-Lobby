import time
from app.core.supabase import supabase
from app.api.v1.jobs import JobStatus


def process_pending_jobs():
    """Fetch pending jobs, process them, and update status to completed."""
    # Fetch all pending jobs
    response = supabase.table("qc_jobs").select("*").eq("status", JobStatus.pending.value).execute()
    
    if not response.data:
        return
    
    for job in response.data:
        job_id = job["id"]
        
        # Update status to processing
        supabase.table("qc_jobs").update({"status": JobStatus.processing.value}).eq("id", job_id).execute()
        
        # Simulate processing
        time.sleep(2)
        
        # Generate sample QC result
        qc_result = {
            "resolution": "1920x1080",
            "fps": 30,
            "audio": True
        }
        
        # Update status to completed with QC result
        supabase.table("qc_jobs").update({
            "status": JobStatus.completed.value,
            "qc_result": qc_result
        }).eq("id", job_id).execute()
