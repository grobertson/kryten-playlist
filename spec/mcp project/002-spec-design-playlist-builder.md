---
title: Playlist Builder and Management Specification
version: 1.0
date_created: 2025-12-18
owner: kryten-playlist
tags: [design, api, playlist, management, crud]
---

# Introduction

This specification defines the playlist builder functionality including working playlist management, persistence to NATS KV, and playlist CRUD operations. It covers both the API layer and the client-side working playlist state management.

## 1. Purpose & Scope

**Purpose**: Define the data model, API endpoints, and client-side logic for creating, editing, saving, and managing playlists.

**Scope**:
- Working playlist state (in-browser, session-scoped)
- Playlist persistence API (CRUD operations)
- Playlist metadata and item ordering
- Duplicate detection and duration calculation
- Playlist listing, cloning, and deletion

**Intended Audience**: Backend and frontend developers implementing playlist features.

**Assumptions**:
- NATS KV is available for playlist persistence (existing `BUCKET_PLAYLISTS`)
- Playlists reference items by `video_id` only; full metadata resolved at display time
- Maximum playlist size is 500 items (UI performance constraint)
- Playlist ownership is tracked but not enforced (any blessed user can edit any playlist)

## 2. Definitions

| Term | Definition |
|------|------------|
| **Working Playlist** | In-memory playlist being built in browser; not persisted until saved |
| **Saved Playlist** | Playlist persisted to NATS KV with unique ID |
| **Playlist Item** | Reference to a catalog item by video_id with optional position |
| **Duration** | Total runtime of all items in playlist, in seconds |

## 3. Requirements, Constraints & Guidelines

### Functional Requirements

- **REQ-PL-001**: Working playlist MUST support add, remove, reorder, and clear operations
- **REQ-PL-002**: Working playlist MUST calculate and display total duration
- **REQ-PL-003**: Working playlist MUST detect and warn on duplicate video_ids
- **REQ-PL-004**: Save operation MUST persist playlist with unique name
- **REQ-PL-005**: Update operation MUST overwrite existing playlist content
- **REQ-PL-006**: List operation MUST return all playlists with metadata (name, count, duration, updated_at)
- **REQ-PL-007**: Get operation MUST return full playlist with resolved item metadata
- **REQ-PL-008**: Delete operation MUST remove playlist from KV and index
- **REQ-PL-009**: Clone operation MUST create copy with "Copy of {name}" naming
- **REQ-PL-010**: Playlist names MUST be unique (case-insensitive)

### Non-Functional Requirements

- **REQ-PL-011**: Playlist save/load operations MUST complete in < 500ms
- **REQ-PL-012**: Working playlist operations (add/remove/reorder) MUST be < 50ms (client-side)
- **REQ-PL-013**: All playlist mutations MUST require blessed or admin role

### Constraints

- **CON-001**: NATS KV has 1MB value size limit; playlists stored as JSON
- **CON-002**: Playlist items store only video_id; full metadata fetched on load
- **CON-003**: No concurrent edit protection; last write wins

### Guidelines

- **GUD-001**: Store minimal data in playlist document; resolve metadata at read time
- **GUD-002**: Use optimistic updates in UI; rollback on API failure
- **GUD-003**: Maintain index document for fast listing without loading all playlists

### Patterns

- **PAT-001**: Index document at `playlists/index` for listing
- **PAT-002**: Individual playlists at `playlists/{playlist_id}`
- **PAT-003**: Playlist ID is `secrets.token_urlsafe(12)` (16 characters)

## 4. Interfaces & Data Contracts

### 4.1 Working Playlist (Client-Side State)

```typescript
interface WorkingPlaylistItem {
  video_id: string;
  title: string;
  duration_seconds: number | null;
  is_tv: boolean;
  season?: number;
  episode?: number;
  thumbnail_url?: string;
}

interface WorkingPlaylist {
  items: WorkingPlaylistItem[];
  source_playlist_id: string | null;  // If loaded from saved playlist
  is_dirty: boolean;  // Has unsaved changes
  
  // Computed
  total_duration: number;  // Sum of item durations
  total_duration_display: string;  // "4h 23m"
  item_count: number;
}

// Operations
function addItem(item: WorkingPlaylistItem): void;
function addItems(items: WorkingPlaylistItem[]): void;
function removeItem(index: number): void;
function removeItems(indices: number[]): void;
function moveItem(fromIndex: number, toIndex: number): void;
function clear(): void;
function checkDuplicates(): DuplicateWarning[];
```

### 4.2 Playlist Document (KV Storage)

```python
class PlaylistDocument(BaseModel):
    """Stored in NATS KV at playlists/{playlist_id}"""
    playlist_id: str
    name: str
    description: str | None = None
    items: list[PlaylistItemDoc]
    
    created_by: str  # Username
    created_at: str  # ISO 8601
    updated_at: str  # ISO 8601
    updated_by: str | None = None  # Username of last editor
    
    schema_version: int = 2


class PlaylistItemDoc(BaseModel):
    """Minimal item reference stored in playlist"""
    video_id: str
    # No other fields - metadata resolved at read time
```

### 4.3 Index Document (KV Storage)

```python
class PlaylistIndexDocument(BaseModel):
    """Stored in NATS KV at playlists/index"""
    playlists: dict[str, PlaylistIndexEntry]
    schema_version: int = 1


class PlaylistIndexEntry(BaseModel):
    """Summary for listing without loading full playlist"""
    name: str
    item_count: int
    total_duration: int  # Seconds
    created_by: str
    created_at: str
    updated_at: str
```

### 4.4 API Endpoints

#### List Playlists

**Endpoint**: `GET /api/v1/playlists`

**Response**:

```python
class PlaylistSummaryOut(BaseModel):
    playlist_id: str
    name: str
    item_count: int
    total_duration: int
    total_duration_display: str  # "4h 23m"
    created_by: str
    updated_at: datetime


class PlaylistListOut(BaseModel):
    playlists: list[PlaylistSummaryOut]
```

#### Get Playlist with Resolved Items

**Endpoint**: `GET /api/v1/playlists/{playlist_id}`

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `resolve` | boolean | No | true | Resolve full item metadata from catalog |

**Response**:

```python
class PlaylistItemOut(BaseModel):
    video_id: str
    title: str
    duration_seconds: int | None
    duration_display: str | None
    is_tv: bool
    season: int | None
    episode: int | None
    thumbnail_url: str | None
    manifest_url: str
    
    # Enrichment summary
    genre: str | None
    year: int | None


class PlaylistDetailOut(BaseModel):
    playlist_id: str
    name: str
    description: str | None
    items: list[PlaylistItemOut]
    
    total_duration: int
    total_duration_display: str
    item_count: int
    
    created_by: str
    created_at: datetime
    updated_at: datetime
    updated_by: str | None
```

#### Create Playlist

**Endpoint**: `POST /api/v1/playlists`

**Request**:

```python
class PlaylistCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    items: list[PlaylistItemIn]


class PlaylistItemIn(BaseModel):
    video_id: str
```

**Response**:

```python
class PlaylistCreateOut(BaseModel):
    playlist_id: str
    name: str
```

**Error Responses**:
- `400`: Invalid input (empty name, too many items)
- `409`: Playlist name already exists

#### Update Playlist

**Endpoint**: `PUT /api/v1/playlists/{playlist_id}`

**Request**: Same as `PlaylistCreateIn`

**Response**: Same as `PlaylistDetailOut`

**Error Responses**:
- `404`: Playlist not found
- `409`: Name conflict with another playlist

#### Delete Playlist

**Endpoint**: `DELETE /api/v1/playlists/{playlist_id}`

**Response**: `204 No Content`

**Error Responses**:
- `404`: Playlist not found

#### Clone Playlist

**Endpoint**: `POST /api/v1/playlists/{playlist_id}/clone`

**Request**:

```python
class PlaylistCloneIn(BaseModel):
    name: str | None = None  # Defaults to "Copy of {original_name}"
```

**Response**: Same as `PlaylistCreateOut`

### 4.5 Duration Calculation

```python
def calculate_duration_display(seconds: int) -> str:
    """Convert seconds to human-readable duration.
    
    Examples:
        45 → "45s"
        90 → "1m 30s"
        3720 → "1h 2m"
        7380 → "2h 3m"
    """
    if seconds < 60:
        return f"{seconds}s"
    
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    
    if hours == 0:
        return f"{minutes}m"
    
    return f"{hours}h {minutes}m"
```

### 4.6 Duplicate Detection

```python
class DuplicateWarning(BaseModel):
    video_id: str
    title: str
    positions: list[int]  # 0-indexed positions in playlist


def detect_duplicates(items: list[PlaylistItemOut]) -> list[DuplicateWarning]:
    """Find duplicate video_ids in playlist."""
    seen: dict[str, list[int]] = {}
    for i, item in enumerate(items):
        if item.video_id in seen:
            seen[item.video_id].append(i)
        else:
            seen[item.video_id] = [i]
    
    return [
        DuplicateWarning(
            video_id=vid,
            title=items[positions[0]].title,
            positions=positions
        )
        for vid, positions in seen.items()
        if len(positions) > 1
    ]
```

## 5. Acceptance Criteria

- **AC-001**: Given empty working playlist, When adding item, Then item appears with correct metadata
- **AC-002**: Given working playlist with items, When calculating duration, Then sum of all durations displayed
- **AC-003**: Given playlist with duplicate video_id, When checking, Then duplicate warning returned
- **AC-004**: Given valid playlist data, When saving, Then playlist persisted and appears in list
- **AC-005**: Given existing playlist name, When saving with same name, Then 409 error returned
- **AC-006**: Given saved playlist, When loading, Then all items resolved with full metadata
- **AC-007**: Given playlist with orphaned video_ids, When loading, Then missing items flagged but playlist loads
- **AC-008**: Given playlist, When cloning, Then new playlist created with "Copy of" prefix
- **AC-009**: Given playlist, When deleting, Then removed from list and detail returns 404
- **AC-010**: Given reordered items, When saving, Then order preserved on reload

## 6. Test Automation Strategy

- **Test Levels**: Unit tests for duration calculation, integration tests for API
- **Frameworks**: pytest, pytest-asyncio, httpx
- **Test Data**: 
  - Mock NATS KV for isolation
  - Fixture playlists with various sizes (empty, 1, 50, 500 items)
- **Coverage Requirements**: 90% for playlist routes and repository
- **Key Test Cases**:
  - Create with duplicate name
  - Update non-existent playlist
  - Load playlist with missing catalog items
  - Concurrent updates (last write wins verification)
  - Clone with custom name vs default name

## 7. Rationale & Context

The existing playlist system stores items with only `video_id`. This is intentional to:
1. Keep playlist documents small (within NATS KV limits)
2. Always show current catalog metadata (not stale copies)
3. Enable catalog updates without playlist migration

The working playlist pattern (in-memory until save) follows common UX for document editing, allowing undo/abandon without API calls.

## 8. Dependencies & External Integrations

### Infrastructure Dependencies

- **INF-001**: NATS KV bucket `BUCKET_PLAYLISTS` with adequate storage
- **INF-002**: SQLite catalog for item metadata resolution

### Data Dependencies

- **DAT-001**: Catalog items with video_id, title, duration_seconds, manifest_url
- **DAT-002**: Index document at `playlists/index`

### Platform Dependencies

- **PLT-001**: NATS.io server with JetStream enabled
- **PLT-002**: nats-py async client

## 9. Examples & Edge Cases

### Example: Create Playlist

```http
POST /api/v1/playlists
Content-Type: application/json

{
  "name": "Saturday Horror Night",
  "description": "6-movie horror marathon for Oct 31",
  "items": [
    {"video_id": "abc123"},
    {"video_id": "def456"},
    {"video_id": "ghi789"}
  ]
}
```

Response:
```json
{
  "playlist_id": "xK9mN2pQ4rS7",
  "name": "Saturday Horror Night"
}
```

### Example: Loaded Playlist with Missing Item

```json
{
  "playlist_id": "xK9mN2pQ4rS7",
  "name": "Saturday Horror Night",
  "items": [
    {
      "video_id": "abc123",
      "title": "The Exorcist",
      "duration_seconds": 7320,
      "manifest_url": "https://..."
    },
    {
      "video_id": "deleted_item",
      "title": "[Item not found: deleted_item]",
      "duration_seconds": null,
      "manifest_url": null,
      "_missing": true
    }
  ],
  "total_duration": 7320,
  "item_count": 2
}
```

### Edge Cases

1. **Empty playlist**: Valid; can be saved with 0 items
2. **500+ items**: Reject with 400 error (UI performance limit)
3. **Missing catalog item**: Mark as `_missing: true`, exclude from duration, warn user
4. **Duplicate video_id in input**: Accept; duplicates allowed in playlist
5. **Very long name**: Truncate at 100 characters
6. **Unicode in name**: Fully supported
7. **Concurrent delete + update**: Update fails with 404

## 10. Validation Criteria

- [ ] Playlists persist across server restarts
- [ ] Index stays in sync after create/update/delete
- [ ] Duration calculation handles null durations gracefully
- [ ] Large playlists (500 items) load in < 500ms
- [ ] Duplicate detection works for non-adjacent duplicates
- [ ] Clone creates independent copy (editing clone doesn't affect original)

## 11. Related Specifications / Further Reading

- [PRD: Catalog Browser and Playlist Management](../docs/prd-catalog-browser.md)
- [spec-design-catalog-api.md](spec-design-catalog-api.md) - Catalog search for adding items
- [spec-design-queue-push.md](spec-design-queue-push.md) - Pushing playlists to CyTube
- [Existing playlist routes](../kryten_playlist/web/routes/playlists.py)
