from __future__ import annotations

import pytest

from kryten.mock import MockKrytenClient

from kryten_playlist.admin_cmds import (
    add_blessed,
    get_blessed,
    record_catalog_refresh_request,
    remove_blessed,
)
from kryten_playlist.nats.kv import BUCKET_SNAPSHOT, KvJson, KvNamespace


def _mk_client() -> MockKrytenClient:
    return MockKrytenClient(
        {
            "nats": {"servers": ["nats://example:4222"]},
            "channels": [{"domain": "example.com", "channel": "lounge"}],
            "service": {"name": "test", "version": "0.0.0"},
        }
    )


@pytest.mark.asyncio
async def test_blessed_add_is_idempotent_and_trims() -> None:
    client = _mk_client()
    kv = KvJson(client, KvNamespace("test"))
    await kv.ensure_buckets()

    assert await get_blessed(kv) == []

    blessed = await add_blessed(kv, " alice ")
    assert blessed == ["alice"]

    blessed = await add_blessed(kv, "alice")
    assert blessed == ["alice"]


@pytest.mark.asyncio
async def test_blessed_remove_is_idempotent() -> None:
    client = _mk_client()
    kv = KvJson(client, KvNamespace("test"))

    await add_blessed(kv, "alice")
    await add_blessed(kv, "bob")

    blessed = await remove_blessed(kv, "alice")
    assert blessed == ["bob"]

    blessed = await remove_blessed(kv, "alice")
    assert blessed == ["bob"]


@pytest.mark.asyncio
async def test_catalog_refresh_records_marker_doc() -> None:
    client = _mk_client()
    kv = KvJson(client, KvNamespace("test"))

    doc = await record_catalog_refresh_request(kv, requested_by="admin", correlation_id="c1")
    assert doc["requested_by"] == "admin"
    assert doc["correlation_id"] == "c1"
    assert "requested_at" in doc

    stored = await kv.get_json(BUCKET_SNAPSHOT, "catalog_refresh/last")
    assert isinstance(stored, dict)
    assert stored.get("correlation_id") == "c1"
