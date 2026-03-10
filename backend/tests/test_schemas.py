"""Tests for Pydantic schemas and validation."""

import pytest
from pydantic import ValidationError

from app.agents.core.schemas import (
    AgentRequest,
    AgentResponse,
    AgentConfig,
    RunStatus,
    TriggerMode,
)
from app.routers.events import EventCreate, EventUpdate


class TestEventCreate:
    def test_valid_minimal(self):
        e = EventCreate(
            title="Lunch",
            start_time="2026-03-10T12:00:00",
            end_time="2026-03-10T13:00:00",
        )
        assert e.title == "Lunch"
        assert e.source == "manual"
        assert e.all_day is False
        assert e.confidence == 1.0

    def test_full_fields(self):
        e = EventCreate(
            title="Meeting",
            description="Weekly sync",
            location="Room 4",
            start_time="2026-03-10T14:00:00",
            end_time="2026-03-10T15:00:00",
            all_day=False,
            source="schedule_agent",
            confidence=0.9,
            metadata={"agent_run": "abc"},
        )
        assert e.source == "schedule_agent"
        assert e.metadata == {"agent_run": "abc"}

    def test_missing_title_raises(self):
        with pytest.raises(ValidationError):
            EventCreate(
                start_time="2026-03-10T12:00:00",
                end_time="2026-03-10T13:00:00",
            )

    def test_missing_start_time_raises(self):
        with pytest.raises(ValidationError):
            EventCreate(title="Test", end_time="2026-03-10T13:00:00")

    def test_invalid_datetime_raises(self):
        with pytest.raises(ValidationError):
            EventCreate(
                title="Test",
                start_time="not-a-date",
                end_time="2026-03-10T13:00:00",
            )


class TestEventUpdate:
    def test_all_none(self):
        u = EventUpdate()
        assert u.title is None
        assert u.start_time is None

    def test_partial(self):
        u = EventUpdate(title="New Title")
        assert u.title == "New Title"
        assert u.location is None

    def test_exclude_none(self):
        u = EventUpdate(title="New")
        d = u.model_dump(exclude_none=True)
        assert d == {"title": "New"}


class TestAgentRequest:
    def test_defaults(self):
        r = AgentRequest(agent_name="smart_scheduler", input="lunch tomorrow")
        assert r.trigger_mode == TriggerMode.PULL
        assert r.metadata == {}

    def test_with_metadata(self):
        r = AgentRequest(
            agent_name="email_parser",
            input="parse this",
            trigger_mode=TriggerMode.PUSH,
            metadata={"email_id": "123"},
        )
        assert r.trigger_mode == TriggerMode.PUSH


class TestAgentResponse:
    def test_completed(self):
        r = AgentResponse(
            run_id="run-1",
            agent_name="smart_scheduler",
            status=RunStatus.COMPLETED,
            message="Created lunch event",
            events_created=[{"id": "evt-1", "title": "Lunch"}],
            tokens_used=150,
            model_used="openrouter:google/gemini-3.1-flash-lite-preview",
        )
        assert r.status == RunStatus.COMPLETED
        assert len(r.events_created) == 1

    def test_failed(self):
        r = AgentResponse(
            run_id="run-2",
            agent_name="smart_scheduler",
            status=RunStatus.FAILED,
            message="API error",
        )
        assert r.events_created == []
        assert r.tokens_used is None


class TestAgentConfig:
    def test_valid(self):
        c = AgentConfig(
            name="test_agent",
            model="openrouter:test/model",
            system_prompt="You are a test agent.",
            tools=["create_event"],
            trigger_mode=TriggerMode.PULL,
            description="Test",
        )
        assert c.name == "test_agent"
        assert c.tools == ["create_event"]
