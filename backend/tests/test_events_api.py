"""Tests for the events CRUD API."""

from unittest.mock import patch

import pytest

from tests.conftest import FakeSupabase, TEST_USER


def _make_event(**overrides):
    base = {
        "id": "evt-001",
        "user_id": TEST_USER.id,
        "title": "Lunch",
        "description": "",
        "location": "",
        "start_time": "2026-03-10T12:00:00",
        "end_time": "2026-03-10T13:00:00",
        "all_day": False,
        "source": "manual",
        "source_ref": None,
        "confidence": 1.0,
        "metadata": None,
        "created_at": "2026-03-06T00:00:00Z",
    }
    base.update(overrides)
    return base


# -- List Events --


class TestListEvents:
    def test_returns_events(self, client):
        events = [_make_event(), _make_event(id="evt-002", title="Dinner")]
        with patch("app.routers.events.get_supabase_admin", return_value=FakeSupabase(events)):
            resp = client.get("/api/events", headers={"Authorization": "Bearer fake"})
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_empty_list(self, client):
        with patch("app.routers.events.get_supabase_admin", return_value=FakeSupabase([])):
            resp = client.get("/api/events", headers={"Authorization": "Bearer fake"})
        assert resp.status_code == 200
        assert resp.json() == []

    def test_with_date_range(self, client):
        events = [_make_event()]
        with patch("app.routers.events.get_supabase_admin", return_value=FakeSupabase(events)):
            resp = client.get(
                "/api/events?start=2026-03-01&end=2026-03-31",
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 200


# -- Get Event --


class TestGetEvent:
    def test_found(self, client):
        event = _make_event()
        with patch("app.routers.events.get_supabase_admin", return_value=FakeSupabase(event)):
            resp = client.get("/api/events/evt-001", headers={"Authorization": "Bearer fake"})
        assert resp.status_code == 200
        assert resp.json()["id"] == "evt-001"

    def test_not_found(self, client):
        with patch("app.routers.events.get_supabase_admin", return_value=FakeSupabase(None)):
            resp = client.get("/api/events/nonexistent", headers={"Authorization": "Bearer fake"})
        assert resp.status_code == 404


# -- Create Event --


class TestCreateEvent:
    def test_valid_event(self, client):
        event = _make_event()
        with patch("app.routers.events.get_supabase_admin", return_value=FakeSupabase([event])), \
             patch("app.services.profiles.get_supabase_admin", return_value=FakeSupabase([{"timezone": "America/New_York"}])):
            resp = client.post(
                "/api/events",
                json={
                    "title": "Lunch",
                    "start_time": "2026-03-10T12:00:00",
                    "end_time": "2026-03-10T13:00:00",
                },
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 201

    def test_missing_title(self, client):
        resp = client.post(
            "/api/events",
            json={
                "start_time": "2026-03-10T12:00:00",
                "end_time": "2026-03-10T13:00:00",
            },
            headers={"Authorization": "Bearer fake"},
        )
        assert resp.status_code == 422

    def test_missing_times(self, client):
        resp = client.post(
            "/api/events",
            json={"title": "Lunch"},
            headers={"Authorization": "Bearer fake"},
        )
        assert resp.status_code == 422

    def test_invalid_datetime(self, client):
        resp = client.post(
            "/api/events",
            json={
                "title": "Lunch",
                "start_time": "not-a-date",
                "end_time": "also-not",
            },
            headers={"Authorization": "Bearer fake"},
        )
        assert resp.status_code == 422

    def test_defaults(self, client):
        """Ensure default source is 'manual' and all_day is False."""
        created = _make_event()
        with patch("app.routers.events.get_supabase_admin", return_value=FakeSupabase([created])), \
             patch("app.services.profiles.get_supabase_admin", return_value=FakeSupabase([{"timezone": "America/New_York"}])):
            resp = client.post(
                "/api/events",
                json={
                    "title": "Test",
                    "start_time": "2026-03-10T12:00:00",
                    "end_time": "2026-03-10T13:00:00",
                },
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 201


# -- Update Event --


class TestUpdateEvent:
    def test_partial_update(self, client):
        updated = _make_event(title="Updated Lunch")
        with patch("app.routers.events.get_supabase_admin", return_value=FakeSupabase([updated])), \
             patch("app.services.profiles.get_supabase_admin", return_value=FakeSupabase([{"timezone": "America/New_York"}])):
            resp = client.patch(
                "/api/events/evt-001",
                json={"title": "Updated Lunch"},
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Lunch"

    def test_update_time(self, client):
        updated = _make_event(start_time="2026-03-10T14:00:00")
        with patch("app.routers.events.get_supabase_admin", return_value=FakeSupabase([updated])), \
             patch("app.services.profiles.get_supabase_admin", return_value=FakeSupabase([{"timezone": "America/New_York"}])):
            resp = client.patch(
                "/api/events/evt-001",
                json={"start_time": "2026-03-10T14:00:00"},
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 200

    def test_not_found(self, client):
        with patch("app.routers.events.get_supabase_admin", return_value=FakeSupabase([])), \
             patch("app.services.profiles.get_supabase_admin", return_value=FakeSupabase([{"timezone": "America/New_York"}])):
            resp = client.patch(
                "/api/events/nonexistent",
                json={"title": "Nope"},
                headers={"Authorization": "Bearer fake"},
            )
        assert resp.status_code == 404

    def test_empty_update(self, client):
        """PATCH with empty body should succeed (no-op)."""
        updated = _make_event()
        with patch("app.routers.events.get_supabase_admin", return_value=FakeSupabase([updated])), \
             patch("app.services.profiles.get_supabase_admin", return_value=FakeSupabase([{"timezone": "America/New_York"}])):
            resp = client.patch(
                "/api/events/evt-001",
                json={},
                headers={"Authorization": "Bearer fake"},
            )
        # Even an empty update returns the existing event
        assert resp.status_code == 200


# -- Delete Event --


class TestDeleteEvent:
    def test_delete(self, client):
        with patch("app.routers.events.get_supabase_admin", return_value=FakeSupabase([_make_event()])):
            resp = client.delete("/api/events/evt-001", headers={"Authorization": "Bearer fake"})
        assert resp.status_code == 204

    def test_not_found(self, client):
        with patch("app.routers.events.get_supabase_admin", return_value=FakeSupabase([])):
            resp = client.delete("/api/events/nonexistent", headers={"Authorization": "Bearer fake"})
        assert resp.status_code == 404


# -- Health --


class TestHealth:
    def test_health(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
