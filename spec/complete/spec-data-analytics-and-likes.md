---
title: Data Specification for Analytics and Like Signals
version: 0.1
date_created: 2025-12-18
last_updated: 2025-12-18
owner: kryten
tags: [data, analytics, likes, nats, kv]
---

# Introduction

This specification defines what `kryten-playlist` tracks for playlist/media analytics and how likes are recorded and queried.

## 1. Purpose & Scope

**Purpose**: Provide clear definitions of metrics, event inputs, KV storage, and anti-abuse constraints.

**Scope**:
- Counters and aggregates
- Update triggers
- Like dedupe and rate limiting
- Query shapes for “top played” and “top liked”

## 2. Definitions

- **Queued event**: An item was added to queue.
- **Played event**: Playback started/confirmed for an item.
- **Like**: User signal indicating positive preference for current item.

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: The service shall store analytics in NATS KV via `kryten-py`.
- **REQ-002**: The service shall maintain global counters and per-item counters.
- **REQ-003**: The service shall maintain per-playlist apply counters.
- **REQ-004**: Any user may submit a like for the currently playing item.
- **SEC-001**: Likes shall be rate-limited per user.
- **SEC-002**: Likes may be deduplicated per user per item within a configurable time window.
- **CON-001**: Analytics updates must survive restarts.

## 4. Interfaces & Data Contracts

### 4.1 Storage

KV bucket: `kryten_playlist_analytics` and `kryten_playlist_likes`.

Key/value schemas are defined in [spec/spec-data-playlist-catalog-and-kv.md](spec-data-playlist-catalog-and-kv.md).

### 4.2 Update triggers

The service updates analytics when it observes:
- Queue apply operations initiated by this service (definitive queued count increments).
- Queue events on NATS (if available) for additional signals.
- Playback state events (now playing) to increment played counts.

### 4.3 Like recording flow

Inputs:
- `username` (or stable user id)
- `current_video_id` (derived from playback state)

Processing:
1. Rate limit check (per user).
2. If dedupe enabled: check dedupe KV key; if exists and not expired, reject as duplicate.
3. Increment like counter for item.
4. Store/update dedupe key with TTL window.

### 4.4 Query contract

- “Top played” and “Top liked” shall be derived from KV aggregates and/or periodically materialized ranked lists.

## 5. Acceptance Criteria

- **AC-001**: Given an apply playlist operation enqueues 10 items, global `items_queued` increases by 10.
- **AC-002**: Given playback state indicates item X started, item X `play_count` increases by 1.
- **AC-003**: Given a user likes current item, like count increments and is retrievable.
- **AC-004**: Given dedupe enabled, repeated likes by the same user for the same item within the window do not increment.

## 6. Test Automation Strategy

- Unit tests for rate limiter and dedupe logic.
- Integration tests for KV counter updates under concurrency.

## 7. Rationale & Context

- KV is chosen to keep ecosystem-specific data co-located with the NATS-based architecture.

## 8. Dependencies & External Integrations

- Playback state events availability from Cytube/Kryten.

## 9. Examples & Edge Cases

```text
Edge case: current playing unknown
- like endpoint returns error "no_current_item".

Edge case: concurrent likes
- use optimistic retry on KV update if needed.
```

## 10. Validation Criteria

- Like updates are idempotent under dedupe.
- Aggregates remain consistent after restart.

## 11. Related Specifications / Further Reading

- [spec/prd.md](prd.md)
- [spec/spec-data-playlist-catalog-and-kv.md](spec-data-playlist-catalog-and-kv.md)
