"""
Automatic Job Processor

Monitors pending jobs and dispatches them to n8n for processing.
Falls back to mock processing if n8n is disabled or fails.
"""

import asyncio
from app.core.supabase import supabase
from app.core.config import settings
from app.services.n8n import n8n_service


async def dispatch_job_to_n8n(job: dict) -> bool:
    """
    Dispatch a job to n8n for processing.
    
    Returns:
        True if successfully dispatched, False otherwise
    """
    try:
        response = await n8n_service.trigger_qc_job(
            job_id=job["id"],
            video_url=job["video_url"],
            qc_mode=job["qc_mode"],
            duration_sec=job["duration_sec"],
            team_id=job["team_id"],
            thumbnail_url=job.get("thumbnail_url")
        )
        print(f"[n8n] Job {job['id']} dispatched to n8n: {response}")
        return True
    except Exception as e:
        # #region agent log
        import json, time; open('/Users/gargichandna/Desktop/QC Lobby/.cursor/debug.log','a').write(json.dumps({"hypothesisId":"B_detail","location":"auto_job_processor.py:dispatch_error","message":"n8n dispatch exception","data":{"job_id":job["id"],"error":str(e),"error_type":type(e).__name__},"timestamp":int(time.time()*1000),"sessionId":"debug-session"})+'\n')
        # #endregion
        print(f"[n8n] Failed to dispatch job {job['id']} to n8n: {e}")
        return False


async def process_job_mock(job_id: str):
    """
    Mock QC processing fallback.
    Used when n8n is disabled or fails.
    """
    # Simulate processing time
    await asyncio.sleep(3)
    
    # Generate mock QC result
    qc_result = {
        "resolution": "1920x1080",
        "fps": 30,
        "audio": True,
        "source": "mock_processor"
    }
    
    # Update to completed
    supabase.table("qc_jobs").update({
        "status": "completed",
        "qc_result": qc_result
    }).eq("id", job_id).execute()
    
    print(f"[mock] Job {job_id} completed with mock result")


async def auto_process_jobs():
    """
    Background worker that:
    1. Monitors pending jobs
    2. Dispatches them to n8n (or mock processor)
    3. Updates status to processing
    """
    print(f"[worker] Starting job processor (n8n enabled: {settings.USE_N8N_PROCESSING})")
    
    while True:
        job_id = None
        try:
            # Count jobs with status = "processing"
            processing_res = (
                supabase
                .table("qc_jobs")
                .select("id", count="exact")
                .eq("status", "processing")
                .execute()
            )
            
            processing_count = processing_res.count or 0
            
            # If >= 2 jobs are processing, wait and continue
            if processing_count >= 2:
                await asyncio.sleep(3)
                continue
            
            # Fetch ONE job with status = "pending"
            pending_res = (
                supabase
                .table("qc_jobs")
                .select("*")
                .eq("status", "pending")
                .order("created_at", desc=False)  # FIFO order
                .limit(1)
                .execute()
            )
            
            if not pending_res.data:
                # No pending jobs, wait and continue
                await asyncio.sleep(3)
                continue
            
            job = pending_res.data[0]
            job_id = job["id"]
            # #region agent log
            import json, time; open('/Users/gargichandna/Desktop/QC Lobby/.cursor/debug.log','a').write(json.dumps({"hypothesisId":"A,B","location":"auto_job_processor.py:found_pending","message":"Found pending job to process","data":{"job_id":job_id,"qc_mode":job.get("qc_mode"),"status":job.get("status")},"timestamp":int(time.time()*1000),"sessionId":"debug-session"})+'\n')
            # #endregion
            
            # Atomically update to "processing"
            update_res = (
                supabase
                .table("qc_jobs")
                .update({"status": "processing"})
                .eq("id", job_id)
                .eq("status", "pending")  # Ensure it's still pending (atomic check)
                .execute()
            )
            
            # If update didn't affect any rows, another worker got it first
            if not update_res.data:
                await asyncio.sleep(1)
                continue
            
            print(f"[worker] Processing job {job_id} (mode: {job['qc_mode']})")
            
            # Dispatch to n8n or use mock processing
            if settings.USE_N8N_PROCESSING:
                # #region agent log
                import json, time; open('/Users/gargichandna/Desktop/QC Lobby/.cursor/debug.log','a').write(json.dumps({"hypothesisId":"B","location":"auto_job_processor.py:before_n8n_dispatch","message":"About to dispatch to n8n","data":{"job_id":job_id,"n8n_enabled":True},"timestamp":int(time.time()*1000),"sessionId":"debug-session"})+'\n')
                # #endregion
                success = await dispatch_job_to_n8n(job)
                # #region agent log
                import json, time; open('/Users/gargichandna/Desktop/QC Lobby/.cursor/debug.log','a').write(json.dumps({"hypothesisId":"B","location":"auto_job_processor.py:after_n8n_dispatch","message":"n8n dispatch result","data":{"job_id":job_id,"success":success},"timestamp":int(time.time()*1000),"sessionId":"debug-session"})+'\n')
                # #endregion
                
                if not success:
                    # n8n dispatch failed - mark job as failed, do NOT fallback to mock
                    print(f"[worker] n8n dispatch failed for job {job_id} - marking as failed")
                    supabase.table("qc_jobs").update({
                        "status": "failed",
                        "qc_result": {"error": "Failed to dispatch to n8n workflow"}
                    }).eq("id", job_id).execute()
                else:
                    # If n8n succeeds, leave job in "processing" state
                    # n8n will call back via /callbacks/n8n/complete when done
                    print(f"[worker] Job {job_id} dispatched to n8n - waiting for callback")
            else:
                # Use mock processing only when n8n is disabled
                await process_job_mock(job_id)
            
        except Exception as e:
            print(f"[worker] Error processing job: {e}")
            
            # If any exception occurs, mark the job as "failed"
            if job_id:
                try:
                    supabase.table("qc_jobs").update({
                        "status": "failed",
                        "qc_result": {"error": str(e)}
                    }).eq("id", job_id).execute()
                except Exception:
                    pass  # Ignore errors when marking as failed
            
            # Wait before retrying
            await asyncio.sleep(3)
        
        # Small delay between iterations
        await asyncio.sleep(1)
