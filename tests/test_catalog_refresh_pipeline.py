"""Tests for the catalog refresh pipeline."""

from __future__ import annotations

import aiosqlite
import pytest
from kryten.mock import MockKrytenClient

from kryten_playlist.catalog.fake_connector import FakeConnector
from kryten_playlist.catalog.models import CatalogItem
from kryten_playlist.catalog.rebuild import rebuild_catalog
from kryten_playlist.catalog.worker import run_catalog_refresh
from kryten_playlist.nats.kv import BUCKET_SNAPSHOT, KvJson, KvNamespace
from kryten_playlist.storage.schema import init_catalog_schema


async def _sqlite_memory() -> aiosqlite.Connection:
    conn = await aiosqlite.connect(":memory:")
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA foreign_keys=ON")
    await init_catalog_schema(conn)
    return conn


def _mk_client() -> MockKrytenClient:
    return MockKrytenClient(
        {
            "nats": {"servers": ["nats://example:4222"]},
            "channels": [{"domain": "example.com", "channel": "lounge"}],
            "service": {"name": "test", "version": "0.0.0"},
        }
    )


@pytest.mark.asyncio
async def test_rebuild_catalog_inserts_items_and_categories() -> None:
    conn = await _sqlite_memory()
    try:
        connector = FakeConnector()
        count = await rebuild_catalog(
            conn,
            connector.iter_items(),
            snapshot_id="snap1",
            manifest_base_url="https://m.example.com",
        )
        assert count == 3

        cursor = await conn.execute(
            "SELECT COUNT(*) AS cnt FROM catalog_item WHERE snapshot_id = 'snap1'"
        )
        row = await cursor.fetchone()
        assert row["cnt"] == 3

        cursor = await conn.execute("SELECT category FROM catalog_category ORDER BY category")
        cats = await cursor.fetchall()
        cat_names = [r["category"] for r in cats]
        assert "Horror" in cat_names
        assert "Sci-Fi" in cat_names
    finally:
        await conn.close()


@pytest.mark.asyncio
async def test_rebuild_catalog_replaces_previous_snapshot() -> None:
    conn = await _sqlite_memory()
    try:
        connector1 = FakeConnector([CatalogItem(video_id="old1", title="Old", categories=[])])
        await rebuild_catalog(conn, connector1.iter_items(), snapshot_id="snapA")

        connector2 = FakeConnector([CatalogItem(video_id="new1", title="New", categories=[])])
        await rebuild_catalog(conn, connector2.iter_items(), snapshot_id="snapB")

        cursor = await conn.execute("SELECT COUNT(*) AS cnt FROM catalog_item")
        row = await cursor.fetchone()
        assert row["cnt"] == 1

        cursor = await conn.execute("SELECT video_id FROM catalog_item")
        row = await cursor.fetchone()
        assert row["video_id"] == "new1"
    finally:
        await conn.close()


@pytest.mark.asyncio
async def test_run_catalog_refresh_updates_kv_current() -> None:
    client = _mk_client()
    kv = KvJson(client, KvNamespace("test"))
    conn = await _sqlite_memory()

    try:
        connector = FakeConnector()
        meta = await run_catalog_refresh(
            connector=connector,
            sqlite_conn=conn,
            kv=kv,
            manifest_base_url="https://m.example.com",
            source="test",
            notes="pytest",
        )

        assert meta.item_count == 3
        assert meta.source == "test"

        current = await kv.get_json(BUCKET_SNAPSHOT, "current")
        assert isinstance(current, dict)
        assert current.get("snapshot_id") == meta.snapshot_id
        assert current.get("item_count") == 3

        stored = await kv.get_json(BUCKET_SNAPSHOT, f"snapshots/{meta.snapshot_id}")
        assert isinstance(stored, dict)
        assert stored.get("snapshot_id") == meta.snapshot_id
    finally:
        await conn.close()
