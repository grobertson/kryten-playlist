"""Tests for catalog ingestion CLI."""

from __future__ import annotations

import re
from io import StringIO
from pathlib import Path

import aiosqlite
import pytest

from kryten_playlist.catalog.enhanced_schema import init_enhanced_schema
from kryten_playlist.catalog.ingest import (
    ingest_catalog,
    search_catalog,
    show_stats,
)


@pytest.fixture
def temp_db(tmp_path: Path) -> Path:
    """Return path to a temporary database file."""
    return tmp_path / "test_catalog.db"


@pytest.fixture
def mediacms_items() -> list[dict]:
    """Sample MediaCMS API response items."""
    return [
        {
            "friendly_token": "abc123",
            "title": "The.Matrix.1999.1080p.BluRay.x264.mkv",
            "duration": 136 * 60,  # 2h16m
            "thumbnail_url": "https://example.com/thumb1.jpg",
            "categories": [{"id": 1, "title": "Action"}],
        },
        {
            "friendly_token": "def456",
            "title": "Breaking.Bad.S01E01.Pilot.720p.HDTV.mp4",
            "duration": 58 * 60,  # 58m
            "thumbnail_url": "https://example.com/thumb2.jpg",
            "categories": [{"id": 2, "title": "Drama"}],
        },
        {
            "friendly_token": "ghi789",
            "title": "Inception.2010.BluRay.x265.mkv",
            "duration": 148 * 60,  # 2h28m
            "thumbnail_url": "https://example.com/thumb3.jpg",
            "categories": [{"id": 1, "title": "Action"}, {"id": 3, "title": "Sci-Fi"}],
        },
    ]


@pytest.mark.asyncio
async def test_ingest_creates_database(
    temp_db: Path, mediacms_items: list[dict], httpx_mock
):
    """Ingestion creates the database and tables."""
    # Mock MediaCMS API
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/categories"),
        json=[
            {"id": 1, "title": "Action"},
            {"id": 2, "title": "Drama"},
            {"id": 3, "title": "Sci-Fi"},
        ],
    )
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json={"results": mediacms_items},
    )
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json={"results": []},
    )

    stats = await ingest_catalog("https://example.com", str(temp_db))

    assert temp_db.exists()
    assert stats["items"] == 3
    assert stats["new"] == 3
    assert stats["updated"] == 0
    assert stats["categories"] == 3  # Action, Drama, Sci-Fi


@pytest.mark.asyncio
async def test_ingest_parses_titles_correctly(
    temp_db: Path, mediacms_items: list[dict], httpx_mock
):
    """Title sanitization is applied during ingestion."""
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/categories"),
        json=[],
    )
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json={"results": mediacms_items},
    )
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json={"results": []},
    )

    await ingest_catalog("https://example.com", str(temp_db))

    async with aiosqlite.connect(str(temp_db)) as conn:
        cursor = await conn.execute(
            "SELECT video_id, sanitized_title, title_base, year, is_tv FROM catalog_item ORDER BY video_id"
        )
        rows = await cursor.fetchall()

    # abc123 = The Matrix (1999) - movie
    matrix = next(r for r in rows if r[0] == "abc123")
    assert matrix[1] == "The Matrix (1999)"
    assert matrix[2] == "The Matrix"
    assert matrix[3] == 1999
    assert matrix[4] == 0  # is_tv = False

    # def456 = Breaking Bad S01E01 - TV
    bb = next(r for r in rows if r[0] == "def456")
    assert "S01E01" in bb[1]
    assert bb[2] == "Breaking Bad"
    assert bb[4] == 1  # is_tv = True

    # ghi789 = Inception (2010) - movie
    inception = next(r for r in rows if r[0] == "ghi789")
    assert inception[1] == "Inception (2010)"
    assert inception[3] == 2010


@pytest.mark.asyncio
async def test_ingest_updates_existing_items(
    temp_db: Path, httpx_mock
):
    """Re-running ingest updates existing items instead of duplicating."""
    # First run
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/categories"),
        json=[],
    )
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json={
            "results": [
                {
                    "friendly_token": "test123",
                    "title": "Old.Title.mkv",
                    "duration": 100,
                }
            ]
        },
    )
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json={"results": []},
    )

    stats1 = await ingest_catalog("https://example.com", str(temp_db))
    assert stats1["new"] == 1
    assert stats1["updated"] == 0

    # Second run with updated title
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/categories"),
        json=[],
    )
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json={
            "results": [
                {
                    "friendly_token": "test123",
                    "title": "New.Title.2023.mkv",
                    "duration": 200,
                }
            ]
        },
    )
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json={"results": []},
    )

    stats2 = await ingest_catalog("https://example.com", str(temp_db))
    assert stats2["new"] == 0
    assert stats2["updated"] == 1

    # Verify there's still only one item
    async with aiosqlite.connect(str(temp_db)) as conn:
        cursor = await conn.execute("SELECT COUNT(*) FROM catalog_item")
        count = (await cursor.fetchone())[0]
        assert count == 1

        cursor = await conn.execute(
            "SELECT sanitized_title, duration_seconds FROM catalog_item WHERE video_id = 'test123'"
        )
        row = await cursor.fetchone()
        assert row[0] == "New Title (2023)"
        assert row[1] == 200


@pytest.mark.asyncio
async def test_ingest_handles_categories(temp_db: Path, httpx_mock):
    """Categories are properly linked to items."""
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/categories"),
        json=[
            {"id": 1, "title": "Horror"},
            {"id": 2, "title": "Comedy"},
        ],
    )
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json={
            "results": [
                {
                    "friendly_token": "movie1",
                    "title": "Horror Comedy Film",
                    "categories": [{"id": 1, "title": "Horror"}, {"id": 2, "title": "Comedy"}],
                }
            ]
        },
    )
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json={"results": []},
    )

    await ingest_catalog("https://example.com", str(temp_db))

    async with aiosqlite.connect(str(temp_db)) as conn:
        # Check categories exist
        cursor = await conn.execute(
            "SELECT name FROM catalog_category ORDER BY name"
        )
        cats = [r[0] for r in await cursor.fetchall()]
        assert cats == ["Comedy", "Horror"]

        # Check item-category links
        cursor = await conn.execute(
            """
            SELECT cc.name FROM catalog_item_category cic
            JOIN catalog_category cc ON cic.category_id = cc.id
            WHERE cic.video_id = 'movie1'
            ORDER BY cc.name
            """
        )
        linked = [r[0] for r in await cursor.fetchall()]
        assert linked == ["Comedy", "Horror"]


@pytest.mark.asyncio
async def test_show_stats_output(temp_db: Path, capsys, httpx_mock):
    """Stats command shows catalog information."""
    # First ingest some data
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/categories"),
        json=[],
    )
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json={
            "results": [
                {"friendly_token": "a", "title": "Movie A 2020", "duration": 3600, "categories": ["Movie"]},
                {"friendly_token": "b", "title": "Show S01E01", "duration": 1800, "categories": ["TV"]},
            ]
        },
    )
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json={"results": []},
    )

    await ingest_catalog("https://example.com", str(temp_db))

    # Now check stats
    await show_stats(str(temp_db))
    captured = capsys.readouterr()

    assert "Total items:" in captured.out
    assert "2" in captured.out  # 2 items


@pytest.mark.asyncio
async def test_search_finds_items(temp_db: Path, capsys, httpx_mock):
    """Search command finds matching items via FTS."""
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/categories"),
        json=[],
    )
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json={
            "results": [
                {"friendly_token": "matrix", "title": "The Matrix 1999"},
                {"friendly_token": "speed", "title": "Speed 1994"},
            ]
        },
    )
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json={"results": []},
    )

    await ingest_catalog("https://example.com", str(temp_db))

    await search_catalog(str(temp_db), "Matrix")
    captured = capsys.readouterr()

    assert "Matrix" in captured.out


@pytest.mark.asyncio
async def test_search_nonexistent_db(capsys, tmp_path: Path):
    """Search handles missing database gracefully."""
    await search_catalog(str(tmp_path / "missing.db"), "test")
    captured = capsys.readouterr()
    assert "not found" in captured.out


@pytest.mark.asyncio
async def test_stats_nonexistent_db(capsys, tmp_path: Path):
    """Stats handles missing database gracefully."""
    await show_stats(str(tmp_path / "missing.db"))
    captured = capsys.readouterr()
    assert "not found" in captured.out
