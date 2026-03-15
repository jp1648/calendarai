"""Google Calendar API service layer.

Uses the same OAuth credentials as Gmail (with the calendar scope added).
"""

from datetime import datetime

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


def _service(creds: Credentials):
    return build("calendar", "v3", credentials=creds)


def list_calendars(creds: Credentials) -> list[dict]:
    """Return all calendars visible to the authenticated user."""
    service = _service(creds)
    result = service.calendarList().list().execute()
    return result.get("items", [])


def list_events(
    creds: Credentials,
    calendar_id: str = "primary",
    time_min: str | None = None,
    time_max: str | None = None,
    max_results: int = 250,
) -> list[dict]:
    """List events from a Google Calendar.

    Args:
        time_min: RFC3339 lower bound (inclusive), e.g. '2026-03-01T00:00:00Z'
        time_max: RFC3339 upper bound (exclusive)
    """
    service = _service(creds)
    kwargs: dict = {
        "calendarId": calendar_id,
        "maxResults": max_results,
        "singleEvents": True,
        "orderBy": "startTime",
    }
    if time_min:
        kwargs["timeMin"] = time_min
    if time_max:
        kwargs["timeMax"] = time_max

    result = service.events().list(**kwargs).execute()
    return result.get("items", [])


def create_event(creds: Credentials, calendar_id: str, event_body: dict) -> dict:
    """Insert a new event into a Google Calendar."""
    service = _service(creds)
    return service.events().insert(calendarId=calendar_id, body=event_body).execute()


def update_event(
    creds: Credentials, calendar_id: str, event_id: str, event_body: dict
) -> dict:
    """Update an existing Google Calendar event."""
    service = _service(creds)
    return (
        service.events()
        .update(calendarId=calendar_id, eventId=event_id, body=event_body)
        .execute()
    )


def delete_event(creds: Credentials, calendar_id: str, event_id: str) -> None:
    """Delete a Google Calendar event."""
    service = _service(creds)
    service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
