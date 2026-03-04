from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.services.ical import generate_ical_feed
from app.services.supabase import get_supabase_admin

router = APIRouter(prefix="/api/ical", tags=["ical"])


@router.get("/feed/{token}")
async def ical_feed(token: str):
    """Public iCal feed endpoint. Secured by unguessable UUID token."""
    sb = get_supabase_admin()
    profile = (
        sb.table("profiles")
        .select("id")
        .eq("ical_feed_token", token)
        .single()
        .execute()
    )
    if not profile.data:
        raise HTTPException(status_code=404, detail="Feed not found")

    ical_content = generate_ical_feed(profile.data["id"])
    return Response(
        content=ical_content,
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=calendarai.ics"},
    )
