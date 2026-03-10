"""Tests for social booking tools — lookup_user, check_mutual_availability, send_booking_invite."""

from unittest.mock import MagicMock

import pytest

from app.agents.tools.social_tools import (
    _find_free_slots,
    _time_to_minutes,
)


class TestTimeToMinutes:
    def test_simple(self):
        assert _time_to_minutes("2026-03-06T14:30:00") == 870

    def test_with_timezone(self):
        assert _time_to_minutes("2026-03-06T09:00:00+00:00") == 540

    def test_midnight(self):
        assert _time_to_minutes("2026-03-06T00:00:00") == 0

    def test_end_of_day(self):
        assert _time_to_minutes("2026-03-06T23:59:00") == 1439


class TestFindFreeSlots:
    def test_no_busy_blocks(self):
        slots = _find_free_slots([], 540, 1020, 60)  # 9am-5pm, 1hr
        assert len(slots) > 0
        assert slots[0] == 540  # 9:00
        # 30-min increments: 9:00, 9:30, 10:00, ..., 16:00
        assert slots[-1] == 960  # 16:00 (last slot that fits 1hr before 17:00)

    def test_single_busy_block(self):
        # Busy 12:00-13:00 (720-780)
        slots = _find_free_slots([(720, 780)], 540, 1020, 60)
        assert 540 in slots  # 9:00 is free
        assert 720 not in slots  # 12:00 is busy
        assert 780 in slots  # 13:00 is free again

    def test_overlapping_busy_blocks(self):
        # Two overlapping blocks: 10:00-11:00 and 10:30-12:00
        slots = _find_free_slots([(600, 660), (630, 720)], 540, 1020, 60)
        assert 540 in slots  # 9:00 free
        assert 600 not in slots  # 10:00 busy
        assert 660 not in slots  # 11:00 still busy (merged)
        assert 720 in slots  # 12:00 free

    def test_fully_booked(self):
        # Busy entire day
        slots = _find_free_slots([(540, 1020)], 540, 1020, 60)
        assert slots == []

    def test_short_duration(self):
        # 30 min slot fits in 30 min gap
        slots = _find_free_slots([(570, 600)], 540, 630, 30)
        assert 540 in slots  # 9:00-9:30
        assert 600 in slots  # 10:00-10:30

    def test_long_duration_excludes_tight_gaps(self):
        # 2hr slot doesn't fit in 1hr gap
        slots = _find_free_slots([(600, 660), (720, 780)], 540, 1020, 120)
        # Gap between 540-600 = 60min (too short)
        # Gap between 660-720 = 60min (too short)
        # Gap after 780 = 780-1020 = 240min (fits)
        assert 540 not in slots
        assert 660 not in slots
        assert 780 in slots
