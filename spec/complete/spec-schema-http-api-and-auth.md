---
title: HTTP API and Authentication Specification for Kryten Playlist
version: 0.1
date_created: 2025-12-18
last_updated: 2025-12-18
owner: kryten
tags: [schema, api, auth, otp, rbac]
---

# Introduction

This specification defines the HTTP API surface and authentication/authorization (OTP via Cytube PM) for `kryten-playlist`.

## 1. Purpose & Scope

**Purpose**: Provide a complete contract for the web UI backend.

**Scope**:
- Session model
- OTP request/verify flows
- RBAC enforcement
- Catalog search endpoints
- Playlist CRUD and marathon generation endpoints
- Queue-apply endpoints
- Analytics and likes read/write endpoints

## 2. Definitions

- **Session**: Server-side stored session keyed by `session_id`.
- **OTP request**: Server action generating OTP and sending via Cytube PM.
- **Unsolicited verification**: OTP verification attempt when no outstanding OTP request exists.

## 3. Requirements, Constraints & Guidelines

- **SEC-001**: The system shall support OTP login via Cytube PM.
- **SEC-002**: The system shall cap OTP verification attempts at 3 per OTP/session.
- **SEC-003**: The system shall rate-limit OTP request and OTP verification per IP and per username.
- **SEC-004**: The system shall support optional IP blocking (default 72h) when unsolicited verification occurs.
- **SEC-005**: The system shall not log raw OTP values.
- **REQ-001**: Endpoints shall return JSON for API calls; UI may be server-rendered.
- **REQ-002**: RBAC shall enforce viewer/blessed/admin as defined in PRD.

## 4. Interfaces & Data Contracts

### 4.1 Common HTTP conventions

- Base path: `/api/v1`
- Authentication: cookie `kryten_playlist_session` containing `session_id`.
- Error format:

```json
{ "error": { "code": "string", "message": "string", "details": {} } }
```

### 4.2 Auth endpoints

#### POST `/api/v1/auth/otp/request`

Request:

```json
{ "username": "string" }
```

Response:

```json
{ "status": "sent", "expires_in_seconds": 300 }
```

Behavior:
- Creates/overwrites KV key `.../otp/request/{username}`.
- Sends OTP via Cytube PM (delivery mechanism out-of-scope; integration subject defined elsewhere).
- Applies rate limits.

#### POST `/api/v1/auth/otp/verify`

Request:

```json
{ "username": "string", "otp": "string" }
```

Responses:

- Success:

```json
{ "status": "ok", "role": "viewer|blessed|admin" }
```

- Unsolicited verification (no outstanding request):

```json
{ "status": "unrequested", "can_block_ip": true, "default_block_hours": 72 }
```

- Invalid OTP:

```json
{ "status": "invalid", "attempts_remaining": 2 }
```

- Locked (attempts exhausted or blocked IP):

```json
{ "status": "locked", "retry_after_seconds": 3600 }
```

Constraints:
- Attempts remaining starts at 3.
- Verification MUST decrement attempts and persist updated attempts in KV.

#### POST `/api/v1/auth/ipblock`

Request:

```json
{ "action": "block", "hours": 72 }
```

Response:

```json
{ "status": "blocked", "blocked_until": "ISO8601" }
```

Rules:
- Only valid immediately after an unsolicited verification response OR by admin action.
- Stores KV key `.../ipblock/{ip}`.

#### POST `/api/v1/auth/logout`

- Deletes session key from KV and clears cookie.

### 4.3 Catalog endpoints

#### GET `/api/v1/catalog/search`

Query params:
- `q` (string, optional)
- `category` (repeatable, optional)
- `limit` (int, default 50)
- `offset` (int, default 0)

Response:

```json
{
  "snapshot_id": "string",
  "items": [
    {
      "video_id": "string",
      "title": "string",
      "categories": ["string"],
      "duration_seconds": 1408,
      "thumbnail_url": "string|null",
      "manifest_url": "string"
    }
  ],
  "total": 123
}
```

#### GET `/api/v1/catalog/categories`

Response:

```json
{ "categories": ["string"] }
```

### 4.4 Playlist endpoints

RBAC:
- viewer: read-only list/get
- blessed/admin: create/update/delete

#### GET `/api/v1/playlists`

Response:

```json
{ "playlists": [{"playlist_id":"string","name":"string","updated_at":"ISO8601"}] }
```

#### POST `/api/v1/playlists`

Request:

```json
{ "name": "string", "items": [{"video_id":"string"}] }
```

Response:

```json
{ "playlist_id": "string" }
```

Rules:
- Playlist name uniqueness enforced per namespace.

#### GET `/api/v1/playlists/{playlist_id}`

Response: playlist document (see data spec).

#### PUT `/api/v1/playlists/{playlist_id}`

Request:

```json
{ "name": "string", "items": [{"video_id":"string"}] }
```

#### DELETE `/api/v1/playlists/{playlist_id}`

### 4.5 Marathon generation endpoints

#### POST `/api/v1/marathons/preview`

Request:

```json
{
  "sources": [
    {"type": "playlist", "playlist_id": "string"}
  ],
  "method": "concatenate|shuffle|interleave",
  "shuffle_seed": "string|null",
  "interleave_pattern": "string|null",
  "preserve_episode_order": true
}
```

Response:

```json
{ "items": [{"video_id":"string","title":"string"}], "warnings": ["string"] }
```

Notes:
- Episode parsing rules are defined in the marathon spec.

### 4.6 Apply to queue endpoints

RBAC:
- blessed/admin: apply Preserve-current or Append
- admin: Hard-replace (unless configured otherwise)

#### POST `/api/v1/queue/apply`

Request:

```json
{
  "playlist_id": "string",
  "mode": "preserve_current|append|hard_replace"
}
```

Response:

```json
{ "status": "queued", "enqueued_count": 123, "failed": [{"video_id":"string","reason":"string"}] }
```

### 4.7 Analytics endpoints

#### GET `/api/v1/stats/top-played`

Query params:
- `window_days` (int, default 30)
- `limit` (int, default 50)

Response:

```json
{ "items": [{"video_id":"string","play_count": 12,"title":"string"}] }
```

#### GET `/api/v1/stats/top-liked`

Similar schema.

### 4.8 Likes endpoint

#### POST `/api/v1/likes/current`

Request:

```json
{ "username": "string" }
```

Response:

```json
{ "status": "ok", "video_id": "string", "like_count": 42 }
```

Notes:
- The server identifies the currently playing item via the latest observed playback state.

## 5. Acceptance Criteria

- **AC-001**: Given a user requests OTP, when they verify with correct OTP, then a session cookie is issued.
- **AC-002**: Given invalid OTP is submitted 3 times, when they attempt again, then verification is locked.
- **AC-003**: Given no OTP request exists, when verify is called, then server responds `unrequested` and offers optional IP block.
- **AC-004**: Given viewer role, when calling playlist create, then request is rejected.

## 6. Test Automation Strategy

- Unit tests for rate limiter and OTP attempt counter.
- Contract tests validating response schemas.
- Integration tests with in-memory HTTP server and mocked NATS KV.

## 7. Rationale & Context

- Server-side sessions in KV enable horizontal scaling and restarts.
- OTP avoids separate password management.

## 8. Dependencies & External Integrations

- Cytube PM sending mechanism (via Kryten ecosystem).
- NATS KV.

## 9. Examples & Edge Cases

```text
Edge case: OTP verify after OTP TTL
- respond locked/expired and require a new request

Edge case: IP blocked
- block applies to OTP request+verify endpoints
```

## 10. Validation Criteria

- OpenAPI schema (if generated) matches these contracts.
- Auth flow respects attempt limits and block behavior.

## 11. Related Specifications / Further Reading

- [spec/prd.md](prd.md)
- [spec/spec-data-playlist-catalog-and-kv.md](spec-data-playlist-catalog-and-kv.md)
- [spec/spec-process-marathon-generation.md](spec-process-marathon-generation.md)
