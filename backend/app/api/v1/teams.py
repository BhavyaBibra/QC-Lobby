from fastapi import APIRouter
from app.core.supabase import supabase

router = APIRouter()

@router.get("/teams")
def list_teams():
    response = supabase.table("teams").select("*").execute()
    return response.data
