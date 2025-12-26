---
title: Enhanced Catalog API Specification
version: 1.0
date_created: 2025-12-18
owner: kryten-playlist
tags: [design, api, catalog, search, facets]
---

# Introduction

This specification defines the enhanced catalog API for kryten-playlist, enabling rich metadata search, faceted filtering, and item detail retrieval. The API leverages the LLM-enriched catalog data (5,465+ items with genre, mood, era, director, cast, synopsis, and tags) to support efficient playlist building workflows.

## 1. Purpose & Scope

**Purpose**: Define REST API endpoints for searching, filtering, and retrieving catalog items with full enrichment metadata.

**Scope**: 
- Enhanced search endpoint with multi-field filtering
- Faceted aggregation endpoint for filter counts
- Item detail endpoint with full metadata and tags
- TV series grouping endpoint

**Intended Audience**: Backend developers implementing the API, frontend developers consuming it.

**Assumptions**:
- SQLite database with FTS5 virtual table `catalog_fts` is operational
- All 5,465 items are enriched with LLM metadata
- Existing FastAPI application structure is maintained
- Authentication via existing OTP/session mechanism

## 2. Definitions

| Term | Definition |
|------|------------|
| **Facet** | A filter dimension (e.g., genre, mood) with aggregated counts of matching items |
| **FTS5** | SQLite full-text search extension used for fast text queries |
| **Enrichment** | LLM-generated metadata: synopsis, cast, director, genre, mood, era, rating, tags |
| **Video ID** | Unique identifier for a catalog item (MediaCMS friendly_token) |
| **Manifest URL** | CyTube-compatible JSON manifest URL for custom media playback |

## 3. Requirements, Constraints & Guidelines

### Functional Requirements

- **REQ-API-001**: Search endpoint MUST support full-text search across title, synopsis, cast, and director fields
- **REQ-API-002**: Search endpoint MUST support filtering by genre, mood, era, content_rating, is_tv
- **REQ-API-003**: Multi-value filters within same field MUST use OR logic (genre=Horror&genre=Comedy → Horror OR Comedy)
- **REQ-API-004**: Cross-field filters MUST use AND logic (genre=Horror&mood=dark → Horror AND dark)
- **REQ-API-005**: Search endpoint MUST support pagination with configurable page size (25, 50, 100, 200)
- **REQ-API-006**: Search endpoint MUST support sort options: title_asc, title_desc, year_asc, year_desc, duration_asc, duration_desc, random
- **REQ-API-007**: Facets endpoint MUST return aggregated counts for genre, mood, era, content_rating, is_tv
- **REQ-API-008**: Facets endpoint MUST respect active filters when calculating counts
- **REQ-API-009**: Item detail endpoint MUST return full enrichment data including all associated tags
- **REQ-API-010**: TV series endpoint MUST return series grouped by title_base with season/episode structure

### Non-Functional Requirements

- **REQ-API-011**: Search queries MUST respond in < 200ms for typical filter combinations
- **REQ-API-012**: Facet calculations MUST complete in < 100ms
- **REQ-API-013**: API MUST require authenticated session (blessed or admin role)

### Constraints

- **CON-001**: Database is SQLite; no distributed database features available
- **CON-002**: FTS5 index is maintained by triggers; no manual rebuild required during normal operation
- **CON-003**: Tags are stored in separate table with many-to-many relationship; tag filtering requires JOIN

### Guidelines

- **GUD-001**: Use Pydantic models for all request/response schemas
- **GUD-002**: Follow existing FastAPI router patterns in `kryten_playlist.web.routes`
- **GUD-003**: Reuse `CatalogRepository` class for database access, extending with new methods
- **GUD-004**: Return empty arrays (not null) for list fields with no values

### Patterns

- **PAT-001**: Use Query parameters for filters, not request body (GET requests)
- **PAT-002**: Use `list[str]` with `Query(default=[])` for multi-value filters
- **PAT-003**: Parse JSON fields (cast_list, tags) in repository layer, not route handler

## 4. Interfaces & Data Contracts

### 4.1 Enhanced Search Endpoint

**Endpoint**: `GET /api/v1/catalog/search`

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | No | null | Full-text search query |
| `genre` | string[] | No | [] | Filter by genre(s) - OR within |
| `mood` | string[] | No | [] | Filter by mood(s) - OR within |
| `era` | string[] | No | [] | Filter by era(s) - OR within |
| `rating` | string[] | No | [] | Filter by content rating(s) - OR within |
| `director` | string[] | No | [] | Filter by director(s) - OR within |
| `tag` | string[] | No | [] | Filter by tag name(s) - OR within |
| `is_tv` | boolean | No | null | Filter by content type (true=TV, false=Movie, null=all) |
| `limit` | int | No | 50 | Page size (25, 50, 100, 200) |
| `offset` | int | No | 0 | Pagination offset |
| `sort` | string | No | "title_asc" | Sort order |

**Response Schema**:

```python
class CatalogItemEnrichedOut(BaseModel):
    video_id: str
    title: str  # sanitized_title
    raw_title: str
    year: int | None
    is_tv: bool
    season: int | None
    episode: int | None
    episode_title: str | None
    
    # Enrichment fields
    synopsis: str | None
    genre: str | None
    mood: str | None
    era: str | None
    content_rating: str | None
    director: str | None
    cast: list[str]  # Parsed from cast_list JSON
    tags: list[str]  # Tag names from catalog_item_tag join
    
    # Media fields
    duration_seconds: int | None
    thumbnail_url: str | None
    manifest_url: str
    
    # Display helpers
    duration_display: str | None  # "1h 42m" format


class CatalogSearchEnrichedOut(BaseModel):
    items: list[CatalogItemEnrichedOut]
    total: int
    limit: int
    offset: int
    has_more: bool
```

### 4.2 Facets Endpoint

**Endpoint**: `GET /api/v1/catalog/facets`

**Query Parameters**: Same filter parameters as search (q, genre, mood, era, rating, is_tv, director, tag)

**Response Schema**:

```python
class FacetValue(BaseModel):
    value: str
    count: int


class FacetsOut(BaseModel):
    genre: list[FacetValue]
    mood: list[FacetValue]
    era: list[FacetValue]
    content_rating: list[FacetValue]
    is_tv: list[FacetValue]  # [{"value": "movie", "count": 3156}, {"value": "tv", "count": 2309}]
    director: list[FacetValue]  # Top 20 by count
    tag: list[FacetValue]  # Top 50 by count
    total_matching: int
```

### 4.3 Item Detail Endpoint

**Endpoint**: `GET /api/v1/catalog/{video_id}`

**Response Schema**:

```python
class CatalogItemDetailOut(BaseModel):
    video_id: str
    title: str
    raw_title: str
    year: int | None
    is_tv: bool
    season: int | None
    episode: int | None
    episode_title: str | None
    
    # Full enrichment
    synopsis: str | None
    genre: str | None
    mood: str | None
    era: str | None
    content_rating: str | None
    director: str | None
    cast: list[str]
    llm_notes: str | None
    
    # All tags with metadata
    tags: list[TagOut]
    
    # Media
    duration_seconds: int | None
    duration_display: str | None
    thumbnail_url: str | None
    manifest_url: str
    
    # Related items (same director or title_base for TV)
    related: list[RelatedItemOut]


class TagOut(BaseModel):
    name: str
    is_llm_generated: bool


class RelatedItemOut(BaseModel):
    video_id: str
    title: str
    relationship: str  # "same_director", "same_series", "same_cast"
```

### 4.4 TV Series Endpoint

**Endpoint**: `GET /api/v1/catalog/series`

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | No | null | Search series names |
| `limit` | int | No | 50 | Number of series to return |
| `offset` | int | No | 0 | Pagination offset |

**Response Schema**:

```python
class EpisodeOut(BaseModel):
    video_id: str
    season: int
    episode: int
    episode_title: str | None
    duration_seconds: int | None


class SeasonOut(BaseModel):
    season: int
    episodes: list[EpisodeOut]
    total_duration: int  # Sum of episode durations


class SeriesOut(BaseModel):
    title_base: str  # e.g., "Red Dwarf"
    seasons: list[SeasonOut]
    total_episodes: int
    total_duration: int


class SeriesListOut(BaseModel):
    series: list[SeriesOut]
    total: int
```

### 4.5 SQL Query Patterns

**FTS5 Search Query**:
```sql
SELECT ci.video_id
FROM catalog_fts
WHERE catalog_fts MATCH ?
ORDER BY rank
```

**Facet Aggregation Query (genre example)**:
```sql
SELECT genre, COUNT(*) as count
FROM catalog_item ci
WHERE ci.llm_enriched_at IS NOT NULL
  AND (:mood IS NULL OR ci.mood IN (:mood_values))
  AND (:era IS NULL OR ci.era IN (:era_values))
  -- ... other filters
GROUP BY genre
ORDER BY count DESC
```

**TV Series Grouping Query**:
```sql
SELECT title_base, season, episode, video_id, episode_title, duration_seconds
FROM catalog_item
WHERE is_tv = 1
ORDER BY title_base, season, episode
```

## 5. Acceptance Criteria

- **AC-001**: Given no filters, When searching, Then all enriched items are returned paginated
- **AC-002**: Given genre=Horror, When searching, Then only items with genre="Horror" are returned
- **AC-003**: Given genre=Horror&genre=Comedy, When searching, Then items with genre="Horror" OR genre="Comedy" are returned
- **AC-004**: Given genre=Horror&mood=dark, When searching, Then only items matching BOTH are returned
- **AC-005**: Given q="spielberg", When searching, Then items with "spielberg" in title, synopsis, cast, or director are returned
- **AC-006**: Given is_tv=true, When searching, Then only TV episodes are returned
- **AC-007**: Given active filters, When requesting facets, Then counts reflect filtered subset
- **AC-008**: Given valid video_id, When requesting detail, Then full enrichment including tags is returned
- **AC-009**: Given invalid video_id, When requesting detail, Then 404 is returned
- **AC-010**: Given unauthenticated request, When accessing any endpoint, Then 401 is returned

## 6. Test Automation Strategy

- **Test Levels**: Unit tests for repository methods, integration tests for endpoints
- **Frameworks**: pytest, pytest-asyncio, httpx for API testing
- **Test Data**: Fixture with 10-20 sample enriched items covering movies/TV, various genres
- **Coverage Requirements**: 90% line coverage for new repository methods
- **Key Test Cases**:
  - FTS5 query construction with special characters
  - Multi-value filter SQL generation
  - Facet count accuracy with combined filters
  - Pagination edge cases (offset > total)
  - Empty result handling

## 7. Rationale & Context

The existing `/api/v1/catalog/search` endpoint only supports title LIKE search and category filtering. With 5,465 enriched items containing rich metadata, users need multi-dimensional filtering to efficiently find content for themed playlists.

FTS5 was chosen over LIKE queries for performance (sub-200ms requirement) and relevance ranking. The faceted approach mirrors e-commerce patterns familiar to users.

## 8. Dependencies & External Integrations

### Infrastructure Dependencies

- **INF-001**: SQLite database with FTS5 extension enabled
- **INF-002**: `catalog_fts` virtual table with triggers for sync

### Data Dependencies

- **DAT-001**: `catalog_item` table with enriched fields populated (llm_enriched_at NOT NULL)
- **DAT-002**: `catalog_tag` and `catalog_item_tag` tables for tag relationships

### Platform Dependencies

- **PLT-001**: Python 3.12+ with aiosqlite
- **PLT-002**: FastAPI 0.100+ with Pydantic v2

## 9. Examples & Edge Cases

### Example: Complex Filter Query

```http
GET /api/v1/catalog/search?q=alien&genre=Horror&genre=Science+Fiction&mood=dark&era=1980s&limit=25
```

Response:
```json
{
  "items": [
    {
      "video_id": "abc123",
      "title": "Aliens",
      "year": 1986,
      "is_tv": false,
      "synopsis": "Ripley returns to LV-426 with a unit of colonial marines...",
      "genre": "Science Fiction",
      "mood": "dark",
      "era": "1980s",
      "director": "James Cameron",
      "cast": ["Sigourney Weaver", "Michael Biehn", "Bill Paxton"],
      "tags": ["sequel", "military", "horror-action"],
      "duration_seconds": 8520,
      "duration_display": "2h 22m",
      "manifest_url": "https://media.example.com/api/v1/media/cytube/abc123.json"
    }
  ],
  "total": 3,
  "limit": 25,
  "offset": 0,
  "has_more": false
}
```

### Edge Cases

1. **Empty FTS query with filters**: Return all items matching filters, sorted by title
2. **FTS with special characters**: Escape quotes and parentheses in query
3. **Non-existent genre filter**: Return empty items array, not error
4. **Mixed case filters**: Normalize to match stored case (genre stored as "Horror" not "horror")
5. **Null enrichment fields**: Items with `llm_enriched_at IS NULL` are excluded from enriched search

## 10. Validation Criteria

- [ ] Search endpoint returns enriched fields in response
- [ ] FTS5 search matches across title, synopsis, cast, director
- [ ] Multi-genre filter returns union of matches
- [ ] Cross-field filters return intersection
- [ ] Facet counts are accurate for active filter set
- [ ] Response time < 200ms for 90th percentile queries
- [ ] All endpoints require authenticated session

## 11. Related Specifications / Further Reading

- [PRD: Catalog Browser and Playlist Management](../docs/prd-catalog-browser.md)
- [spec-design-playlist-builder.md](spec-design-playlist-builder.md) - Playlist management
- [spec-design-queue-push.md](spec-design-queue-push.md) - CyTube integration
- [SQLite FTS5 Documentation](https://www.sqlite.org/fts5.html)
