"""Calendar sharing & booking invites API."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.auth.middleware import AuthUser, get_current_user
from app.services.supabase import get_supabase_admin

router = APIRouter(prefix="/api/sharing", tags=["sharing"])


# -- Schemas --

class GrantPermission(BaseModel):
    grantee_email: EmailStr
    level: Literal["free_busy", "view", "book", "book_confirm"] = "free_busy"


class InviteResponse(BaseModel):
    status: Literal["accepted", "declined"]


# -- Permissions --

@router.get("/permissions")
async def list_permissions(user: AuthUser = Depends(get_current_user)):
    """List all permissions I've granted and received."""
    sb = get_supabase_admin()
    granted = (
        sb.table("calendar_permissions")
        .select("*, grantee:profiles!calendar_permissions_grantee_id_fkey(email)")
        .eq("owner_id", user.id)
        .execute()
    )
    received = (
        sb.table("calendar_permissions")
        .select("*, owner:profiles!calendar_permissions_owner_id_fkey(email)")
        .eq("grantee_id", user.id)
        .execute()
    )
    return {"granted": granted.data, "received": received.data}


@router.post("/permissions", status_code=status.HTTP_201_CREATED)
async def grant_permission(body: GrantPermission, user: AuthUser = Depends(get_current_user)):
    """Grant calendar access to another user by email."""
    sb = get_supabase_admin()

    # Look up grantee by email
    result = sb.table("profiles").select("id").eq("email", body.grantee_email).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    grantee_id = result.data["id"]
    if grantee_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot grant permission to yourself")

    row = {
        "owner_id": user.id,
        "grantee_id": grantee_id,
        "level": body.level,
    }
    result = sb.table("calendar_permissions").upsert(row).execute()
    return result.data[0]


@router.delete("/permissions/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_permission(permission_id: str, user: AuthUser = Depends(get_current_user)):
    """Revoke a permission you granted."""
    sb = get_supabase_admin()
    result = (
        sb.table("calendar_permissions")
        .delete()
        .eq("id", permission_id)
        .eq("owner_id", user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Permission not found")


# -- Booking Invites --

@router.get("/invites")
async def list_invites(user: AuthUser = Depends(get_current_user)):
    """List booking invites I've sent and received."""
    sb = get_supabase_admin()
    sent = (
        sb.table("booking_invites")
        .select("*, to_user:profiles!booking_invites_to_user_id_fkey(email)")
        .eq("from_user_id", user.id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    received = (
        sb.table("booking_invites")
        .select("*, from_user:profiles!booking_invites_from_user_id_fkey(email)")
        .eq("to_user_id", user.id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return {"sent": sent.data, "received": received.data}


@router.patch("/invites/{invite_id}")
async def respond_to_invite(
    invite_id: str, body: InviteResponse, user: AuthUser = Depends(get_current_user)
):
    """Accept or decline a booking invite. Accepting creates the event on your calendar."""
    sb = get_supabase_admin()

    # Fetch the invite
    invite = (
        sb.table("booking_invites")
        .select("*")
        .eq("id", invite_id)
        .eq("to_user_id", user.id)
        .eq("status", "pending")
        .maybe_single()
        .execute()
    )
    if not invite.data:
        raise HTTPException(status_code=404, detail="Invite not found or already responded")

    inv = invite.data

    event_id = None
    if body.status == "accepted":
        # Create the event on the recipient's calendar
        event = sb.table("events").insert({
            "user_id": user.id,
            "title": inv["event_title"],
            "start_time": inv["start_time"],
            "end_time": inv["end_time"],
            "location": inv["location"],
            "description": inv["description"],
            "source": "schedule_agent",
        }).execute()
        event_id = event.data[0]["id"]

    # Update invite status
    update = {"status": body.status, "responded_at": "now()"}
    if event_id:
        update["event_id"] = event_id
    sb.table("booking_invites").update(update).eq("id", invite_id).execute()

    return {"status": body.status, "event_id": event_id}
