"""Social booking tools — look up users, check mutual availability, send invites."""

import logging

from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry

logger = logging.getLogger("calendarai.tools.social")

# Permission levels that allow free/busy visibility
_FREE_BUSY_LEVELS = {"free_busy", "view", "book", "book_confirm"}
# Permission levels that allow direct booking (no invite needed)
_DIRECT_BOOK_LEVELS = {"book"}


@tool_registry.register("lookup_user", category="social")
async def lookup_user(
    ctx: RunContext[AgentDeps],
    email: str,
) -> dict:
    """Look up a CalendarAI user by email and check what calendar permissions you have.

    Args:
        email: The email address of the person to look up
    """
    sb = ctx.deps.supabase
    result = sb.table("profiles").select("id, email").eq("email", email).maybe_single().execute()
    if not result.data:
        return {"found": False, "message": f"No CalendarAI user found with email {email}"}

    target_id = result.data["id"]

    # Check what permission the current user has on this person's calendar
    perm = (
        sb.table("calendar_permissions")
        .select("level")
        .eq("owner_id", target_id)
        .eq("grantee_id", ctx.deps.user_id)
        .maybe_single()
        .execute()
    )

    level = perm.data["level"] if perm.data else None

    return {
        "found": True,
        "user_id": target_id,
        "email": result.data["email"],
        "permission_level": level,
        "can_see_availability": level in _FREE_BUSY_LEVELS if level else False,
        "can_book_directly": level in _DIRECT_BOOK_LEVELS if level else False,
    }


@tool_registry.register("check_mutual_availability", category="social")
async def check_mutual_availability(
    ctx: RunContext[AgentDeps],
    user_ids: list[str],
    date: str,
    duration_hours: float = 1.0,
    start_hour: int = 9,
    end_hour: int = 17,
) -> dict:
    """Find time slots when all specified users (including yourself) are free.

    Only works for users who have granted you at least free_busy permission.

    Args:
        user_ids: List of user IDs to check (from lookup_user results)
        date: Date in YYYY-MM-DD format
        duration_hours: Required duration in hours (default 1.0)
        start_hour: Earliest hour to consider (24h, default 9)
        end_hour: Latest hour to consider (24h, default 17)
    """
    sb = ctx.deps.supabase
    all_ids = list({ctx.deps.user_id, *user_ids})

    # Verify permissions for all other users
    unauthorized = []
    for uid in user_ids:
        if uid == ctx.deps.user_id:
            continue
        perm = (
            sb.table("calendar_permissions")
            .select("level")
            .eq("owner_id", uid)
            .eq("grantee_id", ctx.deps.user_id)
            .maybe_single()
            .execute()
        )
        if not perm.data or perm.data["level"] not in _FREE_BUSY_LEVELS:
            # Look up email for the error message
            profile = sb.table("profiles").select("email").eq("id", uid).maybe_single().execute()
            email = profile.data["email"] if profile.data else uid
            unauthorized.append(email)

    if unauthorized:
        return {
            "free_slots": [],
            "error": f"No permission to view availability for: {', '.join(unauthorized)}. "
                     "They need to grant you calendar access first.",
        }

    # Fetch all events for all users on this date
    range_start = f"{date}T{start_hour:02d}:00:00"
    range_end = f"{date}T{end_hour:02d}:00:00"

    busy_blocks: list[tuple[int, int]] = []  # (start_minute, end_minute) from midnight
    for uid in all_ids:
        events = (
            sb.table("events")
            .select("start_time, end_time")
            .eq("user_id", uid)
            .lt("start_time", range_end)
            .gt("end_time", range_start)
            .execute()
        )
        for ev in events.data:
            # Parse hours/minutes from ISO timestamps
            st = ev["start_time"]
            et = ev["end_time"]
            s_min = _time_to_minutes(st)
            e_min = _time_to_minutes(et)
            busy_blocks.append((s_min, e_min))

    # Find free slots
    duration_min = int(duration_hours * 60)
    free_slots = _find_free_slots(
        busy_blocks, start_hour * 60, end_hour * 60, duration_min
    )

    return {
        "date": date,
        "users_checked": len(all_ids),
        "free_slots": [
            {"start": f"{m // 60:02d}:{m % 60:02d}", "end": f"{(m + duration_min) // 60:02d}:{(m + duration_min) % 60:02d}"}
            for m in free_slots
        ],
        "duration_hours": duration_hours,
    }


@tool_registry.register("send_booking_invite", category="social")
async def send_booking_invite(
    ctx: RunContext[AgentDeps],
    to_user_id: str,
    event_title: str,
    start_time: str,
    end_time: str,
    location: str = "",
    description: str = "",
) -> dict:
    """Send a booking invite to another user. They will be notified and can accept or decline.

    If you have 'book' permission, the event is created directly on their calendar instead.

    Args:
        to_user_id: The recipient's user ID (from lookup_user)
        event_title: Title for the event
        start_time: ISO 8601 datetime string
        end_time: ISO 8601 datetime string
        location: Optional location
        description: Optional description
    """
    sb = ctx.deps.supabase

    # Check permission level
    perm = (
        sb.table("calendar_permissions")
        .select("level")
        .eq("owner_id", to_user_id)
        .eq("grantee_id", ctx.deps.user_id)
        .maybe_single()
        .execute()
    )
    if not perm.data:
        return {"error": "No permission to book on this user's calendar. They need to grant you access first."}

    level = perm.data["level"]

    if level in _DIRECT_BOOK_LEVELS:
        # Direct booking — create event on their calendar
        event = sb.table("events").insert({
            "user_id": to_user_id,
            "title": event_title,
            "start_time": start_time,
            "end_time": end_time,
            "location": location,
            "description": description + f"\n\nBooked by {ctx.deps.user_email}",
            "source": "schedule_agent",
        }).execute()
        logger.info("direct_book to=%s title=%s", to_user_id, event_title[:50])
        return {
            "method": "direct_book",
            "event_id": event.data[0]["id"],
            "message": f"Event created directly on their calendar.",
        }

    if level in ("free_busy", "view", "book_confirm"):
        # Send invite — they need to accept
        invite = sb.table("booking_invites").insert({
            "from_user_id": ctx.deps.user_id,
            "to_user_id": to_user_id,
            "event_title": event_title,
            "start_time": start_time,
            "end_time": end_time,
            "location": location,
            "description": description,
        }).execute()
        logger.info("booking_invite to=%s title=%s", to_user_id, event_title[:50])
        return {
            "method": "invite",
            "invite_id": invite.data[0]["id"],
            "message": "Booking invite sent. They'll be notified and can accept or decline.",
        }

    return {"error": f"Permission level '{level}' does not allow booking."}


def _time_to_minutes(iso_str: str) -> int:
    """Extract minutes-from-midnight from an ISO timestamp string."""
    # Handle both "2026-03-06T14:30:00" and "2026-03-06T14:30:00+00:00"
    time_part = iso_str.split("T")[1] if "T" in iso_str else iso_str
    parts = time_part.split(":")
    return int(parts[0]) * 60 + int(parts[1])


def _find_free_slots(
    busy: list[tuple[int, int]], day_start: int, day_end: int, duration: int
) -> list[int]:
    """Find all start minutes where a slot of `duration` fits without overlapping busy blocks."""
    if not busy:
        return list(range(day_start, day_end - duration + 1, 30))

    # Merge overlapping busy blocks
    busy.sort()
    merged = [busy[0]]
    for s, e in busy[1:]:
        if s <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], e))
        else:
            merged.append((s, e))

    slots = []
    cursor = day_start
    for bs, be in merged:
        # Free gap before this busy block
        while cursor + duration <= bs:
            slots.append(cursor)
            cursor += 30
        cursor = max(cursor, be)

    # Free gap after last busy block
    while cursor + duration <= day_end:
        slots.append(cursor)
        cursor += 30

    return slots
