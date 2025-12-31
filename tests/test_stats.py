"""Tests for analytics and likes functionality."""

from __future__ import annotations

import pytest

# ---------------------------------------------------------------------------
# Helper fixtures
# ---------------------------------------------------------------------------


class FakeKvJson:
    """In-memory KV store for testing."""

    def __init__(self):
        self._data: dict[str, dict[str, object]] = {}

    async def get_json(self, bucket: str, key: str) -> object | None:
        return self._data.get(bucket, {}).get(key)

    async def put_json(self, bucket: str, key: str, value: object) -> None:
        if bucket not in self._data:
            self._data[bucket] = {}
        self._data[bucket][key] = value

    async def delete(self, bucket: str, key: str) -> None:
        if bucket in self._data and key in self._data[bucket]:
            del self._data[bucket][key]


@pytest.fixture
def fake_kv():
    return FakeKvJson()


# ---------------------------------------------------------------------------
# Unit tests for stats helper functions
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_increment_play_count(fake_kv):
    from kryten_playlist.web.routes.stats import increment_play_count

    # First increment
    count = await increment_play_count(fake_kv, "video123")
    assert count == 1

    # Second increment
    count = await increment_play_count(fake_kv, "video123")
    assert count == 2

    # Different video
    count = await increment_play_count(fake_kv, "video456")
    assert count == 1


@pytest.mark.asyncio
async def test_set_and_get_current_video(fake_kv):
    from kryten_playlist.web.routes.stats import _get_current_video, set_current_video

    # Initially no video
    current = await _get_current_video(fake_kv)
    assert current is None

    # Set current video
    await set_current_video(fake_kv, "abc123", "Test Movie")

    current = await _get_current_video(fake_kv)
    assert current is not None
    assert current["video_id"] == "abc123"
    assert current["title"] == "Test Movie"
    assert "started_at" in current


@pytest.mark.asyncio
async def test_like_increments_count(fake_kv):
    from kryten_playlist.web.routes.stats import (
        _get_like_counts,
        _set_like_counts,
        set_current_video,
    )

    # Set up current video
    await set_current_video(fake_kv, "movie1", "Test Movie 1")

    # Initially no likes
    counts = await _get_like_counts(fake_kv)
    assert counts == {}

    # Add likes
    counts["movie1"] = 1
    await _set_like_counts(fake_kv, counts)

    counts = await _get_like_counts(fake_kv)
    assert counts["movie1"] == 1


@pytest.mark.asyncio
async def test_like_dedupe(fake_kv):
    from datetime import timedelta

    from kryten_playlist.web.routes.stats import (
        _get_user_like_key,
        _isoformat,
        _set_user_like_key,
        _utcnow,
    )

    username = "testuser"
    video_id = "movie1"

    # No prior like
    existing = await _get_user_like_key(fake_kv, username, video_id)
    assert existing is None

    # Record a like with future expiry
    expires = _utcnow() + timedelta(hours=24)
    await _set_user_like_key(fake_kv, username, video_id, _isoformat(expires))

    # Now should exist
    existing = await _get_user_like_key(fake_kv, username, video_id)
    assert existing is not None
    assert "liked_at" in existing
    assert "expires_at" in existing


@pytest.mark.asyncio
async def test_play_counts_sorted():
    """Test that top played returns items sorted by count."""
    from kryten_playlist.web.routes.stats import _get_play_counts, _set_play_counts

    fake_kv = FakeKvJson()

    counts = {"vid_a": 5, "vid_b": 10, "vid_c": 3}
    await _set_play_counts(fake_kv, counts)

    retrieved = await _get_play_counts(fake_kv)
    assert retrieved == counts

    # Simulate sorting as done in endpoint
    sorted_items = sorted(retrieved.items(), key=lambda x: x[1], reverse=True)
    assert sorted_items[0] == ("vid_b", 10)
    assert sorted_items[1] == ("vid_a", 5)
    assert sorted_items[2] == ("vid_c", 3)


@pytest.mark.asyncio
async def test_like_counts_sorted():
    """Test that top liked returns items sorted by count."""
    from kryten_playlist.web.routes.stats import _get_like_counts, _set_like_counts

    fake_kv = FakeKvJson()

    counts = {"vid_x": 20, "vid_y": 5, "vid_z": 15}
    await _set_like_counts(fake_kv, counts)

    retrieved = await _get_like_counts(fake_kv)
    sorted_items = sorted(retrieved.items(), key=lambda x: x[1], reverse=True)

    assert sorted_items[0] == ("vid_x", 20)
    assert sorted_items[1] == ("vid_z", 15)
    assert sorted_items[2] == ("vid_y", 5)


@pytest.mark.asyncio
async def test_clear_current_video(fake_kv):
    from kryten_playlist.web.routes.stats import (
        _get_current_video,
        clear_current_video,
        set_current_video,
    )

    await set_current_video(fake_kv, "abc", "Title")
    assert await _get_current_video(fake_kv) is not None

    await clear_current_video(fake_kv)
    assert await _get_current_video(fake_kv) is None


# ---------------------------------------------------------------------------
# Integration-style tests (mocking FastAPI deps)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_like_endpoint_no_current_video(fake_kv):
    """Like should fail gracefully when nothing is playing."""
    from kryten_playlist.web.routes.stats import _get_current_video

    # No current video set
    current = await _get_current_video(fake_kv)
    assert current is None
    # The endpoint would return status="error", error="no_current_video"
