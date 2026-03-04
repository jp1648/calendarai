from datetime import datetime

from dateutil.parser import parse as parse_dt
from icalendar import Calendar, Event

from app.services.supabase import get_supabase_admin


def generate_ical_feed(user_id: str) -> str:
    sb = get_supabase_admin()
    events = (
        sb.table("events")
        .select("*")
        .eq("user_id", user_id)
        .order("start_time")
        .execute()
    )

    cal = Calendar()
    cal.add("prodid", "-//CalendarAI//EN")
    cal.add("version", "2.0")
    cal.add("calscale", "GREGORIAN")
    cal.add("x-wr-calname", "CalendarAI")

    for row in events.data:
        event = Event()
        event.add("uid", f"{row['id']}@calendarai")
        event.add("summary", row["title"])
        event.add("dtstart", parse_dt(row["start_time"]))
        event.add("dtend", parse_dt(row["end_time"]))

        if row.get("description"):
            event.add("description", row["description"])
        if row.get("location"):
            event.add("location", row["location"])

        event.add("created", parse_dt(row["created_at"]))
        cal.add_component(event)

    return cal.to_ical().decode("utf-8")
