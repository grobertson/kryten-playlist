from __future__ import annotations

from datetime import datetime, timezone

import aiosqlite
import pytest

from kryten.mock import MockKrytenClient

from kryten_playlist.nats.kv import BUCKET_PLAYLISTS, KvJson, KvNamespace
from kryten_playlist.queue_apply import apply_playlist_to_queue
from kryten_playlist.catalog.enhanced_schema import init_enhanced_schema


async def _sqlite_memory() -> aiosqlite.Connection:
    conn = await aiosqlite.connect(":memory:")
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA foreign_keys=ON")
    await init_enhanced_schema(conn)
    return conn


async def _insert_catalog_item(
    conn: aiosqlite.Connection,
    *,
    video_id: str,
    manifest_url: str,  # Kept for compatibility but ignored in DB insert if using enhanced schema
) -> None:
    # Insert with enhanced schema fields
    # video_id, raw_title, sanitized_title, title_base, created_at, mediacms_category (required for repo query)
    await conn.execute(
        """
        INSERT INTO catalog_item(
            video_id, raw_title, sanitized_title, title_base, 
            snapshot_id, created_at, mediacms_category
        ) 
        VALUES(?, ?, ?, ?, ?, ?, ?)
        """,
        (
            video_id,
            f"Title {video_id}",
            f"Title {video_id}",
            f"Title {video_id}",
            "snap1",
            datetime.now(timezone.utc).isoformat(),
            "Movies"  # Must be not null for CatalogRepo query to find it
        ),
    )
    await conn.commit()


def _mk_client() -> MockKrytenClient:
    return MockKrytenClient(
        {
            "nats": {"servers": ["nats://example:4222"]},
            "channels": [{"domain": "example.com", "channel": "lounge"}],
            "service": {"name": "test", "version": "0.0.0"},
        }
    )


@pytest.mark.asyncio
async def test_queue_apply_playlist_not_found() -> None:
    client = _mk_client()
    kv = KvJson(client, KvNamespace("test"))
    await kv.ensure_buckets()

    sqlite_conn = await _sqlite_memory()
    try:
        result = await apply_playlist_to_queue(
            client=client,
            kv=kv,
            sqlite_conn=sqlite_conn,
            channel="lounge",
            playlist_id="missing",
            mode="append",
        )

        assert result.status == "error"
        assert result.error == "Playlist not found"
        assert result.enqueued_count == 0
        assert result.failed == []
        assert client.get_published_commands() == []
    finally:
        await sqlite_conn.close()


@pytest.mark.asyncio
async def test_queue_apply_catalog_missing_items_are_reported() -> None:
    client = _mk_client()
    kv = KvJson(client, KvNamespace("test"))

    await kv.put_json(
        BUCKET_PLAYLISTS,
        "playlists/p1",
        {"id": "p1", "items": [{"video_id": "v1"}, {"video_id": "v2"}]},
    )

    sqlite_conn = await _sqlite_memory()
    try:
        # Only v2 exists in the catalog
        await _insert_catalog_item(conn=sqlite_conn, video_id="v2", manifest_url="https://m/v2.m3u8")

        result = await apply_playlist_to_queue(
            client=client,
            kv=kv,
            sqlite_conn=sqlite_conn,
            channel="lounge",
            playlist_id="p1",
            mode="append",
        )

        assert result.status == "ok"
        assert result.enqueued_count == 1
        assert {f["video_id"] for f in (result.failed or [])} == {"v1"}

        cmds = client.get_published_commands()
        assert [c["action"] for c in cmds] == ["addvideo"]
        assert cmds[0]["data"]["id"] == "https://www.420grindhouse.com/api/v1/media/cytube/v2.json?format=json"
    finally:
        await sqlite_conn.close()


@pytest.mark.asyncio
async def test_queue_apply_append_enqueues_without_clearing() -> None:
    client = _mk_client()
    kv = KvJson(client, KvNamespace("test"))

    await kv.put_json(
        BUCKET_PLAYLISTS,
        "playlists/p2",
        {"id": "p2", "items": [{"video_id": "v1"}, {"video_id": "v2"}]},
    )

    sqlite_conn = await _sqlite_memory()
    try:
        await _insert_catalog_item(conn=sqlite_conn, video_id="v1", manifest_url="https://www.420grindhouse.com/api/v1/media/cytube/v1.json?format=json")
        await _insert_catalog_item(conn=sqlite_conn, video_id="v2", manifest_url="https://m/v2.m3u8")

        result = await apply_playlist_to_queue(
            client=client,
            kv=kv,
            sqlite_conn=sqlite_conn,
            channel="lounge",
            playlist_id="p2",
            mode="append",
        )

        assert result.status == "ok"
        assert result.enqueued_count == 2
        assert result.failed == []

        cmds = client.get_published_commands()
        assert [c["action"] for c in cmds] == ["addvideo", "addvideo"]
        assert [c["data"]["id"] for c in cmds] == ["https://www.420grindhouse.com/api/v1/media/cytube/v1.json?format=json", "https://www.420grindhouse.com/api/v1/media/cytube/v2.json?format=json"]
    finally:
        await sqlite_conn.close()


@pytest.mark.asyncio
async def test_queue_apply_hard_replace_clears_then_enqueues() -> None:
    client = _mk_client()
    kv = KvJson(client, KvNamespace("test"))

    await kv.put_json(
        BUCKET_PLAYLISTS,
        "playlists/p3",
        {"id": "p3", "items": [{"video_id": "v1"}]},
    )

    sqlite_conn = await _sqlite_memory()
    try:
        await _insert_catalog_item(conn=sqlite_conn, video_id="v1", manifest_url="https://m/v1.m3u8")

        result = await apply_playlist_to_queue(
            client=client,
            kv=kv,
            sqlite_conn=sqlite_conn,
            channel="lounge",
            playlist_id="p3",
            mode="hard_replace",
        )

        assert result.status == "ok"
        assert result.enqueued_count == 1

        cmds = client.get_published_commands()
        assert [c["action"] for c in cmds] == ["clear", "addvideo"]
        assert cmds[1]["data"]["id"] == "https://www.420grindhouse.com/api/v1/media/cytube/v1.json?format=json"
    finally:
        await sqlite_conn.close()


@pytest.mark.asyncio
async def test_queue_apply_preserve_current_deletes_non_current_then_enqueues() -> None:
    client = _mk_client()
    kv = KvJson(client, KvNamespace("test"))

    await kv.put_json(
        BUCKET_PLAYLISTS,
        "playlists/p4",
        {"id": "p4", "items": [{"video_id": "v1"}]},
    )

    sqlite_conn = await _sqlite_memory()
    try:
        await _insert_catalog_item(conn=sqlite_conn, video_id="v1", manifest_url="https://m/v1.m3u8")

        # Robot state: current uid=123; playlist has another uid=456 to delete
        await client.kv_put("kryten_lounge_playlist", "current", {"uid": "123"}, as_json=True)
        await client.kv_put(
            "kryten_lounge_playlist",
            "items",
            [{"uid": "123"}, {"uid": "456"}],
            as_json=True,
        )

        result = await apply_playlist_to_queue(
            client=client,
            kv=kv,
            sqlite_conn=sqlite_conn,
            channel="lounge",
            playlist_id="p4",
            mode="preserve_current",
        )

        assert result.status == "ok"
        assert result.enqueued_count == 1

        cmds = client.get_published_commands()
        assert [c["action"] for c in cmds] == ["rmvideo", "addvideo"]
        assert cmds[0]["data"]["uid"] == 456
        assert cmds[1]["data"]["id"] == "https://www.420grindhouse.com/api/v1/media/cytube/v1.json?format=json"
    finally:
        await sqlite_conn.close()


@pytest.mark.asyncio
async def test_queue_apply_preserve_current_without_current_falls_back_to_clear() -> None:
    client = _mk_client()
    kv = KvJson(client, KvNamespace("test"))

    await kv.put_json(
        BUCKET_PLAYLISTS,
        "playlists/p5",
        {"id": "p5", "items": [{"video_id": "v1"}]},
    )

    sqlite_conn = await _sqlite_memory()
    try:
        await _insert_catalog_item(conn=sqlite_conn, video_id="v1", manifest_url="https://m/v1.m3u8")

        # No robot 'current' set
        await client.kv_put("kryten_lounge_playlist", "items", [{"uid": "999"}], as_json=True)

        result = await apply_playlist_to_queue(
            client=client,
            kv=kv,
            sqlite_conn=sqlite_conn,
            channel="lounge",
            playlist_id="p5",
            mode="preserve_current",
        )

        assert result.status == "ok"
        assert result.enqueued_count == 1

        cmds = client.get_published_commands()
        assert [c["action"] for c in cmds] == ["clear", "addvideo"]
        assert cmds[1]["data"]["id"] == "https://www.420grindhouse.com/api/v1/media/cytube/v1.json?format=json"
    finally:
        await sqlite_conn.close()
