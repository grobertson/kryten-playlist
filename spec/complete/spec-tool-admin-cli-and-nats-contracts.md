---
title: Admin/CLI and NATS Contracts Specification for Kryten Playlist
version: 0.1
date_created: 2025-12-18
last_updated: 2025-12-18
owner: kryten
tags: [tool, nats, cli, admin]
---

# Introduction

This specification defines how administrators and other Kryten tools (e.g., kryten-shell, kryten-cli) interact with `kryten-playlist` via NATS and command subjects.

## 1. Purpose & Scope

**Purpose**: Provide stable contracts for:
- Triggering catalog refresh
- Applying a named playlist to the Cytube queue
- Managing blessed users

**Scope**: NATS subjects and message schemas.

## 2. Definitions

- **Command subject**: A NATS subject used for request/reply or fire-and-forget commands.

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: Admin operations shall be invokable via NATS.
- **REQ-002**: Commands shall include a correlation id.
- **REQ-003**: Commands shall return structured responses with success/failure.
- **CON-001**: Subjects shall be namespaced by `nats_subject_prefix`.

## 4. Interfaces & Data Contracts

### 4.1 Subject naming

Let `{pfx}` = configured `nats_subject_prefix` (default `kryten`).

- Requests: `{pfx}.playlist.cmd.<command>`
- Replies: NATS reply inbox used by request/reply.

### 4.2 Command: refresh catalog

Subject: `{pfx}.playlist.cmd.catalog_refresh`

Request:

```json
{ "correlation_id": "string", "namespace": "string", "requested_by": "string" }
```

Response:

```json
{ "correlation_id": "string", "status": "ok|error", "snapshot_id": "string|null", "error": "string|null" }
```

### 4.3 Command: apply playlist

Subject: `{pfx}.playlist.cmd.queue_apply`

Request:

```json
{
  "correlation_id": "string",
  "namespace": "string",
  "requested_by": "string",
  "playlist_id": "string",
  "mode": "preserve_current|append|hard_replace"
}
```

Response:

```json
{
  "correlation_id": "string",
  "status": "ok|error",
  "enqueued_count": 0,
  "failed": [{"video_id":"string","reason":"string"}],
  "error": "string|null"
}
```

### 4.4 Command: blessed users

Subject: `{pfx}.playlist.cmd.blessed_add`

Request:

```json
{ "correlation_id":"string","namespace":"string","requested_by":"string","username":"string" }
```

Response:

```json
{ "correlation_id":"string","status":"ok|error","error":"string|null" }
```

Subject: `{pfx}.playlist.cmd.blessed_remove` with same request schema.

Subject: `{pfx}.playlist.cmd.blessed_list`

Response:

```json
{ "correlation_id":"string","status":"ok|error","blessed":["string"],"error":"string|null" }
```

### 4.5 Command authorization

- Service SHALL verify `requested_by` is admin for admin-only operations.
- For queue apply, service SHALL enforce role gating for `hard_replace`.

## 5. Acceptance Criteria

- **AC-001**: Given an admin sends `catalog_refresh`, service returns `ok` and snapshot id on success.
- **AC-002**: Given blessed user sends `queue_apply` with preserve_current, service executes or returns structured error.
- **AC-003**: Given non-admin sends `blessed_add`, service returns `error`.

## 6. Test Automation Strategy

- Integration tests using NATS test server (if available) or mocked client.
- Schema validation tests for command payloads.

## 7. Rationale & Context

- NATS contracts allow `kryten-shell` and other services to drive operations without depending on HTTP access.

## 8. Dependencies & External Integrations

- NATS.

## 9. Examples & Edge Cases

```text
Edge case: queue apply partially fails
- response includes failed list
```

## 10. Validation Criteria

- Subjects and schemas remain stable.
- Commands include correlation id.

## 11. Related Specifications / Further Reading

- [spec/prd.md](prd.md)
- [spec/spec-schema-http-api-and-auth.md](spec-schema-http-api-and-auth.md)
