---
title: Data Specification for Catalog, Playlists, and NATS KV Storage
version: 0.1
date_created: 2025-12-18
last_updated: 2025-12-18
owner: kryten
tags: [data, schema, sqlite, nats, kv]
---

# Introduction

This specification defines the data models and persistence strategy for `kryten-playlist`, including local catalog indexing (SQLite) and shared state in NATS JetStream KV via `kryten-py`.

## 1. Purpose & Scope

**Purpose**: Provide unambiguous schemas for:
- Catalog snapshot and search index
- Saved playlists and marathon artifacts
- Auth state (OTP/session), ACL lists
- Analytics and likes aggregates

**Scope**: Data shapes, KV bucket/key conventions, retention, and migration.

## 2. Definitions

- **Bucket**: JetStream KV bucket.
- **Key**: Entry within a bucket.
- **Namespace**: A logical prefix to isolate per-environment/per-channel data.
- **Snapshot ID**: Unique identifier for a catalog snapshot.

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: Local catalog search data shall be stored in SQLite.
- **REQ-002**: Shared state (playlists, ACL, analytics, likes) shall be stored in NATS KV using `kryten-py`.
- **REQ-003**: KV keys shall be namespaced to avoid collisions.
- **CON-001**: Schemas shall support ~5000 catalog items with low-latency search.
- **GUD-001**: KV values shall be JSON-serializable (stored as UTF-8 JSON bytes).

## 4. Interfaces & Data Contracts

### 4.1 Namespace rules

All KV keys MUST be prefixed:

- `ns/{namespace}/...`

Where `{namespace}` defaults to `default` unless configured.

### 4.2 SQLite schema (catalog index)

SQLite database file: configurable; default `./data/catalog.sqlite3`.

Tables:

#### `catalog_item`

| Column | Type | Constraints |
|---|---|---|
| `video_id` | TEXT | PRIMARY KEY |
| `title` | TEXT | NOT NULL |
| `categories_json` | TEXT | NOT NULL (JSON array of strings) |
| `manifest_url` | TEXT | NOT NULL |
| `duration_seconds` | INTEGER | NULL |
| `thumbnail_url` | TEXT | NULL |
| `snapshot_id` | TEXT | NOT NULL |
| `created_at` | TEXT | NOT NULL (ISO 8601) |

Indexes:
- `idx_catalog_title` on `title`
- `idx_catalog_snapshot` on `snapshot_id`

#### `catalog_category`

| Column | Type | Constraints |
|---|---|---|
| `category` | TEXT | PRIMARY KEY |

#### `catalog_item_category`

| Column | Type | Constraints |
|---|---|---|
| `video_id` | TEXT | FK → catalog_item(video_id) |
| `category` | TEXT | FK → catalog_category(category) |

Primary key: (`video_id`, `category`).

Note: `categories_json` may be retained for convenience; the join table supports filtering.

### 4.3 NATS KV buckets and keys

Bucket names (normative):
- `kryten_playlist_auth`
- `kryten_playlist_acl`
- `kryten_playlist_playlists`
- `kryten_playlist_snapshot`
- `kryten_playlist_analytics`
- `kryten_playlist_likes`

#### 4.3.1 `kryten_playlist_snapshot`

- Key: `ns/{namespace}/current` → JSON

```json
{
  "snapshot_id": "2025-12-18T12:34:56Z-<random>",
  "source": "mediacms",
  "created_at": "2025-12-18T12:34:56Z",
  "item_count": 5000,
  "notes": "optional",
  "schema_version": 1
}
```

- Key: `ns/{namespace}/snapshots/{snapshot_id}` → same schema as above.

#### 4.3.2 `kryten_playlist_acl`

- Key: `ns/{namespace}/admins` → JSON array of Cytube usernames
- Key: `ns/{namespace}/blessed` → JSON array of Cytube usernames

Optional:
- Key: `ns/{namespace}/roles/{username}` → JSON

```json
{ "role": "viewer|blessed|admin", "updated_at": "ISO8601" }
```

#### 4.3.3 `kryten_playlist_playlists`

- Key: `ns/{namespace}/playlists/index` → JSON array of playlist ids (or a map)

Preferred map form:

```json
{
  "playlists": {
    "<playlist_id>": {
      "name": "Halloween Marathon",
      "created_by": "TacoBelmont",
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  },
  "schema_version": 1
}
```

- Key: `ns/{namespace}/playlists/{playlist_id}` → JSON

```json
{
  "playlist_id": "<playlist_id>",
  "name": "Halloween Marathon",
  "items": [
    {"video_id": "8FnmbsrWl", "title": "optional", "duration_seconds": 1408, "categories": ["optional"]}
  ],
  "created_by": "TacoBelmont",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "schema_version": 1
}
```

Rules:
- `playlist_id` should be a stable, URL-safe identifier (e.g., UUIDv4).
- Playlist name uniqueness policy is per namespace; enforcement strategy is specified in the API spec.

#### 4.3.4 `kryten_playlist_auth`

- Key: `ns/{namespace}/otp/request/{username}` → JSON

```json
{
  "requested_at": "ISO8601",
  "expires_at": "ISO8601",
  "request_ip": "x.x.x.x",
  "request_user_agent": "optional",
  "otp_hash": "<hash>",
  "attempts_remaining": 3,
  "schema_version": 1
}
```

- Key: `ns/{namespace}/session/{session_id}` → JSON

```json
{
  "username": "TacoBelmont",
  "role": "viewer|blessed|admin",
  "created_at": "ISO8601",
  "expires_at": "ISO8601",
  "ip": "x.x.x.x",
  "schema_version": 1
}
```

- Key: `ns/{namespace}/ipblock/{ip}` → JSON

```json
{
  "blocked_until": "ISO8601",
  "reason": "otp_unsolicited|otp_abuse|admin_action",
  "created_at": "ISO8601",
  "schema_version": 1
}
```

#### 4.3.5 `kryten_playlist_analytics`

- Key: `ns/{namespace}/counters/global` → JSON

```json
{
  "items_queued": 0,
  "items_played": 0,
  "duration_queued_seconds": 0,
  "duration_played_seconds": 0,
  "updated_at": "ISO8601",
  "schema_version": 1
}
```

- Key: `ns/{namespace}/items/{video_id}` → JSON

```json
{
  "video_id": "8FnmbsrWl",
  "play_count": 12,
  "queue_count": 20,
  "last_played_at": "ISO8601",
  "last_queued_at": "ISO8601",
  "duration_seconds": 1408,
  "schema_version": 1
}
```

- Key: `ns/{namespace}/playlists/{playlist_id}` → JSON

```json
{
  "playlist_id": "<playlist_id>",
  "apply_count": 8,
  "last_applied_at": "ISO8601",
  "schema_version": 1
}
```

#### 4.3.6 `kryten_playlist_likes`

- Key: `ns/{namespace}/items/{video_id}/likes` → JSON

```json
{
  "video_id": "8FnmbsrWl",
  "like_count": 42,
  "updated_at": "ISO8601",
  "schema_version": 1
}
```

Optional dedupe keys (if enabled):
- Key: `ns/{namespace}/dedupe/{video_id}/{user_id}` → JSON

```json
{ "liked_at": "ISO8601", "expires_at": "ISO8601", "schema_version": 1 }
```

### 4.4 User identity for likes

- `user_id` SHOULD be the Cytube username unless a more stable identifier exists in the ecosystem.

## 5. Acceptance Criteria

- **AC-001**: Given a refresh run, when catalog snapshot completes, then `kryten_playlist_snapshot` contains `current` metadata and SQLite contains items for that snapshot.
- **AC-002**: Given a saved playlist, when stored, then a KV key exists at `.../playlists/{playlist_id}` and index is updated.
- **AC-003**: Given OTP requested, when verifying, then attempts decrement and lock out after 3 failures.

## 6. Test Automation Strategy

- Unit tests for schema validation and key generation.
- Integration tests verifying `kv_put`/`kv_get` round-trip JSON.
- SQLite schema migration tests (create, insert, query).

## 7. Rationale & Context

- SQLite provides local search performance and reduces reliance on network services.
- KV is used for shared state to integrate with existing Kryten operational patterns.

## 8. Dependencies & External Integrations

- NATS JetStream KV.
- MediaCMS catalog source.

## 9. Examples & Edge Cases

```text
Edge case: playlist name rename collision
- API rejects rename if another playlist has the same name.

Edge case: dedupe key explosion
- If dedupe enabled, cap retention window and consider pruning by TTL.
```

## 10. Validation Criteria

- All KV payloads are valid JSON.
- Keys follow namespace rules.
- SQLite queries return expected results.

## 11. Related Specifications / Further Reading

- [spec/prd.md](prd.md)
- [spec/spec-schema-http-api-and-auth.md](spec-schema-http-api-and-auth.md)
