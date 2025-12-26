---
title: Implementation Plan (Phased PR Checklist) for Kryten Playlist
version: 0.1
date_created: 2025-12-18
last_updated: 2025-12-18
owner: kryten
tags: [process, implementation, plan, checklist]
---

# Introduction

This document converts the existing `kryten-playlist` PRD and implementation specifications into an actionable, phased pull request (PR) checklist. Each phase is designed to be independently reviewable and shippable.

## 1. Purpose & Scope

**Purpose**: Provide a PR-by-PR implementation plan that maps directly to the existing spec set in `spec/`.

**Scope**:
- Backend scaffolding (FastAPI, RBAC, session/OTP flow)
- SQLite catalog indexing + query layer
- NATS JetStream KV persistence (ACL, playlists, auth/session, analytics, likes, snapshot metadata)
- Marathon generation (pattern parsing, deterministic shuffle, episode parsing)
- Admin NATS command contracts

**Out of scope**:
- UI styling/implementation details beyond the explicit UI workflow spec
- MediaCMS upgrades

## 2. Definitions

- **PR**: Pull request containing a cohesive, reviewable unit of work.
- **KV**: JetStream Key/Value store.
- **RBAC**: Role-based access control (viewer/blessed/admin).

## 3. Requirements, Constraints & Guidelines

- **CON-001**: Each PR MUST compile and run locally.
- **CON-002**: Each PR MUST preserve existing service entrypoint behavior unless explicitly stated.
- **GUD-001**: Implement contracts exactly as defined in:
  - `spec/spec-schema-http-api-and-auth.md`
  - `spec/spec-data-playlist-catalog-and-kv.md`
  - `spec/spec-tool-admin-cli-and-nats-contracts.md`
  - `spec/spec-process-marathon-generation.md`
- **GUD-002**: Avoid adding endpoints/pages/features not described in the specs.

## 4. PR Phases (Checklist)

### PR-01: Dependency + module scaffolding

**Goal**: Establish project structure for FastAPI + SQLite + NATS KV integration.

Checklist:
- Add runtime dependencies: FastAPI, Uvicorn, aiosqlite.
- Create module skeletons:
  - `kryten_playlist/web/*` (FastAPI app + routers)
  - `kryten_playlist/storage/*` (SQLite + repos)
  - `kryten_playlist/nats/*` (KV wrapper + subject contracts)
  - `kryten_playlist/domain/*` (Pydantic models)
- Add placeholder route handlers matching API spec paths that return `501 Not Implemented`.

Acceptance:
- Importing the modules succeeds.
- `kryten-playlist` service continues to start (NATS-only) unchanged.

### PR-02: Configuration expansion

**Goal**: Extend config to support HTTP + SQLite + namespace without breaking existing config keys.

Checklist:
- Add config fields:
  - `http_host`, `http_port`
  - `sqlite_path`
  - `namespace`
- Ensure defaults are safe and match specs.

Acceptance:
- Existing config files still load.

### PR-03: NATS KV bootstrap layer

**Goal**: Provide a minimal wrapper around `kryten-py` KV helpers with namespacing.

Checklist:
- Implement `KVStore` helper that:
  - applies `ns/{namespace}/...` key prefixing
  - binds/creates required buckets
  - provides `get_json/put_json/delete/keys`
- Define bucket names as constants per data spec.

Acceptance:
- Basic KV read/write works against a running NATS.

### PR-04: Auth/session primitives (OTP request/verify)

**Goal**: Implement server-side session model and OTP attempt tracking; stub Cytube PM send.

Checklist:
- Implement session persistence in KV (`kryten_playlist_auth`).
- Implement OTP request + verify endpoints:
  - rate limit placeholders
  - attempts remaining (3)
  - unsolicited verification behavior
  - optional IP block flow
- No raw OTP logging.

Acceptance:
- Endpoints behave per `spec/spec-schema-http-api-and-auth.md`.

### PR-05: ACL (viewer/blessed/admin)

**Goal**: Implement RBAC using KV-backed roles.

Checklist:
- Add role resolution:
  - admins list, blessed list
  - role derivation rules
- Add FastAPI dependencies for role enforcement.

Acceptance:
- Viewer cannot modify playlists; blessed/admin can.

### PR-06: SQLite catalog query layer

**Goal**: Implement `catalog/search` and `catalog/categories` using SQLite.

Checklist:
- Implement SQLite schema init and query methods.
- Implement search endpoint:
  - query `q`, filter categories
  - pagination `limit/offset`

Acceptance:
- Endpoints return `snapshot_id`, items, total as per API spec.

### PR-07: Playlist CRUD in KV

**Goal**: Implement playlist create/list/get/update/delete using KV schemas.

Checklist:
- Implement playlist index doc and playlist documents.
- Enforce name uniqueness per namespace.

Acceptance:
- CRUD matches API spec and data spec.

### PR-08: Marathon generator

**Goal**: Implement concatenate/shuffle/interleave + pattern parser + episode parsing.

Checklist:
- Implement pattern parser and validation.
- Implement deterministic shuffle with seed.
- Implement episode parsing and per-source ordering option.

Acceptance:
- Unit tests cover pattern parsing and deterministic shuffle.

### PR-09: Queue apply (NATS contracts)

**Goal**: Implement queue apply endpoint and NATS request/reply commands.

Checklist:
- Implement `{pfx}.playlist.cmd.queue_apply` command handler.
- Implement HTTP `queue/apply` endpoint.
- Gate hard-replace to admin by default.

Acceptance:
- Request/reply response matches `spec/spec-tool-admin-cli-and-nats-contracts.md`.

### PR-10: Analytics + likes

**Goal**: Implement minimal counters and like flow in KV.

Checklist:
- Implement `like current` endpoint with rate limit + dedupe.
- Implement top played/top liked materialization strategy (minimal).

Acceptance:
- Like endpoint increments counters and respects dedupe.

### PR-11: Catalog refresh connector

**Goal**: Provide runnable connector and snapshot lifecycle.

Checklist:
- Implement connector interface and example connector.
- Build SQLite snapshot atomically.
- Update snapshot metadata KV current pointer.

Acceptance:
- Refresh updates SQLite and KV current pointer only on success.

## 5. Acceptance Criteria

- **AC-PLAN-001**: Each PR above has a clear goal, checklist, and acceptance outcome.
- **AC-PLAN-002**: The sequencing supports incremental delivery without large rebases.

## 6. Test Automation Strategy

- Unit tests (pattern parser, episode parsing, KV namespacing utilities).
- Integration tests (optional) for SQLite and KV with a local NATS.

## 7. Rationale & Context

This plan emphasizes early scaffolding and contract alignment, then incremental implementation of auth/RBAC, persistence, algorithms, and finally operational features.

## 8. Dependencies & External Integrations

- NATS + JetStream KV (required for auth/ACL/playlists/analytics).
- MediaCMS connector surface (implementation-dependent).

## 9. Examples & Edge Cases

- Edge case: service restarts mid-OTP flow → attempts remain consistent because stored in KV.
- Edge case: no `snapshot_id` available → catalog endpoints should return a structured error.

## 10. Validation Criteria

- All endpoints implemented must match the JSON shapes in the schema specs.
- No additional endpoints are introduced without corresponding spec updates.

## 11. Related Specifications / Further Reading

- [spec/prd.md](prd.md)
- [spec/spec-architecture-kryten-playlist-service.md](spec-architecture-kryten-playlist-service.md)
- [spec/spec-data-playlist-catalog-and-kv.md](spec-data-playlist-catalog-and-kv.md)
- [spec/spec-schema-http-api-and-auth.md](spec-schema-http-api-and-auth.md)
- [spec/spec-process-marathon-generation.md](spec-process-marathon-generation.md)
- [spec/spec-tool-admin-cli-and-nats-contracts.md](spec-tool-admin-cli-and-nats-contracts.md)
