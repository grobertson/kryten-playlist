---
title: Catalog Refresh Connector Process Specification
version: 0.1
date_created: 2025-12-18
last_updated: 2025-12-18
owner: kryten
tags: [process, data, catalog, mediacms]
---

# Introduction

This specification defines how `kryten-playlist` refreshes (rebuilds) its time-frozen snapshot of the MediaCMS catalog.

## 1. Purpose & Scope

**Purpose**: Define a connector process that can evolve with the legacy MediaCMS deployment while preserving stable downstream contracts.

**Scope**:
- Connector interface
- Snapshot lifecycle
- SQLite rebuild procedure
- KV metadata update

## 2. Definitions

- **Connector**: A runnable component that extracts catalog metadata.
- **Snapshot**: A catalog index build identified by `snapshot_id`.

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: The connector shall be runnable on-demand via CLI and optionally via an admin HTTP endpoint.
- **REQ-002**: The connector shall output items with fields: `title`, `video_id`, `categories`.
- **REQ-003**: The connector shall derive `manifest_url` from `video_id`.
- **REQ-004**: The connector shall rebuild the SQLite search index for the new snapshot.
- **REQ-005**: The connector shall write snapshot metadata to NATS KV (`kryten_playlist_snapshot`).
- **CON-001**: Connector shall not require MediaCMS upgrades.
- **GUD-001**: Connector should be implemented behind an interface to support multiple strategies (API, DB read, export parsing).

## 4. Interfaces & Data Contracts

### 4.1 Connector interface

The connector MUST provide a function returning an async iterator of catalog items:

```python
async def iter_catalog_items() -> AsyncIterator[CatalogItem]:
    ...
```

`CatalogItem` schema (JSON-serializable):

```json
{
  "video_id": "string",
  "title": "string",
  "categories": ["string"],
  "duration_seconds": 1408,
  "thumbnail_url": "string|null"
}
```

### 4.2 Snapshot ID

Snapshot ID format:
- ISO8601 timestamp + random suffix (to avoid collisions)

Example: `2025-12-18T12:34:56Z-7f3a9c`

### 4.3 SQLite rebuild contract

- Build to a temporary DB file (or temporary tables) and swap atomically:
  - Option A: write `catalog.tmp.sqlite3` then rename to `catalog.sqlite3`.
  - Option B: write to new tables with `snapshot_id` and update `current` pointer.

### 4.4 KV update contract

- On successful completion:
  - Write `kryten_playlist_snapshot` key `ns/{namespace}/snapshots/{snapshot_id}`
  - Update `ns/{namespace}/current` to new snapshot metadata

If build fails:
- Do not update `current`.
- Log error.

## 5. Acceptance Criteria

- **AC-001**: Given connector can reach MediaCMS, when refresh runs, then SQLite contains the new snapshot’s items.
- **AC-002**: Given refresh completes, then KV `current` snapshot metadata matches the SQLite snapshot id.
- **AC-003**: Given refresh fails, then KV `current` remains unchanged.

## 6. Test Automation Strategy

- Unit tests using a fake connector producing deterministic items.
- Integration tests verifying atomic swap of SQLite DB.

## 7. Rationale & Context

- A decoupled connector avoids forcing MediaCMS upgrades and supports iterative integration.

## 8. Dependencies & External Integrations

- MediaCMS catalog extraction surface (unknown/variable).

## 9. Examples & Edge Cases

```text
Edge case: Categories MTM
- Connector emits multiple categories for one item.

Edge case: Missing categories
- Use empty array.
```

## 10. Validation Criteria

- Connector output validates against schema.
- Snapshot metadata and SQLite snapshot id match.

## 11. Related Specifications / Further Reading

- [spec/spec-data-playlist-catalog-and-kv.md](spec-data-playlist-catalog-and-kv.md)
