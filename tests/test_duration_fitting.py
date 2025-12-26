"""Tests for duration fitting utilities."""

from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
import aiosqlite

from kryten_playlist.catalog.duration_fitting import (
    FitResult,
    fit_to_duration,
    fit_to_end_time,
    calculate_end_time,
    format_duration,
)
from kryten_playlist.catalog.enhanced_schema import init_enhanced_schema


@pytest_asyncio.fixture
async def db():
    """Create in-memory database with test data."""
    conn = await aiosqlite.connect(":memory:")
    conn.row_factory = aiosqlite.Row

    # Create schema using the proper init function
    await init_enhanced_schema(conn)

    # Insert test items
    items = [
        ("vid1", "Short Video", 300),     # 5 min
        ("vid2", "Medium Video", 1800),   # 30 min
        ("vid3", "Long Video", 3600),     # 60 min
        ("vid4", "Movie", 7200),          # 120 min
        ("vid5", "No Duration", None),    # No duration
        ("vid6", "TV Episode", 2400),     # 40 min, TV
    ]

    for vid, title, duration in items:
        await conn.execute(
            """
            INSERT INTO catalog_item (video_id, raw_title, sanitized_title, title_base, duration_seconds, is_tv)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (vid, title, title, title, duration, vid == "vid6"),
        )
    await conn.commit()

    yield conn
    await conn.close()


@pytest.mark.asyncio
async def test_fit_to_duration_basic(db):
    """Test basic duration fitting."""
    result = await fit_to_duration(db, 3600, order_by="duration_asc")

    assert isinstance(result, FitResult)
    assert result.target_duration == 3600
    assert result.total_duration <= 3600
    assert len(result.items) > 0


@pytest.mark.asyncio
async def test_fit_to_duration_small_target(db):
    """Test with small target that only fits short video."""
    result = await fit_to_duration(db, 400, order_by="duration_asc")

    # Should fit only the 5 min video
    assert len(result.items) == 1
    assert result.items[0]["duration_seconds"] == 300
    assert result.slack == 100


@pytest.mark.asyncio
async def test_fit_to_duration_excludes_null(db):
    """Items with null duration are excluded."""
    result = await fit_to_duration(db, 50000, order_by="title")

    video_ids = [it["video_id"] for it in result.items]
    assert "vid5" not in video_ids  # No duration


@pytest.mark.asyncio
async def test_fit_to_duration_filter_tv(db):
    """Test TV filter."""
    # Only TV
    result = await fit_to_duration(db, 50000, filter_tv=True, order_by="title")
    assert all(it["video_id"] == "vid6" for it in result.items)

    # Only movies (non-TV)
    result = await fit_to_duration(db, 50000, filter_tv=False, order_by="title")
    video_ids = [it["video_id"] for it in result.items]
    assert "vid6" not in video_ids


@pytest.mark.asyncio
async def test_fit_to_duration_max_items(db):
    """Test max_items limit."""
    result = await fit_to_duration(db, 50000, max_items=2, order_by="duration_asc")

    assert len(result.items) <= 2


@pytest.mark.asyncio
async def test_fit_utilization(db):
    """Test utilization calculation."""
    result = await fit_to_duration(db, 600, order_by="duration_asc")

    # 5 min video = 300s, target = 600s = 50%
    assert result.items[0]["duration_seconds"] == 300
    assert result.utilization == 50.0


@pytest.mark.asyncio
async def test_fit_to_end_time_basic(db):
    """Test fitting to an end time."""
    now = datetime.now(timezone.utc)
    end = now + timedelta(hours=1)

    result = await fit_to_end_time(db, end, start_time=now, order_by="duration_asc")

    assert result.target_duration == 3600
    assert result.total_duration <= 3600


@pytest.mark.asyncio
async def test_fit_to_end_time_past(db):
    """Test with end time in the past returns empty."""
    now = datetime.now(timezone.utc)
    past = now - timedelta(hours=1)

    result = await fit_to_end_time(db, past, start_time=now)

    assert result.items == []
    assert result.total_duration == 0


def test_calculate_end_time():
    """Test end time calculation."""
    start = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    items = [
        {"duration_seconds": 1800},  # 30 min
        {"duration_seconds": 1800},  # 30 min
    ]

    end = calculate_end_time(items, start)

    assert end == datetime(2024, 1, 1, 13, 0, 0, tzinfo=timezone.utc)


def test_calculate_end_time_handles_none():
    """Handle items without duration."""
    start = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    items = [
        {"duration_seconds": 1800},
        {"duration_seconds": None},
        {},
    ]

    end = calculate_end_time(items, start)

    assert end == datetime(2024, 1, 1, 12, 30, 0, tzinfo=timezone.utc)


@pytest.mark.parametrize(
    "seconds, expected",
    [
        (0, "0s"),
        (45, "45s"),
        (60, "1m 0s"),
        (90, "1m 30s"),
        (3600, "1h 0m 0s"),
        (3723, "1h 2m 3s"),
        (7200, "2h 0m 0s"),
    ],
)
def test_format_duration(seconds, expected):
    """Test duration formatting."""
    assert format_duration(seconds) == expected


@pytest.mark.asyncio
async def test_fit_result_dataclass():
    """Test FitResult properties."""
    result = FitResult(
        items=[{"title": "Test"}],
        total_duration=1800,
        target_duration=3600,
        slack=1800,
    )

    assert result.utilization == 50.0
    assert result.slack == 1800


@pytest.mark.asyncio
async def test_fit_result_zero_target():
    """Test utilization with zero target."""
    result = FitResult(
        items=[],
        total_duration=0,
        target_duration=0,
        slack=0,
    )

    assert result.utilization == 0.0
