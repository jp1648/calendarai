"""Tests for the semantic router — query classification."""

import pytest

from app.agents.core.router import pick_scheduler


class TestPickScheduler:
    """Test that the semantic router correctly classifies queries."""

    # -- Simple queries → fast scheduler (Haiku) --

    @pytest.mark.parametrize(
        "query",
        [
            "lunch tomorrow at noon",
            "birthday party Saturday at 3pm",
            "meeting with Bob Friday 3pm",
            "dinner tonight at 7",
            "gym Monday 6am",
            "coffee at 2pm tomorrow",
            "haircut next Tuesday at 11",
            "team standup at 10am",
            "doctor appointment Thursday 2pm",
        ],
    )
    def test_simple_routes_to_fast(self, query):
        result = pick_scheduler(query)
        assert result == "smart_scheduler_fast", f"Expected fast for: {query}"

    # -- Complex queries → full scheduler (Sonnet) --

    @pytest.mark.parametrize(
        "query",
        [
            "find me a free slot next week for a 2 hour meeting",
            "reschedule my Tuesday meeting to Wednesday",
            "what does my Friday look like",
            "when am I free this week",
            "cancel all my meetings on Thursday",
            "am I double booked anywhere this week",
            "what's my schedule for next week",
        ],
    )
    def test_complex_routes_to_full(self, query):
        result = pick_scheduler(query)
        assert result == "smart_scheduler", f"Expected full for: {query}"

    # -- Edge cases --

    def test_empty_string_defaults_to_fast(self):
        result = pick_scheduler("")
        assert result == "smart_scheduler_fast"

    def test_gibberish_defaults_to_fast(self):
        result = pick_scheduler("asdfghjkl qwerty")
        assert result == "smart_scheduler_fast"

    def test_ambiguous_leans_toward_simple(self):
        """Simple event mention without scheduling complexity."""
        result = pick_scheduler("add a meeting at 3pm")
        assert result == "smart_scheduler_fast"

    # -- Web search queries → complex scheduler --

    @pytest.mark.parametrize(
        "query",
        [
            "find the address of the new Italian restaurant and book dinner",
            "look up when the concert is and add it to my calendar",
            "search for the nearest dentist and schedule an appointment",
            "what time does the Apple store close and schedule a visit",
        ],
    )
    def test_web_search_routes_to_full(self, query):
        result = pick_scheduler(query)
        assert result == "smart_scheduler", f"Expected full for: {query}"
