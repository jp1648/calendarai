"""Shared fixtures for backend tests."""

from dataclasses import dataclass
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.auth.middleware import AuthUser, get_current_user
from app.main import app as fastapi_app


# Fake user for all authenticated tests
TEST_USER = AuthUser(id="user-123", email="test@example.com")


@dataclass
class FakeQueryBuilder:
    """Chainable mock that simulates Supabase query builder."""

    _data: list[dict] | None = None

    def select(self, *a, **kw):
        return self

    def insert(self, row):
        self._data = [{"id": "evt-001", **row}]
        return self

    def update(self, data):
        if self._data:
            for item in self._data:
                item.update(data)
        return self

    def delete(self):
        return self

    def eq(self, col, val):
        return self

    def gte(self, col, val):
        return self

    def lte(self, col, val):
        return self

    def order(self, col, **kw):
        return self

    def limit(self, n):
        return self

    def single(self):
        return self

    def execute(self):
        result = MagicMock()
        result.data = self._data if self._data is not None else []
        return result


class FakeSupabase:
    """Minimal Supabase mock that returns chainable query builders."""

    def __init__(self, data: list[dict] | None = None):
        self._data = data

    def table(self, name: str):
        return FakeQueryBuilder(_data=self._data)


@pytest.fixture
def fake_user():
    return TEST_USER


@pytest.fixture
def client():
    """Create a test client with auth dependency overridden."""
    fastapi_app.dependency_overrides[get_current_user] = lambda: TEST_USER
    yield TestClient(fastapi_app)
    fastapi_app.dependency_overrides.clear()
