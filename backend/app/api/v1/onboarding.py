from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Literal, Optional
from app.core.supabase import supabase
from app.core.auth import get_current_user

router = APIRouter()

# Trial credits for new users (one-time only)
TRIAL_CREDITS = 360

class OnboardingRequest(BaseModel):
    plan_type: Literal["freelancer", "agency"]

class OnboardingResponse(BaseModel):
    user_id: str
    team_id: str
    plan_type: str
    credits: int
    is_new_user: bool

@router.post("/onboard", response_model=OnboardingResponse)
def onboard_user(request: OnboardingRequest, user=Depends(get_current_user)):
    """
    Onboard a new user after Supabase auth signup.
    - Creates user profile if doesn't exist
    - Creates team with 360 trial credits (one-time free trial)
    - Returns user info
    """
    user_id = str(user.id)
    user_email = user.email
    
    # Check if user already exists
    existing_user = (
        supabase
        .table("users")
        .select("*, teams(*)")
        .eq("id", user_id)
        .execute()
    )
    
    if existing_user.data and len(existing_user.data) > 0:
        # User exists, return their info
        user_data = existing_user.data[0]
        team_data = user_data.get("teams", {})
        return OnboardingResponse(
            user_id=user_id,
            team_id=user_data.get("team_id", ""),
            plan_type=user_data.get("plan_type", request.plan_type),
            credits=team_data.get("credits", 0) if team_data else 0,
            is_new_user=False
        )
    
    # Create new team with trial credits
    team_name = f"{user_email.split('@')[0]}'s Team" if user_email else "My Team"
    
    try:
        team_response = (
            supabase
            .table("teams")
            .insert({
                "name": team_name,
                "credits": TRIAL_CREDITS
            })
            .execute()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create team: {str(e)}"
        )
    
    if not team_response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create team"
        )
    
    team_id = team_response.data[0]["id"]
    
    # Create user profile - try with plan_type first, fallback without
    try:
        user_response = (
            supabase
            .table("users")
            .insert({
                "id": user_id,
                "email": user_email,
                "team_id": team_id,
                "plan_type": request.plan_type
            })
            .execute()
        )
    except Exception as e:
        # If plan_type column doesn't exist, try without it
        if "plan_type" in str(e):
            try:
                user_response = (
                    supabase
                    .table("users")
                    .insert({
                        "id": user_id,
                        "email": user_email,
                        "team_id": team_id
                    })
                    .execute()
                )
            except Exception as e2:
                # Rollback team creation
                supabase.table("teams").delete().eq("id", team_id).execute()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create user profile: {str(e2)}"
                )
        else:
            # Rollback team creation
            supabase.table("teams").delete().eq("id", team_id).execute()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user profile: {str(e)}"
            )
    
    if not user_response.data:
        # Rollback team creation
        supabase.table("teams").delete().eq("id", team_id).execute()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user profile"
        )
    
    return OnboardingResponse(
        user_id=user_id,
        team_id=team_id,
        plan_type=request.plan_type,
        credits=TRIAL_CREDITS,
        is_new_user=True
    )


@router.get("/profile")
def get_profile(user=Depends(get_current_user)):
    """Get current user's profile with team info."""
    user_id = str(user.id)
    
    profile = (
        supabase
        .table("users")
        .select("*, teams(*)")
        .eq("id", user_id)
        .execute()
    )
    
    if not profile.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Please complete onboarding."
        )
    
    user_data = profile.data[0]
    team_data = user_data.get("teams", {})
    
    return {
        "user_id": user_id,
        "email": user_data.get("email"),
        "team_id": user_data.get("team_id"),
        "team_name": team_data.get("name") if team_data else None,
        "plan_type": user_data.get("plan_type", "freelancer"),
        "credits": team_data.get("credits", 0) if team_data else 0
    }
