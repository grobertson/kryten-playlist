---
title: Architecture Specification for Kryten Playlist Service
version: 0.1
date_created: 2025-12-18
last_updated: 2025-12-18
owner: kryten
tags: [architecture, app, playlist, cytube, nats]
---

# Introduction

This specification defines the target architecture for the `kryten-playlist` service, which provides MediaCMS catalog search, playlist authoring, marathon generation, Cytube queue application, and ecosystem analytics/likes. The service integrates with the Kryten NATS bus using `kryten-py`.

## 1. Purpose & Scope

**Purpose**: Provide an implementation-ready architecture describing components, responsibilities, runtime boundaries, and integration points.

**Scope**:
- Backend service responsibilities (web API, NATS integration, persistence)
- Storage boundaries (SQLite local index; NATS JetStream KV for shared state)
- Communication interfaces (HTTP endpoints for UI; NATS subjects for ecosystem integration)

**Out of scope**:
- Upgrading MediaCMS
- Cytube manifest JSON validation/parsing beyond optional duration/title extraction

## 2. Definitions

- **Cytube**: Video chat/playlist platform.
- **Manifest URL (cm)**: HTTPS URL to a JSON document compatible with Cytube custom manifests.
- **NATS**: Messaging system used as Kryten’s internal bus.
- **JetStream KV**: NATS persistence mechanism used for key/value buckets.
- **OTP**: One-time password sent via Cytube private message.
- **Blessed user**: A user allowed to manage/apply playlists independent of Cytube user levels.
- **Snapshot**: A time-frozen index of the MediaCMS catalog.

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: The service shall provide a web UI backed by an HTTP API for catalog search, playlist building, marathon generation, and queue application.
- **REQ-002**: The service shall integrate with the Kryten NATS bus using `kryten-py`.
- **REQ-003**: The service shall store shared ecosystem state (blessed users, playlists, analytics, likes) in NATS JetStream KV using `kryten-py` helper methods.
- **REQ-004**: The service shall support a local fast-search index for ~5000 catalog items (SQLite or equivalent).
- **REQ-005**: The service shall support applying a saved playlist to Cytube in three modes: Preserve-current (default), Append, Hard-replace (admin-gated by default).
- **SEC-001**: The service shall authenticate users via OTP delivered by Cytube PM.
- **SEC-002**: OTP entry attempts shall be limited to 3 per OTP/session.
- **SEC-003**: OTP requests and verification attempts shall be rate limited per username and per IP.
- **SEC-004**: If OTP verification occurs without a corresponding OTP request, the service shall prompt for confirmation and offer optional temporary IP blocking (default 72 hours; configurable).
- **CON-001**: The architecture shall not require MediaCMS upgrades.
- **GUD-001**: The service should be decomposed into testable modules with explicit data contracts.

## 4. Interfaces & Data Contracts

### 4.1 Runtime components

- **HTTP Server (Playlist Web/API)**
  - Serves the web UI (server-rendered or SPA) and JSON API.
  - Enforces authentication and RBAC.

- **NATS Client / KrytenClient Adapter**
  - Uses `kryten-py` for NATS connection, subscriptions, and KV.
  - Publishes commands/events for queue operations.

- **Catalog Indexer (Connector)**
  - Fetches MediaCMS catalog data and produces a new snapshot.
  - Writes snapshot metadata to NATS KV; writes search index to local SQLite.

- **Marathon Generator**
  - Produces ordered item sequences from sources (playlists/categories) using concatenate/shuffle/interleave.

- **Analytics & Likes Aggregator**
  - Updates counters/aggregates in NATS KV.
  - Consumes queue/playback events from NATS.

### 4.2 NATS KV buckets (logical)

Bucket names are normative; implementation may prefix with environment/channel.

- `kryten_playlist_auth` (OTP/session state)
- `kryten_playlist_acl` (blessed user list, admin list)
- `kryten_playlist_playlists` (saved playlists)
- `kryten_playlist_analytics` (counters, aggregates)
- `kryten_playlist_likes` (like aggregates and per-user dedupe keys)
- `kryten_playlist_snapshot` (catalog snapshot metadata)

Key schemas are defined in the data spec.

### 4.3 HTTP API

HTTP endpoints and schemas are specified in the API/auth spec.

### 4.4 Queue operations interface

Queue application shall be performed by publishing a single “apply playlist” command to the Kryten ecosystem OR by directly invoking `kryten-py` client methods if available in-process.

The NATS command subject and payload are specified in the admin/CLI spec.

## 5. Acceptance Criteria

- **AC-001**: Given NATS is reachable, when the service starts, then it connects to NATS and can read/write required KV buckets.
- **AC-002**: Given a catalog snapshot exists, when a user searches by title/category, then results return within performance targets for ~5000 items.
- **AC-003**: Given a saved playlist, when a blessed user applies it in Preserve-current mode, then the queue is replaced after the current item.
- **AC-004**: Given OTP auth enabled, when a user requests OTP, then OTP is delivered via Cytube PM and is required for session establishment.

## 6. Test Automation Strategy

- **Test Levels**: Unit (marathon generator, title parsing, rate limiting), Integration (NATS KV read/write, HTTP auth), End-to-End (happy path: login → search → build → save → apply).
- **Frameworks**: pytest, pytest-asyncio.
- **Test Data Management**: Seed SQLite with small fixtures; use ephemeral KV buckets in tests when possible.
- **CI/CD Integration**: Run unit and integration tests in GitHub Actions.
- **Coverage Requirements**: Focus on business logic modules; do not block on legacy integrations.

## 7. Rationale & Context

- NATS KV is used for shared, ecosystem-specific state because it integrates naturally with Kryten services and survives restarts.
- SQLite is used for catalog search because it provides deterministic, low-latency local queries without requiring a separate database.

## 8. Dependencies & External Integrations

### External Systems
- **EXT-001**: MediaCMS.io API/DB/export surface - source of catalog metadata.
- **EXT-002**: Cytube - playback/queue environment; receives manifest URLs.

### Infrastructure Dependencies
- **INF-001**: NATS with JetStream enabled.

### Technology Platform Dependencies
- **PLT-001**: Python 3.10+.
- **PLT-002**: Poetry packaging.

## 9. Examples & Edge Cases

```text
Example: Applying playlist in Preserve-current mode
- Fetch current playing uid from Cytube event stream
- Delete queue items after current
- Enqueue manifest URLs in playlist order

Edge case: NATS unavailable
- UI remains usable for browsing local catalog and editing playlists
- Queue apply actions are disabled
```

## 10. Validation Criteria

- Service starts and connects to NATS.
- KV buckets are readable/writable with expected key schemas.
- HTTP endpoints pass schema validation.
- Marathon generation produces deterministic results for fixed inputs/seed.

## 11. Related Specifications / Further Reading

- [spec/prd.md](prd.md)
- `kryten-py` KV helpers: `kryten/kv_store.py`
