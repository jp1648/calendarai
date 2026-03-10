"""Tests for sharing API — permissions and booking invites."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.auth.middleware import get_current_user
from app.main import app as fastapi_app
from tests.conftest import TEST_USER


@pytest.fixture
def client():
    fastapi_app.dependency_overrides[get_current_user] = lambda: TEST_USER
    yield TestClient(fastapi_app)
    fastapi_app.dependency_overrides.clear()


def _mock_supabase(table_responses: dict | None = None):
    """Build a mock supabase that returns configured responses per table."""
    defaults = {
        "calendar_permissions": [],
        "profiles": [],
        "booking_invites": [],
        "events": [],
    }
    if table_responses:
        defaults.update(table_responses)

    sb = MagicMock()

    def make_chain(data):
        chain = MagicMock()
        chain.select.return_value = chain
        chain.insert.return_value = chain
        chain.upsert.return_value = chain
        chain.update.return_value = chain
        chain.delete.return_value = chain
        chain.eq.return_value = chain
        chain.gte.return_value = chain
        chain.order.return_value = chain
        chain.limit.return_value = chain
        chain.single.return_value = chain
        chain.maybe_single.return_value = chain
        result = MagicMock()
        result.data = data
        chain.execute.return_value = result
        return chain

    def table(name):
        data = defaults.get(name, [])
        return make_chain(data)

    sb.table = table
    return sb


class TestListPermissions:
    @patch("app.routers.sharing.get_supabase_admin")
    def test_returns_granted_and_received(self, mock_sb, client):
        mock_sb.return_value = _mock_supabase({
            "calendar_permissions": [{"id": "p1", "level": "free_busy"}],
        })
        resp = client.get("/api/sharing/permissions")
        assert resp.status_code == 200
        data = resp.json()
        assert "granted" in data
        assert "received" in data


class TestGrantPermission:
    @patch("app.routers.sharing.get_supabase_admin")
    def test_grant_valid(self, mock_sb, client):
        sb = MagicMock()

        # profiles lookup returns a user
        profile_chain = MagicMock()
        profile_chain.select.return_value = profile_chain
        profile_chain.eq.return_value = profile_chain
        profile_chain.maybe_single.return_value = profile_chain
        profile_result = MagicMock()
        profile_result.data = {"id": "user-456"}
        profile_chain.execute.return_value = profile_result

        # permissions upsert
        perm_chain = MagicMock()
        perm_chain.upsert.return_value = perm_chain
        perm_result = MagicMock()
        perm_result.data = [{"id": "p1", "owner_id": "user-123", "grantee_id": "user-456", "level": "free_busy"}]
        perm_chain.execute.return_value = perm_result

        def table(name):
            if name == "profiles":
                return profile_chain
            return perm_chain

        sb.table = table
        mock_sb.return_value = sb

        resp = client.post("/api/sharing/permissions", json={
            "grantee_email": "sarah@example.com",
            "level": "free_busy",
        })
        assert resp.status_code == 201
        assert resp.json()["level"] == "free_busy"

    @patch("app.routers.sharing.get_supabase_admin")
    def test_grant_user_not_found(self, mock_sb, client):
        sb = MagicMock()
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.maybe_single.return_value = chain
        result = MagicMock()
        result.data = None
        chain.execute.return_value = result
        sb.table = MagicMock(return_value=chain)
        mock_sb.return_value = sb

        resp = client.post("/api/sharing/permissions", json={
            "grantee_email": "nobody@example.com",
        })
        assert resp.status_code == 404

    @patch("app.routers.sharing.get_supabase_admin")
    def test_grant_self_rejected(self, mock_sb, client):
        sb = MagicMock()
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.maybe_single.return_value = chain
        result = MagicMock()
        result.data = {"id": TEST_USER.id}
        chain.execute.return_value = result
        sb.table = MagicMock(return_value=chain)
        mock_sb.return_value = sb

        resp = client.post("/api/sharing/permissions", json={
            "grantee_email": "test@example.com",
        })
        assert resp.status_code == 400
        assert "yourself" in resp.json()["detail"]

    def test_invalid_level(self, client):
        resp = client.post("/api/sharing/permissions", json={
            "grantee_email": "x@x.com",
            "level": "admin",
        })
        assert resp.status_code == 400


class TestRevokePermission:
    @patch("app.routers.sharing.get_supabase_admin")
    def test_revoke_success(self, mock_sb, client):
        mock_sb.return_value = _mock_supabase({
            "calendar_permissions": [{"id": "p1"}],
        })
        resp = client.delete("/api/sharing/permissions/p1")
        assert resp.status_code == 204

    @patch("app.routers.sharing.get_supabase_admin")
    def test_revoke_not_found(self, mock_sb, client):
        mock_sb.return_value = _mock_supabase()
        resp = client.delete("/api/sharing/permissions/p999")
        assert resp.status_code == 404


class TestListInvites:
    @patch("app.routers.sharing.get_supabase_admin")
    def test_returns_sent_and_received(self, mock_sb, client):
        mock_sb.return_value = _mock_supabase({
            "booking_invites": [{"id": "inv-1", "status": "pending"}],
        })
        resp = client.get("/api/sharing/invites")
        assert resp.status_code == 200
        data = resp.json()
        assert "sent" in data
        assert "received" in data


class TestRespondToInvite:
    @patch("app.routers.sharing.get_supabase_admin")
    def test_accept_creates_event(self, mock_sb, client):
        sb = MagicMock()

        invite_data = {
            "id": "inv-1",
            "from_user_id": "user-456",
            "to_user_id": TEST_USER.id,
            "event_title": "Lunch",
            "start_time": "2026-03-10T12:00:00",
            "end_time": "2026-03-10T13:00:00",
            "location": "Cafe",
            "description": "Team lunch",
            "status": "pending",
        }

        call_count = {"invites": 0}

        def table(name):
            chain = MagicMock()
            chain.select.return_value = chain
            chain.insert.return_value = chain
            chain.update.return_value = chain
            chain.eq.return_value = chain
            chain.maybe_single.return_value = chain

            if name == "booking_invites":
                result = MagicMock()
                if call_count["invites"] == 0:
                    result.data = invite_data
                    call_count["invites"] += 1
                else:
                    result.data = [{"id": "inv-1", "status": "accepted"}]
                chain.execute.return_value = result
            elif name == "events":
                result = MagicMock()
                result.data = [{"id": "evt-new", "title": "Lunch"}]
                chain.execute.return_value = result
            return chain

        sb.table = table
        mock_sb.return_value = sb

        resp = client.patch("/api/sharing/invites/inv-1", json={"status": "accepted"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "accepted"
        assert resp.json()["event_id"] == "evt-new"

    @patch("app.routers.sharing.get_supabase_admin")
    def test_decline_no_event(self, mock_sb, client):
        sb = MagicMock()
        invite_data = {
            "id": "inv-1",
            "from_user_id": "user-456",
            "to_user_id": TEST_USER.id,
            "event_title": "Lunch",
            "start_time": "2026-03-10T12:00:00",
            "end_time": "2026-03-10T13:00:00",
            "location": "",
            "description": "",
            "status": "pending",
        }

        def table(name):
            chain = MagicMock()
            chain.select.return_value = chain
            chain.update.return_value = chain
            chain.eq.return_value = chain
            chain.maybe_single.return_value = chain
            result = MagicMock()
            result.data = invite_data if name == "booking_invites" else []
            chain.execute.return_value = result
            return chain

        sb.table = table
        mock_sb.return_value = sb

        resp = client.patch("/api/sharing/invites/inv-1", json={"status": "declined"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "declined"
        assert resp.json()["event_id"] is None

    def test_invalid_status(self, client):
        resp = client.patch("/api/sharing/invites/inv-1", json={"status": "maybe"})
        assert resp.status_code == 400
