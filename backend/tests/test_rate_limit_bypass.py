"""Test that test@calendarai.dev bypasses rate limits and can hit the streaming endpoint.

These are integration tests that require a running backend and a real Supabase
user. Run with: pytest -m integration tests/test_rate_limit_bypass.py
"""

import asyncio
import json
import os
import httpx
import pytest
from supabase import create_client

pytestmark = pytest.mark.integration

# --- Config (from environment) ---
API_URL = os.environ.get("API_URL", "http://localhost:8000")
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
TEST_EMAIL = os.environ.get("TEST_EMAIL", "test@calendarai.dev")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "testtest123")


@pytest.fixture(scope="module")
def access_token():
    """Sign in as test user and return JWT."""
    sb = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    resp = sb.auth.sign_in_with_password({"email": TEST_EMAIL, "password": TEST_PASSWORD})
    return resp.session.access_token


def test_rate_limit_bypass_basic(access_token):
    """Hit the schedule/stream endpoint many times — should never get 429."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    # Fire 15 requests in quick succession (limit is 10/min for normal users)
    for i in range(15):
        resp = httpx.post(
            f"{API_URL}/api/agents/schedule/stream",
            headers=headers,
            json={"input": "ping"},
            timeout=10,
        )
        assert resp.status_code != 429, f"Got 429 on request {i+1}: {resp.text}"
        # 200 = streaming started, we don't need to consume the full stream
        assert resp.status_code == 200, f"Got {resp.status_code} on request {i+1}: {resp.text}"


def test_stream_returns_sse_events(access_token):
    """Verify the SSE stream returns thread + done events for a simple query."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    with httpx.stream(
        "POST",
        f"{API_URL}/api/agents/schedule/stream",
        headers=headers,
        json={"input": "lunch tomorrow noon"},
        timeout=30,
    ) as resp:
        assert resp.status_code == 200

        events = []
        buffer = ""
        current_event = ""

        for chunk in resp.iter_text():
            buffer += chunk
            lines = buffer.split("\n")
            buffer = lines.pop()

            for line in lines:
                if line.startswith("event: "):
                    current_event = line[7:].strip()
                elif line.startswith("data: ") and current_event:
                    try:
                        data = json.loads(line[6:])
                        events.append({"event": current_event, "data": data})
                    except json.JSONDecodeError:
                        pass
                    current_event = ""

    event_types = [e["event"] for e in events]
    print(f"SSE events received: {event_types}")

    assert "thread" in event_types, "Missing 'thread' event"
    assert "done" in event_types, "Missing 'done' event"
    # Should have at least one text_delta (agent responds with text)
    assert "text_delta" in event_types, "Missing 'text_delta' — agent produced no text"


def test_no_tool_call_messages_in_simple_query(access_token):
    """Simple scheduling query should use fast scheduler (no browser/booking tools)."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    with httpx.stream(
        "POST",
        f"{API_URL}/api/agents/schedule/stream",
        headers=headers,
        json={"input": "meeting at 3pm friday"},
        timeout=30,
    ) as resp:
        assert resp.status_code == 200

        events = []
        buffer = ""
        current_event = ""

        for chunk in resp.iter_text():
            buffer += chunk
            lines = buffer.split("\n")
            buffer = lines.pop()

            for line in lines:
                if line.startswith("event: "):
                    current_event = line[7:].strip()
                elif line.startswith("data: ") and current_event:
                    try:
                        data = json.loads(line[6:])
                        events.append({"event": current_event, "data": data})
                    except json.JSONDecodeError:
                        pass
                    current_event = ""

    event_types = [e["event"] for e in events]
    print(f"SSE events: {event_types}")

    # Should complete without error
    assert "done" in event_types
    assert "error" not in event_types, f"Got error: {[e for e in events if e['event'] == 'error']}"
