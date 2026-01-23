from fastapi import APIRouter, Depends
from app.core.supabase import supabase
from app.core.auth import get_current_user

router = APIRouter()

@router.get("/me")
def me(user = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email
    }

@router.get("/teams")
def list_teams(user = Depends(get_current_user)):
    response = supabase.table("teams").select("*").execute()
    return response.data
