"""Tests for LLM enrichment CLI."""

from __future__ import annotations

import json
import re
from pathlib import Path

import aiosqlite
import pytest

from kryten_playlist.catalog.enhanced_schema import init_enhanced_schema
from kryten_playlist.catalog.enrich import (
    EnrichmentResult,
    LLMClient,
    enrich_item,
    enrich_single,
    show_enriched_stats,
)


@pytest.fixture
def temp_db(tmp_path: Path) -> Path:
    """Return path to a temporary database file."""
    return tmp_path / "test_catalog.db"


@pytest.fixture
def mock_llm_response() -> dict:
    """Sample LLM response data."""
    return {
        "synopsis": "A computer hacker discovers reality is a simulation.",
        "cast_list": ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"],
        "director": "The Wachowskis",
        "genre": "Sci-Fi",
        "mood": "cerebral",
        "era": "1990s",
        "content_rating": "R",
        "tags": ["cyberpunk", "action", "philosophy", "simulation", "dystopia"],
        "notes": "Groundbreaking visual effects including 'bullet time'.",
    }


async def setup_test_db(db_path: Path) -> None:
    """Initialize test database with sample data."""
    async with aiosqlite.connect(str(db_path)) as conn:
        await init_enhanced_schema(conn)
        await conn.execute(
            """
            INSERT INTO catalog_item (
                video_id, raw_title, sanitized_title, title_base,
                year, is_tv, created_at, updated_at
            ) VALUES
            ('abc123', 'The Matrix 1999', 'The Matrix (1999)', 'The Matrix', 1999, 0, datetime('now'), datetime('now')),
            ('def456', 'Archer S01E01', 'Archer - S01E01 - Mole Hunt', 'Archer', NULL, 1, datetime('now'), datetime('now')),
            ('ghi789', 'Inception 2010', 'Inception (2010)', 'Inception', 2010, 0, datetime('now'), datetime('now'))
            """
        )
        await conn.commit()


@pytest.mark.asyncio
async def test_enrichment_result_display_success(mock_llm_response: dict):
    """EnrichmentResult formats success correctly."""
    result = EnrichmentResult(
        video_id="abc123",
        title="The Matrix (1999)",
        success=True,
        data=mock_llm_response,
    )
    display = result.display()

    assert "📌" in display
    assert "The Matrix" in display
    assert "Sci-Fi" in display
    assert "cerebral" in display
    assert "1990s" in display
    assert "R" in display
    assert "cyberpunk" in display
    assert "Keanu Reeves" in display
    assert "Wachowskis" in display


@pytest.mark.asyncio
async def test_enrichment_result_display_error():
    """EnrichmentResult formats errors correctly."""
    result = EnrichmentResult(
        video_id="abc123",
        title="The Matrix (1999)",
        success=False,
        error="API timeout",
    )
    display = result.display()

    assert "❌" in display
    assert "The Matrix" in display
    assert "API timeout" in display


@pytest.mark.asyncio
async def test_llm_client_enrich_parses_json(httpx_mock, mock_llm_response: dict):
    """LLMClient correctly parses JSON from LLM response."""
    httpx_mock.add_response(
        url=re.compile(r".*/chat/completions"),
        json={
            "choices": [
                {"message": {"content": json.dumps(mock_llm_response)}}
            ]
        },
    )

    client = LLMClient(api_key="test-key", api_base="https://api.test.com/v1")
    result, _ = await client.enrich("The Matrix", is_tv=False, year=1999)

    assert result["synopsis"] == mock_llm_response["synopsis"]
    assert result["genre"] == "Sci-Fi"
    assert "cyberpunk" in result["tags"]


@pytest.mark.asyncio
async def test_llm_client_handles_markdown_code_blocks(httpx_mock, mock_llm_response: dict):
    """LLMClient extracts JSON from markdown code blocks."""
    markdown_response = f"```json\n{json.dumps(mock_llm_response)}\n```"

    httpx_mock.add_response(
        url=re.compile(r".*/chat/completions"),
        json={
            "choices": [
                {"message": {"content": markdown_response}}
            ]
        },
    )

    client = LLMClient(api_key="test-key", api_base="https://api.test.com/v1")
    result, _ = await client.enrich("The Matrix", is_tv=False, year=1999)

    assert result["genre"] == "Sci-Fi"


@pytest.mark.asyncio
async def test_enrich_item_updates_database(
    temp_db: Path, httpx_mock, mock_llm_response: dict
):
    """enrich_item saves data to the database."""
    await setup_test_db(temp_db)

    httpx_mock.add_response(
        url=re.compile(r".*/chat/completions"),
        json={
            "choices": [
                {"message": {"content": json.dumps(mock_llm_response)}}
            ]
        },
    )

    client = LLMClient(api_key="test-key", api_base="https://api.test.com/v1")

    async with aiosqlite.connect(str(temp_db)) as conn:
        result = await enrich_item(
            conn, client, "abc123", "The Matrix (1999)", is_tv=False, year=1999
        )

        assert result.success
        assert result.data["genre"] == "Sci-Fi"

        # Verify database was updated
        cursor = await conn.execute(
            "SELECT synopsis, genre, mood, era, llm_enriched_at FROM catalog_item WHERE video_id = 'abc123'"
        )
        row = await cursor.fetchone()

        assert row[0] == mock_llm_response["synopsis"]
        assert row[1] == "Sci-Fi"
        assert row[2] == "cerebral"
        assert row[3] == "1990s"
        assert row[4] is not None  # llm_enriched_at set


@pytest.mark.asyncio
async def test_enrich_item_creates_tags(temp_db: Path, httpx_mock, mock_llm_response: dict):
    """enrich_item creates and links tags."""
    await setup_test_db(temp_db)

    httpx_mock.add_response(
        url=re.compile(r".*/chat/completions"),
        json={
            "choices": [
                {"message": {"content": json.dumps(mock_llm_response)}}
            ]
        },
    )

    client = LLMClient(api_key="test-key", api_base="https://api.test.com/v1")

    async with aiosqlite.connect(str(temp_db)) as conn:
        await enrich_item(conn, client, "abc123", "The Matrix (1999)", is_tv=False, year=1999)

        # Check tags were created
        cursor = await conn.execute(
            "SELECT name, is_llm_generated FROM catalog_tag ORDER BY name"
        )
        tags = await cursor.fetchall()
        tag_names = [t[0] for t in tags]

        assert "cyberpunk" in tag_names
        assert "action" in tag_names
        assert "philosophy" in tag_names

        # Check all are LLM-generated
        assert all(t[1] == 1 for t in tags)

        # Check item-tag links
        cursor = await conn.execute(
            """
            SELECT ct.name FROM catalog_item_tag cit
            JOIN catalog_tag ct ON cit.tag_id = ct.id
            WHERE cit.video_id = 'abc123'
            """
        )
        linked_tags = [r[0] for r in await cursor.fetchall()]
        assert "cyberpunk" in linked_tags


@pytest.mark.asyncio
async def test_enrich_item_dry_run_doesnt_save(
    temp_db: Path, httpx_mock, mock_llm_response: dict
):
    """Dry run doesn't modify the database."""
    await setup_test_db(temp_db)

    httpx_mock.add_response(
        url=re.compile(r".*/chat/completions"),
        json={
            "choices": [
                {"message": {"content": json.dumps(mock_llm_response)}}
            ]
        },
    )

    client = LLMClient(api_key="test-key", api_base="https://api.test.com/v1")

    async with aiosqlite.connect(str(temp_db)) as conn:
        result = await enrich_item(
            conn, client, "abc123", "The Matrix (1999)", is_tv=False, year=1999,
            dry_run=True,
        )

        assert result.success
        assert result.data["genre"] == "Sci-Fi"

        # Verify database was NOT updated
        cursor = await conn.execute(
            "SELECT synopsis, llm_enriched_at FROM catalog_item WHERE video_id = 'abc123'"
        )
        row = await cursor.fetchone()

        assert row[0] is None  # No synopsis saved
        assert row[1] is None  # Not marked as enriched


@pytest.mark.asyncio
async def test_enrich_item_handles_api_error(temp_db: Path, httpx_mock):
    """enrich_item handles API errors gracefully."""
    await setup_test_db(temp_db)

    httpx_mock.add_response(
        url=re.compile(r".*/chat/completions"),
        status_code=500,
    )

    client = LLMClient(api_key="test-key", api_base="https://api.test.com/v1")

    async with aiosqlite.connect(str(temp_db)) as conn:
        result = await enrich_item(
            conn, client, "abc123", "The Matrix (1999)", is_tv=False, year=1999
        )

        assert not result.success
        assert result.error is not None


@pytest.mark.asyncio
async def test_enrich_single_finds_and_enriches(
    temp_db: Path, httpx_mock, mock_llm_response: dict, capsys
):
    """enrich_single finds item by search and enriches it."""
    await setup_test_db(temp_db)

    httpx_mock.add_response(
        url=re.compile(r".*/chat/completions"),
        json={
            "choices": [
                {"message": {"content": json.dumps(mock_llm_response)}}
            ]
        },
    )

    client = LLMClient(api_key="test-key", api_base="https://api.test.com/v1")

    await enrich_single(str(temp_db), "Matrix", client, dry_run=True)

    captured = capsys.readouterr()
    assert "Matrix" in captured.out
    assert "Sci-Fi" in captured.out


@pytest.mark.asyncio
async def test_show_enriched_stats(temp_db: Path, httpx_mock, mock_llm_response: dict, capsys):
    """show_enriched_stats displays progress correctly."""
    await setup_test_db(temp_db)

    # Enrich one item
    httpx_mock.add_response(
        url=re.compile(r".*/chat/completions"),
        json={
            "choices": [
                {"message": {"content": json.dumps(mock_llm_response)}}
            ]
        },
    )

    client = LLMClient(api_key="test-key", api_base="https://api.test.com/v1")

    async with aiosqlite.connect(str(temp_db)) as conn:
        await enrich_item(conn, client, "abc123", "The Matrix (1999)", is_tv=False, year=1999)
        await conn.commit()

    await show_enriched_stats(str(temp_db))

    captured = capsys.readouterr()
    assert "Total items:" in captured.out
    assert "Enriched:" in captured.out
    assert "1" in captured.out  # 1 enriched
    assert "Remaining:" in captured.out
