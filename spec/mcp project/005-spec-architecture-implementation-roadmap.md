---
title: Catalog Browser - Implementation Roadmap
version: 1.0
date_created: 2025-12-18
owner: kryten-playlist
tags: [architecture, roadmap, implementation, phases]
---

# Introduction

This document provides a high-level overview of the Catalog Browser feature implementation, tying together the individual specifications and defining the implementation order, dependencies, and testing strategy.

## 1. Purpose & Scope

**Purpose**: Define implementation phases, dependencies between components, and verification checkpoints.

**Scope**: Coordination across all four technical specifications:
- [spec-design-catalog-api.md](spec-design-catalog-api.md) - Enhanced search and facets
- [spec-design-playlist-builder.md](spec-design-playlist-builder.md) - Playlist management
- [spec-design-queue-push.md](spec-design-queue-push.md) - CyTube integration
- [spec-design-browse-ui.md](spec-design-browse-ui.md) - Browser interface

**Intended Audience**: Developers implementing the feature.

## 2. Definitions

| Term | Definition |
|------|------------|
| **Phase** | A set of related changes that can be implemented and tested together |
| **Checkpoint** | A verification point where functionality can be tested end-to-end |
| **Blocker** | A dependency that must be complete before work can begin |

## 3. Requirements, Constraints & Guidelines

### Implementation Order Rationale

- **REQ-IMP-001**: API must be implemented before UI (UI depends on API)
- **REQ-IMP-002**: Enhanced search before facets (facets use same filter logic)
- **REQ-IMP-003**: Basic CRUD before queue push (push requires playlist data)
- **REQ-IMP-004**: Each phase must have testable output

### Constraints

- **CON-001**: Solo developer; phases must be completable in 1-2 days
- **CON-002**: No breaking changes to existing functionality
- **CON-003**: Existing tests must continue to pass

### Guidelines

- **GUD-001**: Create feature branch per phase
- **GUD-002**: Write tests alongside implementation
- **GUD-003**: Manual verification at each checkpoint

## 4. Interfaces & Data Contracts

### 4.1 Component Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                       BROWSE UI                                  │
│  (spec-design-browse-ui.md)                                     │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Filter Panel│  │ Results List│  │ Working Playlist Panel  │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
└─────────┼────────────────┼───────────────────────┼──────────────┘
          │                │                       │
          ▼                ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FASTAPI LAYER                             │
├─────────────────────┬────────────────────┬──────────────────────┤
│ Enhanced Catalog API│  Playlist API      │  Queue Push API      │
│ (catalog-api.md)    │  (playlist.md)     │  (queue-push.md)     │
│                     │                    │                      │
│ GET /search         │  GET/POST/PUT/DEL  │  POST /queue/push    │
│ GET /facets         │  /playlists        │  POST /queue/push/   │
│ GET /{id}           │                    │       stream         │
│ GET /series         │                    │                      │
└─────────┬───────────┴─────────┬──────────┴──────────┬───────────┘
          │                     │                     │
          ▼                     ▼                     ▼
┌─────────────────────┐ ┌────────────────┐ ┌─────────────────────┐
│ CatalogRepository   │ │ NATS KV        │ │ kryten-py Client    │
│ (SQLite + FTS5)     │ │ (Playlists)    │ │ (CyTube)            │
└─────────────────────┘ └────────────────┘ └─────────────────────┘
```

### 4.2 Implementation Phases

## Phase 1: Enhanced Catalog Repository (Days 1-2)

**Goal**: Extend `CatalogRepository` with new query methods.

**Files to Modify**:
- `kryten_playlist/storage/catalog_repo.py`
- `kryten_playlist/domain/schemas.py`

**New Methods**:
```python
class CatalogRepository:
    async def search_enriched(
        self,
        q: str | None,
        genre: list[str],
        mood: list[str],
        era: list[str],
        rating: list[str],
        director: list[str],
        tag: list[str],
        is_tv: bool | None,
        limit: int,
        offset: int,
        sort: str,
    ) -> CatalogSearchEnrichedResult: ...
    
    async def get_facets(
        self,
        q: str | None,
        genre: list[str],
        mood: list[str],
        era: list[str],
        rating: list[str],
        is_tv: bool | None,
    ) -> FacetsResult: ...
    
    async def get_item_detail(self, video_id: str) -> CatalogItemDetail | None: ...
    
    async def get_series_grouped(
        self, q: str | None, limit: int, offset: int
    ) -> SeriesListResult: ...
```

**Tests**:
- `tests/test_catalog_repo_enriched.py`

**Checkpoint**: Run repository tests, verify queries return correct enriched data.

---

## Phase 2: Enhanced Catalog API Routes (Days 2-3)

**Goal**: Expose new repository methods via API endpoints.

**Files to Modify**:
- `kryten_playlist/web/routes/catalog.py`
- `kryten_playlist/domain/schemas.py` (new response models)

**New Endpoints**:
- `GET /api/v1/catalog/search` (enhanced with filters)
- `GET /api/v1/catalog/facets`
- `GET /api/v1/catalog/{video_id}`
- `GET /api/v1/catalog/series`

**Tests**:
- `tests/test_catalog_routes_enriched.py`

**Checkpoint**: Test endpoints via curl/httpie, verify JSON responses.

---

## Phase 3: Playlist API Enhancements (Day 4)

**Goal**: Add missing playlist operations.

**Files to Modify**:
- `kryten_playlist/web/routes/playlists.py`
- `kryten_playlist/domain/schemas.py`

**New/Enhanced Endpoints**:
- `GET /api/v1/playlists` (add item_count, duration to response)
- `GET /api/v1/playlists/{id}` (resolve item metadata from catalog)
- `DELETE /api/v1/playlists/{id}`
- `POST /api/v1/playlists/{id}/clone`

**Tests**:
- `tests/test_playlists_enhanced.py`

**Checkpoint**: Full CRUD cycle via API.

---

## Phase 4: Queue Push with LIFO Compensation (Days 5-6)

**Goal**: Implement push endpoint with mode handling.

**Files to Create**:
- `kryten_playlist/web/routes/queue_push.py`

**Files to Modify**:
- `kryten_playlist/queue_apply.py` (refactor for reuse)
- `kryten_playlist/web/app.py` (register new router)

**New Endpoints**:
- `POST /api/v1/queue/push`
- `POST /api/v1/queue/push/stream` (SSE)

**Critical Logic**:
```python
if mode == "next":
    items = list(reversed(items))  # LIFO compensation
```

**Tests**:
- `tests/test_queue_push.py`
- `tests/test_queue_push_lifo.py` (critical ordering test)

**Checkpoint**: Push to mock CyTube, verify order.

---

## Phase 5: Browse UI - Layout and Search (Days 6-7)

**Goal**: Three-panel layout with search and filtering.

**Files to Create/Modify**:
- `kryten_playlist/web/templates/browse.html`
- `kryten_playlist/web/static/browse.js`
- `kryten_playlist/web/static/browse.css`
- `kryten_playlist/web/ui.py` (add route)

**Features**:
- Filter panel with facets
- Results list with enriched display
- Search with debounce
- Pagination

**Checkpoint**: Browse page loads, filtering works.

---

## Phase 6: Browse UI - Working Playlist (Day 8)

**Goal**: Working playlist panel with drag-and-drop.

**Files to Modify**:
- `kryten_playlist/web/static/browse.js`
- `kryten_playlist/web/templates/browse.html`

**Features**:
- Add items to working playlist
- Remove items
- Drag-and-drop reorder
- Duration calculation

**Checkpoint**: Build and reorder playlist in UI.

---

## Phase 7: Browse UI - Save and Push (Days 9-10)

**Goal**: Complete save and push workflows.

**Files to Modify**:
- `kryten_playlist/web/static/browse.js`
- `kryten_playlist/web/templates/browse.html`

**Features**:
- Save playlist modal
- Load saved playlist
- Push to queue with mode selection
- Progress modal

**Checkpoint**: Full end-to-end: browse → build → save → push.

---

## Phase 8: Polish and Testing (Days 10-12)

**Goal**: Edge cases, error handling, UX polish.

**Tasks**:
- Keyboard shortcuts
- Error toasts
- Loading states
- Empty states
- Duplicate warnings
- Large playlist warnings
- Integration tests

**Checkpoint**: All acceptance criteria verified.

## 5. Acceptance Criteria

- **AC-001**: Given Phase 1 complete, Repository tests pass with enriched queries
- **AC-002**: Given Phase 2 complete, API responds with faceted search data
- **AC-003**: Given Phase 4 complete, LIFO test demonstrates correct ordering
- **AC-004**: Given Phase 7 complete, Full workflow from browse to CyTube push works
- **AC-005**: Given Phase 8 complete, All 30 user stories from PRD verified

## 6. Test Automation Strategy

### Per-Phase Testing

| Phase | Test Type | Coverage Target |
|-------|-----------|-----------------|
| 1 | Unit (Repository) | 90% |
| 2 | Integration (API) | 85% |
| 3 | Integration (API) | 85% |
| 4 | Unit + Integration | 95% (critical path) |
| 5-7 | Manual | Checklist |
| 8 | Integration | End-to-end |

### Critical Path Tests

These tests MUST pass before merge:

1. **FTS5 query construction**: Handles special characters
2. **Multi-filter SQL**: Correct AND/OR logic
3. **LIFO ordering**: Items play in correct sequence
4. **Partial failure handling**: Successful items not lost

## 7. Rationale & Context

The phase ordering minimizes blocked work:
- API before UI allows backend testing without frontend
- Repository before routes allows isolated unit testing
- Queue push before UI integration allows mock testing
- Polish phase ensures MVP-quality before release

## 8. Dependencies & External Integrations

### Cross-Phase Dependencies

```
Phase 1 ──► Phase 2 ──► Phase 5
                   └──► Phase 6 ──► Phase 7
Phase 3 ──► Phase 4 ──► Phase 7
```

- Phase 5 requires Phase 2 (API for search)
- Phase 7 requires Phase 3 (save) and Phase 4 (push)
- Phase 8 requires all others

### External Dependencies

- SQLite FTS5 (already configured)
- NATS KV (already configured)  
- kryten-py client (already integrated)

## 9. Examples & Edge Cases

### Example: Sprint Planning

**Week 1** (5 days):
- Day 1-2: Phase 1 (Repository)
- Day 2-3: Phase 2 (API Routes)
- Day 4: Phase 3 (Playlist API)
- Day 5-6: Phase 4 (Queue Push)

**Week 2** (5 days):
- Day 6-7: Phase 5 (UI Layout/Search)
- Day 8: Phase 6 (Working Playlist)
- Day 9-10: Phase 7 (Save/Push)
- Day 10-12: Phase 8 (Polish)

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| FTS5 performance | Benchmark early in Phase 1 |
| LIFO logic error | Write test FIRST in Phase 4 |
| UI complexity | Start with minimal features, enhance iteratively |
| CyTube connection issues | Use mock client for development |

## 10. Validation Criteria

### Phase Completion Checklist

- [ ] **Phase 1**: `pytest tests/test_catalog_repo_enriched.py` passes
- [ ] **Phase 2**: `curl /api/v1/catalog/search?genre=Horror` returns enriched items
- [ ] **Phase 3**: Playlist CRUD works via Postman/httpie
- [ ] **Phase 4**: LIFO test passes, push works with mock client
- [ ] **Phase 5**: Browse page loads, filtering updates results
- [ ] **Phase 6**: Items can be added, removed, reordered
- [ ] **Phase 7**: Save modal works, push with progress works
- [ ] **Phase 8**: All acceptance criteria in PRD verified

## 11. Related Specifications / Further Reading

- [PRD: Catalog Browser and Playlist Management](../docs/prd-catalog-browser.md)
- [spec-design-catalog-api.md](spec-design-catalog-api.md)
- [spec-design-playlist-builder.md](spec-design-playlist-builder.md)
- [spec-design-queue-push.md](spec-design-queue-push.md)
- [spec-design-browse-ui.md](spec-design-browse-ui.md)
