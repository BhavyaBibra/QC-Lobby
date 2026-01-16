from fastapi import APIRouter
from app.core.supabase import supabase

router = APIRouter()

@router.get("/jobs")
def list_jobs():
    response = supabase.table("qc_jobs").select("*").execute()
    return response.data
