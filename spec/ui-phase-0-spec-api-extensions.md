---
title: API Extensions for Playlist Visibility and Sharing
version: 1.0
date_created: 2025-12-21
last_updated: 2025-12-21
owner: kryten
tags: [schema, api, prerequisite, backend]
---

# Introduction

This specification defines the backend API extensions required to support the playlist visibility model, sharing, and forking features described in the Playlist Management Web UI PRD. These changes are prerequisites for the frontend implementation phases.

## 1. Purpose & Scope

**Purpose**: Extend the existing playlist API to support:
- Playlist visibility (private, shared, public)
- Owner-based access control
- Playlist forking with attribution
- Filtered playlist discovery endpoints

**Scope**:
- Schema changes to playlist documents and index
- New and modified API endpoints
- Backend RBAC enforcement for visibility
- Data migration strategy for existing playlists

**Out of scope**:
- Frontend implementation (covered in Phase 1-6 specs)
- Playlist tagging (deferred to future iteration)

## 2. Definitions

- **Visibility**: Access level for a playlist (private, shared, public)
- **Private**: Only visible and editable by the owner
- **Shared**: Visible to all blessed/admin users, editable only by owner
- **Public**: Visible to all blessed/admin users, forkable by others, editable only by owner
- **Owner**: The user who created the playlist (or owns a forked copy)
- **Fork**: Create a new playlist as a copy of another user's shared/public playlist
- **Attribution**: Reference to the original playlist and owner when forked

## 3. Requirements, Constraints & Guidelines

### Functional Requirements

- **REQ-API-001**: Playlists SHALL have a `visibility` field with values: `private`, `shared`, `public`
- **REQ-API-002**: New playlists SHALL default to `private` visibility
- **REQ-API-003**: Only the playlist owner SHALL be able to edit or delete a playlist
- **REQ-API-004**: Private playlists SHALL only be returned to their owner via API
- **REQ-API-005**: Shared and public playlists SHALL be readable by any blessed/admin user
- **REQ-API-006**: Users SHALL be able to fork public playlists into their own collection
- **REQ-API-007**: Forked playlists SHALL include attribution to the original playlist and owner
- **REQ-API-008**: The API SHALL support filtering playlists by visibility and owner
- **REQ-API-009**: Playlist name uniqueness SHALL be scoped per owner (not global)

### Security Requirements

- **SEC-API-001**: Visibility enforcement SHALL occur at the API layer, not just UI
- **SEC-API-002**: Viewers (role < blessed) SHALL NOT access any playlist endpoints
- **SEC-API-003**: Attempts to edit/delete playlists by non-owners SHALL return 403 Forbidden

### Constraints

- **CON-API-001**: Existing playlists without visibility field SHALL be treated as `private`
- **CON-API-002**: Schema changes SHALL be backward compatible with schema_version migration
- **CON-API-003**: Index structure changes SHALL support efficient filtering by visibility/owner

### Guidelines

- **GUD-API-001**: Use consistent error response format for access denied scenarios
- **GUD-API-002**: Include owner information in playlist list responses for UI display

## 4. Interfaces & Data Contracts

### 4.1 Updated Playlist Document Schema

**KV Key**: `ns/{namespace}/playlists/{playlist_id}`

```json
{
  "playlist_id": "abc123xyz",
  "name": "Halloween Marathon",
  "visibility": "public",
  "owner": "TacoBelmont",
  "forked_from": {
    "playlist_id": "original123",
    "owner": "JordanAdmin",
    "forked_at": "2025-12-21T14:30:00Z"
  },
  "items": [
    {"video_id": "8FnmbsrWl", "title": "optional cache", "duration_seconds": 1408}
  ],
  "created_by": "TacoBelmont",
  "created_at": "2025-12-21T14:30:00Z",
  "updated_at": "2025-12-21T15:45:00Z",
  "schema_version": 2
}
```

**Field Changes**:
| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `visibility` | `"private" \| "shared" \| "public"` | Yes | `"private"` | Access level |
| `owner` | `string` | Yes | `created_by` | Username of playlist owner |
| `forked_from` | `object \| null` | No | `null` | Attribution for forked playlists |
| `forked_from.playlist_id` | `string` | If forked | - | Original playlist ID |
| `forked_from.owner` | `string` | If forked | - | Original playlist owner |
| `forked_from.forked_at` | `string (ISO8601)` | If forked | - | Fork timestamp |
| `schema_version` | `int` | Yes | `2` | Bumped from 1 to 2 |

### 4.2 Updated Playlist Index Schema

**KV Key**: `ns/{namespace}/playlists/index`

```json
{
  "playlists": {
    "abc123xyz": {
      "name": "Halloween Marathon",
      "visibility": "public",
      "owner": "TacoBelmont",
      "created_by": "TacoBelmont",
      "created_at": "2025-12-21T14:30:00Z",
      "updated_at": "2025-12-21T15:45:00Z",
      "item_count": 24,
      "forked_from_owner": "JordanAdmin"
    }
  },
  "schema_version": 2
}
```

**Index Entry Changes**:
| Field | Type | Notes |
|-------|------|-------|
| `visibility` | `string` | Added for efficient filtering |
| `owner` | `string` | Added for ownership queries |
| `item_count` | `int` | Added for UI display without fetching full document |
| `forked_from_owner` | `string \| null` | Added for attribution display |

### 4.3 Pydantic Schema Updates

```python
from typing import Literal, Optional
from pydantic import BaseModel, Field
from datetime import datetime

Visibility = Literal["private", "shared", "public"]

class ForkedFromOut(BaseModel):
    playlist_id: str
    owner: str
    forked_at: datetime

class PlaylistRefOut(BaseModel):
    """Updated playlist list item with visibility and owner."""
    playlist_id: str
    name: str
    visibility: Visibility
    owner: str
    item_count: int = 0
    forked_from_owner: Optional[str] = None
    updated_at: datetime

class PlaylistIndexOut(BaseModel):
    """Response for playlist list endpoints."""
    playlists: list[PlaylistRefOut]
    total: int

class PlaylistDetailOut(BaseModel):
    """Full playlist document for GET /playlists/{id}."""
    playlist_id: str
    name: str
    visibility: Visibility
    owner: str
    items: list[PlaylistItemOut]
    forked_from: Optional[ForkedFromOut] = None
    created_at: datetime
    updated_at: datetime

class PlaylistItemOut(BaseModel):
    """Playlist item with optional cached metadata."""
    video_id: str
    title: Optional[str] = None
    duration_seconds: Optional[int] = None

class PlaylistCreateIn(BaseModel):
    """Request body for creating a playlist."""
    name: str = Field(min_length=1, max_length=200)
    visibility: Visibility = "private"
    items: list[PlaylistItemIn] = Field(default_factory=list)

class PlaylistUpdateIn(BaseModel):
    """Request body for updating a playlist."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    visibility: Optional[Visibility] = None
    items: Optional[list[PlaylistItemIn]] = None

class PlaylistForkIn(BaseModel):
    """Request body for forking a playlist."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    # If name is None, use "{original_name} (copy)"
```

### 4.4 API Endpoint Changes

#### GET `/api/v1/playlists`

**Updated**: Now supports filtering and returns enriched data.

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `filter` | `"mine" \| "shared" \| "public" \| "all"` | `"mine"` | Filter playlists by visibility |
| `owner` | `string` | - | Filter by specific owner (optional) |
| `search` | `string` | - | Search by playlist name (optional) |
| `limit` | `int` | `50` | Maximum results |
| `offset` | `int` | `0` | Pagination offset |

**Filter Behavior**:
- `mine`: Returns only playlists owned by the current user (any visibility)
- `shared`: Returns playlists with `visibility=shared` from all users
- `public`: Returns playlists with `visibility=public` from all users
- `all`: Returns `mine` + `shared` + `public` (no duplicates)

**Response**: `PlaylistIndexOut`

```json
{
  "playlists": [
    {
      "playlist_id": "abc123xyz",
      "name": "Halloween Marathon",
      "visibility": "public",
      "owner": "TacoBelmont",
      "item_count": 24,
      "forked_from_owner": null,
      "updated_at": "2025-12-21T15:45:00Z"
    }
  ],
  "total": 1
}
```

#### POST `/api/v1/playlists`

**Updated**: Accepts visibility field.

**Request**: `PlaylistCreateIn`

```json
{
  "name": "My New Playlist",
  "visibility": "private",
  "items": [{"video_id": "abc123"}]
}
```

**Response**: `PlaylistCreateOut`

```json
{
  "playlist_id": "newid456"
}
```

#### GET `/api/v1/playlists/{playlist_id}`

**Updated**: Returns enriched data with access control.

**Access Control**:
- Owner: Always allowed
- Non-owner: Allowed only if `visibility` is `shared` or `public`
- Otherwise: 403 Forbidden

**Response**: `PlaylistDetailOut`

```json
{
  "playlist_id": "abc123xyz",
  "name": "Halloween Marathon",
  "visibility": "public",
  "owner": "TacoBelmont",
  "items": [
    {"video_id": "8FnmbsrWl", "title": "Halloween Special", "duration_seconds": 1408}
  ],
  "forked_from": {
    "playlist_id": "original123",
    "owner": "JordanAdmin",
    "forked_at": "2025-12-21T14:30:00Z"
  },
  "created_at": "2025-12-21T14:30:00Z",
  "updated_at": "2025-12-21T15:45:00Z"
}
```

#### PUT `/api/v1/playlists/{playlist_id}`

**Updated**: Supports partial updates, enforces ownership.

**Access Control**:
- Owner only: 403 Forbidden for non-owners

**Request**: `PlaylistUpdateIn` (all fields optional)

```json
{
  "name": "Updated Name",
  "visibility": "shared",
  "items": [{"video_id": "abc123"}, {"video_id": "def456"}]
}
```

**Response**:

```json
{
  "status": "ok",
  "playlist_id": "abc123xyz"
}
```

#### DELETE `/api/v1/playlists/{playlist_id}`

**Updated**: Enforces ownership.

**Access Control**:
- Owner only: 403 Forbidden for non-owners

**Response**:

```json
{
  "status": "ok"
}
```

#### POST `/api/v1/playlists/{playlist_id}/fork` (NEW)

**Purpose**: Create a copy of a shared/public playlist.

**Access Control**:
- Source playlist must have `visibility` of `shared` or `public`
- Any blessed/admin user can fork

**Request**: `PlaylistForkIn`

```json
{
  "name": "My Copy of Halloween Marathon"
}
```

If `name` is omitted, defaults to `"{original_name} (copy)"`.

**Response**: `PlaylistCreateOut`

```json
{
  "playlist_id": "forked789"
}
```

**Behavior**:
- Creates new playlist owned by current user
- Copies all items from source playlist
- Sets `visibility` to `private`
- Sets `forked_from` with source attribution
- Does NOT affect the source playlist

**Errors**:
- 404: Source playlist not found
- 403: Source playlist is private (not forkable)

### 4.5 Error Responses

All error responses follow the existing envelope format:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to edit this playlist"
  }
}
```

**Error Codes**:
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `FORBIDDEN` | 403 | Access denied (not owner, or playlist is private) |
| `NOT_FOUND` | 404 | Playlist does not exist |
| `CONFLICT` | 409 | Playlist name already exists (for this owner) |
| `VALIDATION_ERROR` | 422 | Invalid request data |

## 5. Acceptance Criteria

- **AC-API-001**: Given a user creates a playlist without specifying visibility, when the playlist is saved, then `visibility` defaults to `private`
- **AC-API-002**: Given a user creates a playlist with `visibility=public`, when another user lists public playlists, then the playlist appears in the list
- **AC-API-003**: Given a user owns a private playlist, when another user requests GET on that playlist, then the API returns 403 Forbidden
- **AC-API-004**: Given a user views a shared playlist they don't own, when they attempt PUT to update it, then the API returns 403 Forbidden
- **AC-API-005**: Given a public playlist exists, when a user forks it, then a new playlist is created with `forked_from` attribution
- **AC-API-006**: Given a forked playlist, when the user lists their playlists, then `forked_from_owner` is populated
- **AC-API-007**: Given an existing v1 playlist without visibility, when the API reads it, then it is treated as `private`
- **AC-API-008**: Given user A has a playlist named "Test", when user B creates a playlist named "Test", then both playlists can coexist (name uniqueness is per-owner)

## 6. Test Automation Strategy

- **Unit Tests**: Schema validation, visibility filtering logic, ownership checks
- **Integration Tests**: 
  - Create playlist with each visibility level
  - Fork public playlist
  - Access control enforcement (owner vs non-owner)
  - Name uniqueness per owner
  - Schema migration from v1 to v2
- **Test Data Management**: Use fixtures for test users with different roles

## 7. Rationale & Context

### Why visibility instead of simple public/private?

The three-tier model (private/shared/public) provides flexibility:
- `private`: Personal playlists not visible to anyone else
- `shared`: Visible but read-only; useful for "here's what I'm working on" without inviting forks
- `public`: Fully discoverable and forkable; community contribution model

### Why owner-scoped name uniqueness?

Global name uniqueness creates friction when multiple users want similar playlist names (e.g., "Horror Movies"). Per-owner uniqueness allows natural naming while preventing duplicates in a single user's collection.

### Why store item_count in index?

Displaying playlist lists with item counts is a common UX pattern. Storing in the index avoids fetching each full document just to count items.

## 8. Dependencies & External Integrations

### Internal Dependencies
- **NATS KV**: Playlist storage (existing)
- **Auth module**: Session and role management (existing)
- **Schemas module**: Pydantic models (requires updates)

### Migration Requirements
- Existing playlists (schema_version 1) must be handled gracefully
- Migration can be lazy (on read) or batch (on startup)
- Recommend lazy migration: read v1 docs, write back as v2 on next update

## 9. Examples & Edge Cases

### Example: Forking workflow

```python
# User "Alex" forks a public playlist by "Jordan"
POST /api/v1/playlists/jordan-playlist-123/fork
Authorization: Bearer <alex-session>
{
  "name": "Alex's Horror Collection"
}

# Response
{
  "playlist_id": "alex-new-456"
}

# The new playlist document contains:
{
  "playlist_id": "alex-new-456",
  "name": "Alex's Horror Collection",
  "visibility": "private",
  "owner": "Alex",
  "forked_from": {
    "playlist_id": "jordan-playlist-123",
    "owner": "Jordan",
    "forked_at": "2025-12-21T16:00:00Z"
  },
  "items": [...copied items...],
  "created_by": "Alex",
  "created_at": "2025-12-21T16:00:00Z",
  "updated_at": "2025-12-21T16:00:00Z",
  "schema_version": 2
}
```

### Edge Cases

1. **Fork of a fork**: Allowed. `forked_from` references immediate parent, not original source.
2. **Source playlist deleted after fork**: Fork remains valid; `forked_from` serves as historical record only.
3. **Source playlist made private after fork**: Fork remains valid; source is no longer forkable by others.
4. **Owner renames themselves**: Out of scope; assume usernames are stable identifiers.

## 10. Validation Criteria

- [ ] All new endpoints documented in OpenAPI schema
- [ ] Unit tests achieve 90%+ coverage on new code
- [ ] Integration tests pass for all acceptance criteria
- [ ] Existing v1 playlists load correctly with default visibility
- [ ] No breaking changes to existing API consumers (backward compatible)

## 11. Related Specifications / Further Reading

- [PRD: Playlist Management Web UI](prd-playlist-management-ui.md)
- [spec-schema-http-api-and-auth.md](complete/spec-schema-http-api-and-auth.md)
- [spec-data-playlist-catalog-and-kv.md](complete/spec-data-playlist-catalog-and-kv.md)
