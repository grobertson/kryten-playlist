from __future__ import annotations

import pytest

from kryten.mock import MockKrytenClient

from kryten_playlist.admin_cmds import record_catalog_refresh_request
from kryten_playlist.catalog_refresh_watcher import CatalogRefreshWatchState, process_catalog_refresh_marker
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
async def test_process_catalog_refresh_marker_is_idempotent() -> None:
    client = _mk_client()
    kv = KvJson(client, KvNamespace("test"))

    state = CatalogRefreshWatchState()

    # No marker => no-op
    assert await process_catalog_refresh_marker(kv, state=state) is None

    await record_catalog_refresh_request(kv, requested_by="admin", correlation_id="c1")

    marker = await process_catalog_refresh_marker(kv, state=state)
    assert isinstance(marker, dict)
    assert marker.get("correlation_id") == "c1"

    ack = await kv.get_json(BUCKET_SNAPSHOT, "catalog_refresh/last_processed")
    assert isinstance(ack, dict)
    assert isinstance(ack.get("marker"), dict)
    assert ack["marker"].get("correlation_id") == "c1"

    # Same marker again => no-op
    assert await process_catalog_refresh_marker(kv, state=state) is None
