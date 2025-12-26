---
title: CyTube Queue Push Specification
version: 1.0
date_created: 2025-12-18
owner: kryten-playlist
tags: [design, api, cytube, queue, integration]
---

# Introduction

This specification defines the queue push functionality for sending playlists to a CyTube channel. The critical feature is automatic reverse-ordering for "next" mode to compensate for CyTube's LIFO (Last-In-First-Out) queue insertion behavior.

## 1. Purpose & Scope

**Purpose**: Define the API and logic for pushing playlist items to CyTube channel queues with correct ordering.

**Scope**:
- Queue push modes: append, next, replace
- Automatic LIFO compensation for "next" mode
- Progress reporting during push
- Error handling and partial success
- Temporary item creation

**Intended Audience**: Backend developers implementing queue integration.

**Assumptions**:
- CyTube channel is connected via kryten-py client
- All items have valid manifest URLs in catalog
- Bot account has moderator permissions on target channel
- Items are pushed as "temporary" (not permanent library items)

## 2. Definitions

| Term | Definition |
|------|------------|
| **Queue** | CyTube's playlist/queue of media items |
| **UID** | Unique identifier for a queue item assigned by CyTube |
| **Temporary Item** | Queue item that is not saved to channel's permanent library |
| **LIFO** | Last-In-First-Out; when using "next" position, newest item plays first |
| **Manifest URL** | JSON file URL containing media metadata for custom media type |
| **Position: end** | Append to end of queue (items play last) |
| **Position: next** | Insert after currently playing item |

## 3. Requirements, Constraints & Guidelines

### Functional Requirements

- **REQ-QP-001**: Append mode MUST add items to end of queue in playlist order
- **REQ-QP-002**: Next mode MUST insert items after currently playing so they play in playlist order
- **REQ-QP-003**: Replace mode MUST clear queue before adding items (admin only)
- **REQ-QP-004**: All items MUST be added as temporary queue items
- **REQ-QP-005**: Push MUST report progress (items completed / total)
- **REQ-QP-006**: Push MUST continue after individual item failures
- **REQ-QP-007**: Push MUST report which items failed and why
- **REQ-QP-008**: Items without valid manifest URLs MUST be skipped with error

### Non-Functional Requirements

- **REQ-QP-009**: Individual item push MUST complete in < 500ms
- **REQ-QP-010**: Full playlist push (100 items) SHOULD complete in < 60 seconds
- **REQ-QP-011**: Replace mode MUST require admin role (not just blessed)

### Constraints

- **CON-001**: CyTube processes queue commands sequentially; no parallel push
- **CON-002**: No batch queue API; items must be added one at a time
- **CON-003**: CyTube "next" position creates LIFO ordering
- **CON-004**: Queue has no explicit size limit but UI degrades > 200 items

### Guidelines

- **GUD-001**: Add small delay (50-100ms) between items to avoid rate limiting
- **GUD-002**: Use WebSocket heartbeat to detect connection loss during long pushes
- **GUD-003**: Log all push operations for audit trail

### Patterns

- **PAT-001**: Reverse item order before push for "next" mode
- **PAT-002**: Return correlation ID for each add_media call for tracking
- **PAT-003**: Use server-sent events (SSE) for progress updates

## 4. Interfaces & Data Contracts

### 4.1 Queue Push Endpoint

**Endpoint**: `POST /api/v1/queue/push`

**Request**:

```python
class QueuePushIn(BaseModel):
    playlist_id: str | None = None  # Use saved playlist
    items: list[QueuePushItemIn] | None = None  # Or provide items directly
    mode: Literal["append", "next", "replace"]


class QueuePushItemIn(BaseModel):
    video_id: str
```

**Validation**:
- Either `playlist_id` OR `items` must be provided, not both
- `replace` mode requires admin role
- Maximum 500 items per push

**Response** (for immediate return, non-streaming):

```python
class QueuePushOut(BaseModel):
    status: Literal["ok", "partial", "error"]
    total_items: int
    successful: int
    failed: int
    failures: list[QueuePushFailure]
    duration_ms: int


class QueuePushFailure(BaseModel):
    video_id: str
    title: str | None
    reason: str  # "missing_manifest", "connection_error", "permission_denied"
```

### 4.2 Queue Push with Progress (SSE)

**Endpoint**: `POST /api/v1/queue/push/stream`

**Request**: Same as `QueuePushIn`

**Response**: Server-Sent Events stream

```
event: start
data: {"total": 25, "mode": "next"}

event: progress
data: {"current": 1, "total": 25, "video_id": "abc123", "title": "Aliens", "status": "ok"}

event: progress
data: {"current": 2, "total": 25, "video_id": "def456", "title": "The Thing", "status": "ok"}

event: progress
data: {"current": 3, "total": 25, "video_id": "invalid", "title": null, "status": "error", "reason": "missing_manifest"}

event: complete
data: {"status": "partial", "successful": 24, "failed": 1, "duration_ms": 12500}
```

### 4.3 LIFO Compensation Algorithm

When using "next" mode, items must be pushed in reverse order to achieve correct playback sequence.

**Problem**: CyTube's "queue next" always inserts after the currently playing item.

```
Queue: [Playing: A, Next: B, C]
Push X with position=next → [Playing: A, Next: X, B, C]
Push Y with position=next → [Playing: A, Next: Y, X, B, C]
Push Z with position=next → [Playing: A, Next: Z, Y, X, B, C]
```

If playlist is [X, Y, Z] and we want playback order X→Y→Z, we must push Z, Y, X.

**Algorithm**:

```python
async def push_playlist_next(
    client: KrytenClient,
    channel: str,
    items: list[CatalogItem],
) -> PushResult:
    """Push items so they play in order when using 'next' position.
    
    Items are reversed before push to compensate for LIFO behavior.
    """
    # Reverse for LIFO compensation
    items_to_push = list(reversed(items))
    
    results = []
    for item in items_to_push:
        try:
            await client.add_media(
                channel=channel,
                media_type="cm",  # Custom media
                media_id=item.manifest_url,
                position="next",
            )
            results.append(PushItemResult(video_id=item.video_id, status="ok"))
        except Exception as e:
            results.append(PushItemResult(
                video_id=item.video_id, 
                status="error",
                reason=str(e)
            ))
        
        # Small delay to avoid rate limiting
        await asyncio.sleep(0.05)
    
    return PushResult(results=results)
```

### 4.4 Mode Behaviors

#### Append Mode

```python
async def push_append(client, channel, items):
    """Add items to end of queue in order."""
    for item in items:
        await client.add_media(
            channel=channel,
            media_type="cm",
            media_id=item.manifest_url,
            position="end",
        )
```

Result: Items play after all currently queued items, in playlist order.

#### Next Mode

```python
async def push_next(client, channel, items):
    """Insert items after current, playing in playlist order."""
    # CRITICAL: Reverse order for LIFO compensation
    for item in reversed(items):
        await client.add_media(
            channel=channel,
            media_type="cm",
            media_id=item.manifest_url,
            position="next",
        )
```

Result: Items play immediately after current video, in playlist order.

#### Replace Mode

```python
async def push_replace(client, channel, items):
    """Clear queue and add items."""
    await client.clear_playlist(channel)
    
    for item in items:
        await client.add_media(
            channel=channel,
            media_type="cm",
            media_id=item.manifest_url,
            position="end",
        )
```

Result: Queue contains only playlist items, in order.

### 4.5 Error Handling

```python
class PushError(Enum):
    MISSING_MANIFEST = "missing_manifest"  # Catalog item lacks manifest_url
    CATALOG_NOT_FOUND = "catalog_not_found"  # video_id not in catalog
    CONNECTION_LOST = "connection_lost"  # WebSocket disconnected
    PERMISSION_DENIED = "permission_denied"  # Bot lacks mod permissions
    RATE_LIMITED = "rate_limited"  # Too many requests
    TIMEOUT = "timeout"  # No response within 5s
    UNKNOWN = "unknown"


async def push_with_error_handling(client, channel, item) -> tuple[bool, str | None]:
    """Push single item with comprehensive error handling."""
    if not item.manifest_url:
        return False, PushError.MISSING_MANIFEST.value
    
    try:
        await asyncio.wait_for(
            client.add_media(channel, "cm", item.manifest_url, position="end"),
            timeout=5.0
        )
        return True, None
    except asyncio.TimeoutError:
        return False, PushError.TIMEOUT.value
    except ConnectionError:
        return False, PushError.CONNECTION_LOST.value
    except PermissionError:
        return False, PushError.PERMISSION_DENIED.value
    except Exception as e:
        logger.exception("Unexpected push error for %s", item.video_id)
        return False, PushError.UNKNOWN.value
```

### 4.6 Confirmation Thresholds

```python
PUSH_CONFIRMATION_THRESHOLDS = {
    "warn_count": 50,   # Warn if pushing more than 50 items
    "require_confirm": 100,  # Require explicit confirmation > 100 items
    "max_items": 500,   # Hard limit
}
```

**UI Flow**:
1. 1-50 items: Push immediately
2. 51-100 items: Show warning, allow cancel
3. 101-500 items: Require checkbox confirmation
4. 500+ items: Reject with error

## 5. Acceptance Criteria

- **AC-001**: Given 5-item playlist, When pushing with "append", Then items appear at queue end in order
- **AC-002**: Given 5-item playlist [A,B,C,D,E], When pushing with "next", Then playback order after current is A,B,C,D,E
- **AC-003**: Given existing queue, When pushing with "replace" as admin, Then queue contains only new items
- **AC-004**: Given blessed (non-admin) user, When attempting "replace", Then 403 forbidden returned
- **AC-005**: Given playlist with invalid item, When pushing, Then valid items pushed, invalid reported
- **AC-006**: Given 25-item playlist, When using stream endpoint, Then 25 progress events received
- **AC-007**: Given connection loss mid-push, When reconnecting, Then push can be resumed
- **AC-008**: Given 100-item playlist, When pushing, Then total time < 60 seconds

## 6. Test Automation Strategy

- **Test Levels**: Unit tests for reversal logic, integration tests with mock client
- **Frameworks**: pytest, pytest-asyncio
- **Test Data**: 
  - Mock CyTube client that records add_media calls
  - Playlists of various sizes (1, 5, 25, 100 items)
- **Coverage Requirements**: 95% for push logic
- **Key Test Cases**:
  - LIFO reversal correctness (critical path)
  - Partial failure handling
  - Rate limiting behavior
  - Replace mode permission check
  - Timeout handling

### Critical Test: LIFO Ordering

```python
async def test_next_mode_reverses_for_lifo():
    """Verify items are pushed in reverse to achieve correct playback order."""
    mock_client = MockKrytenClient()
    items = [
        CatalogItem(video_id="A", manifest_url="http://a.json"),
        CatalogItem(video_id="B", manifest_url="http://b.json"),
        CatalogItem(video_id="C", manifest_url="http://c.json"),
    ]
    
    await push_playlist(mock_client, "channel", items, mode="next")
    
    # Items should be pushed C, B, A (reverse order)
    calls = mock_client.add_media_calls
    assert len(calls) == 3
    assert calls[0]["media_id"] == "http://c.json"
    assert calls[1]["media_id"] == "http://b.json"
    assert calls[2]["media_id"] == "http://a.json"
    
    # All should use position="next"
    assert all(c["position"] == "next" for c in calls)
```

## 7. Rationale & Context

### Why LIFO Compensation is Critical

CyTube's queue "next" position always inserts immediately after the current item. When pushing multiple items, each new item displaces the previous:

```
Initial: [Current: X]
Push A → [Current: X, A]
Push B → [Current: X, B, A]  ← B is now "next", A moved
Push C → [Current: X, C, B, A]  ← C is now "next"
```

Without reversal, playlist [A, B, C] would play as C, B, A.

### Why No Batch API

CyTube's Socket.IO protocol processes queue commands individually. While we could theoretically send multiple commands rapidly, this risks:
1. Race conditions in CyTube's queue management
2. Out-of-order processing
3. Missing confirmation events

The 50ms delay between items ensures reliable ordering.

## 8. Dependencies & External Integrations

### External Systems

- **EXT-001**: CyTube channel via Socket.IO (proxied through Kryten bridge)
- **EXT-002**: NATS message bus for command routing

### Infrastructure Dependencies

- **INF-001**: Kryten-Robot bot with channel moderator permissions
- **INF-002**: Stable WebSocket connection during push

### Technology Platform Dependencies

- **PLT-001**: kryten-py client library with `add_media`, `clear_playlist` methods
- **PLT-002**: asyncio for concurrent operations

## 9. Examples & Edge Cases

### Example: Full Push Flow

```python
# Load playlist
playlist = await get_playlist(kv, playlist_id)
video_ids = [item.video_id for item in playlist.items]

# Resolve manifest URLs from catalog
catalog_items = await repo.get_items_by_video_ids(video_ids)

# Build push list, tracking missing items
push_items = []
missing = []
for vid in video_ids:
    item = catalog_items.get(vid)
    if item and item.manifest_url:
        push_items.append(item)
    else:
        missing.append(vid)

# Execute push with mode
if mode == "next":
    push_items = list(reversed(push_items))

for item in push_items:
    await client.add_media(channel, "cm", item.manifest_url, position=mode_position)
    await asyncio.sleep(0.05)

return PushResult(
    successful=len(push_items),
    failed=len(missing),
    failures=[{"video_id": vid, "reason": "missing_manifest"} for vid in missing]
)
```

### Example: TV Season Push

```python
# User wants to queue Red Dwarf Season 1 to play next
episodes = [
    {"video_id": "rd_s1e1", "manifest_url": "..."},  # The End
    {"video_id": "rd_s1e2", "manifest_url": "..."},  # Future Echoes
    {"video_id": "rd_s1e3", "manifest_url": "..."},  # Balance of Power
    {"video_id": "rd_s1e4", "manifest_url": "..."},  # Waiting for God
    {"video_id": "rd_s1e5", "manifest_url": "..."},  # Confidence and Paranoia
    {"video_id": "rd_s1e6", "manifest_url": "..."},  # Me²
]

# With mode="next", push in reverse: e6, e5, e4, e3, e2, e1
# Result: Queue becomes [Current, e1, e2, e3, e4, e5, e6, ...]
# Playback order is correct!
```

### Edge Cases

1. **Empty playlist**: Return immediately with success, 0 items pushed
2. **All items missing manifest**: Return partial failure with all in failures list
3. **Push during video transition**: New "next" items still insert correctly
4. **Push to empty queue with "next"**: Items become queue (no current to insert after)
5. **Connection lost mid-push**: Log partial success, return completed count
6. **Duplicate items in playlist**: Push duplicates (valid use case for loops)

## 10. Validation Criteria

- [ ] Append mode maintains playlist order in queue
- [ ] Next mode achieves correct playback order via reversal
- [ ] Replace mode clears queue before adding
- [ ] Non-admin cannot use replace mode
- [ ] Progress events match actual push progress
- [ ] Failed items are reported with reasons
- [ ] 50-item push completes in < 30 seconds
- [ ] Audit log captures all push operations

## 11. Related Specifications / Further Reading

- [PRD: Catalog Browser and Playlist Management](../docs/prd-catalog-browser.md)
- [spec-design-catalog-api.md](spec-design-catalog-api.md) - Catalog for manifest URLs
- [spec-design-playlist-builder.md](spec-design-playlist-builder.md) - Playlist data
- [kryten-py client documentation](../../kryten-py/README.md)
- [Existing queue_apply.py](../kryten_playlist/queue_apply.py)
