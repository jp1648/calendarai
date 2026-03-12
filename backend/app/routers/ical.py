from uuid import UUID

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.services.ical import generate_ical_feed
from app.services.supabase import get_supabase_admin

router = APIRouter(prefix="/api/ical", tags=["ical"])


@router.get("/feed/{token}")
async def ical_feed(token: str):
    """Public iCal feed endpoint. Secured by unguessable UUID token."""
    try:
        UUID(token)
    except ValueError:
        raise HTTPException(status_code=404, detail="Feed not found")

    sb = get_supabase_admin()
    result = (
        sb.table("profiles")
        .select("id")
        .eq("ical_feed_token", token)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Feed not found")
    profile_id = result.data[0]["id"]

    ical_content = generate_ical_feed(profile_id)
    return Response(
        content=ical_content,
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=calendarai.ics"},
    )
