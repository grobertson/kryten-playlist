---
title: Frontend Implementation Specification for Kryten Playlist Web UI
version: 0.1
date_created: 2025-12-18
last_updated: 2025-12-18
owner: kryten
tags: [design, architecture, ui, frontend]
---

# Introduction

This specification defines an implementation-ready frontend approach for `kryten-playlist` that satisfies the PRD and UI workflow specs while minimizing complexity.

The approach is designed for a backend-owned UI (FastAPI + server-rendered templates) enhanced with small JavaScript utilities for drag-and-drop ordering and responsive interactions.

## 1. Purpose & Scope

**Purpose**: Provide a concrete implementation plan for the web UI described in:
- `spec/spec-design-ui-workflows.md`
- `spec/spec-schema-http-api-and-auth.md`

**Scope**:
- Rendering strategy (templates + progressive enhancement)
- Page/screen mapping (no extra pages)
- JS behaviors (drag-and-drop, debounced search)
- Static assets and directory layout
- Exact API calls and error handling patterns

**Out of scope**:
- Visual branding beyond a clean, readable layout
- New features not described in PRD/specs

## 2. Definitions

- **SSR**: Server-side rendering (HTML templates rendered on the backend).
- **Progressive enhancement**: Page works without JS, but JS improves UX.
- **Working playlist**: The in-progress list prior to save.

## 3. Requirements, Constraints & Guidelines

- **REQ-UI-001**: UI SHALL implement exactly the screens and flows in `spec/spec-design-ui-workflows.md`.
- **REQ-UI-002**: UI SHALL support drag-and-drop ordering for the working playlist and saved playlist editor.
- **REQ-UI-003**: UI SHALL support fast search UX (debounced query + incremental updates).
- **REQ-UI-004**: UI SHALL support OTP request/verify and show the unsolicited-verification confirmation + optional IP block.
- **REQ-UI-005**: UI SHALL support playlist CRUD, marathon preview/edit, and apply-to-queue modes.
- **CON-UI-001**: UI SHALL NOT introduce extra pages, dashboards, filters, or “nice-to-have” features beyond the specs.
- **CON-UI-002**: UI SHALL NOT assume Cytube real-time state; it only reflects backend state.
- **GUD-UI-001**: Prefer SSR templates for speed of delivery and operational simplicity.
- **GUD-UI-002**: Keep all client JS in a single small bundle with no build step if possible.

## 4. Interfaces & Data Contracts

### 4.1 Rendering strategy

- The UI SHALL be served from the same FastAPI process.
- The UI SHALL use SSR templates (Jinja2) for initial page load.
- Interactions SHALL call JSON endpoints under `/api/v1/...`.

### 4.2 Route mapping (pages)

The UI SHALL provide the following browser routes (HTML):

| Screen (from workflow spec) | Browser path | Notes |
|---|---|---|
| Login (OTP) | `/login` | Default route when unauthenticated |
| Catalog Search + Working Playlist | `/` | Main page after login |
| Saved Playlists list/editor | `/playlists` and `/playlists/{playlist_id}` | Editor includes marathon builder |
| Apply to Queue | `/apply` | Select playlist and mode |
| Stats + Likes | `/stats` | Like current + top played/top liked |

**CON-UI-003**: These routes SHALL NOT proliferate; no other pages.

### 4.3 API usage (authoritative)

All data mutations SHALL be performed via the JSON API defined in `spec/spec-schema-http-api-and-auth.md`.

UI calls:
- OTP:
  - `POST /api/v1/auth/otp/request`
  - `POST /api/v1/auth/otp/verify`
  - `POST /api/v1/auth/ipblock`
  - `POST /api/v1/auth/logout`
- Catalog:
  - `GET /api/v1/catalog/search?q=...&category=...`
  - `GET /api/v1/catalog/categories`
- Playlists:
  - `GET /api/v1/playlists`
  - `POST /api/v1/playlists`
  - `GET /api/v1/playlists/{id}`
  - `PUT /api/v1/playlists/{id}`
  - `DELETE /api/v1/playlists/{id}`
- Marathon:
  - `POST /api/v1/marathon/preview` (as defined in API spec)
- Queue:
  - `POST /api/v1/queue/apply`
- Likes/stats:
  - `POST /api/v1/likes/current`
  - `GET /api/v1/stats/top-played`
  - `GET /api/v1/stats/top-liked`

## 5. Frontend Modules & File Layout

The implementation SHALL use the following layout inside `kryten_playlist/`:

- `kryten_playlist/web/templates/`
  - `base.html`
  - `login.html`
  - `index.html` (catalog + working playlist)
  - `playlists.html` (list)
  - `playlist_editor.html`
  - `apply.html`
  - `stats.html`
  - `partials/` (small fragments for list rows, errors)
- `kryten_playlist/web/static/`
  - `app.css`
  - `app.js`

**GUD-UI-003**: `app.js` SHALL be framework-less vanilla JS unless a library is justified solely for drag-and-drop.

## 6. Interaction Details (Implementation Requirements)

### 6.1 OTP Login

- `login.html` SHALL include:
  - username input
  - “Send OTP” button
  - OTP input + “Verify” button (shown after request)
  - status text area for errors

Behavior:
- On “Send OTP”: call `POST /api/v1/auth/otp/request`.
- On “Verify”: call `POST /api/v1/auth/otp/verify`.
- If response is `unrequested`:
  - Show prompt: “Did you request this OTP?”
  - Show “Block this IP for {default_block_hours} hours” action.
  - If user clicks: call `POST /api/v1/auth/ipblock` with `hours=default_block_hours`.

### 6.2 Catalog search

- Search input SHALL debounce keystrokes (default 150–250ms).
- Category filter SHALL allow multi-select (flat MTM categories).
- Each result row SHALL have “Add” button.

### 6.3 Working playlist + drag-and-drop

- Working playlist exists in browser state (client-side) until saved.
- Drag-and-drop requirement:
  - The UI SHALL use HTML5 drag-and-drop or a minimal library (e.g., SortableJS) to reorder items.
  - On reorder, update client-side list order immediately.

### 6.4 Save playlist

- “Save playlist” prompts for name.
- Submits `POST /api/v1/playlists` with item `video_id`s.
- On success, redirect to `/playlists/{playlist_id}`.

### 6.5 Saved playlists list + editor

- `/playlists` shows list.
- `/playlists/{id}` shows:
  - playlist name
  - list of items (reorderable)
  - save changes → `PUT /api/v1/playlists/{id}`
  - delete → `DELETE /api/v1/playlists/{id}`

Viewer restrictions:
- If role is viewer, disable/hide save/delete/reorder affordances.

### 6.6 Marathon builder

- Implemented as a section in `playlist_editor.html`.
- Source selection uses existing saved playlists.
- Preview button calls marathon preview endpoint.
- Preview list is reorderable before save.

### 6.7 Apply to queue

- `/apply` shows playlist dropdown and mode.
- `hard_replace` option is only shown if backend role allows.
- Apply calls `POST /api/v1/queue/apply`.
- If partial failures, show per-item failures.

### 6.8 Stats + likes

- Like current button calls `POST /api/v1/likes/current`.
- Top lists are read-only and only shown for privileged users.

## 7. Acceptance Criteria

- **AC-FE-001**: Given a blessed user, when they reorder items, then order is preserved on save and reload.
- **AC-FE-002**: Given a user types in search, results update within 300ms after pause.
- **AC-FE-003**: Given `unrequested` OTP verify response, UI shows confirmation and IP block option.
- **AC-FE-004**: Given viewer role, playlist edit controls are not available.

## 8. Test Automation Strategy

- Backend: integration tests cover API correctness.
- Frontend: minimal E2E smoke testing is optional; if implemented, it should validate:
  - OTP flow UI transitions
  - Search + add to working playlist
  - Reorder + save playlist

## 9. Rationale & Context

SSR + progressive enhancement reduces frontend build complexity while still enabling a modern UX (fast search, drag-and-drop, responsive interactions).

## 10. Dependencies & External Integrations

- **EXT-FE-001**: Jinja2 templating engine for FastAPI SSR.
- **EXT-FE-002** (optional): SortableJS (or similar) for drag-and-drop ordering.

## 11. Related Specifications / Further Reading

- [spec/prd.md](prd.md)
- [spec/spec-design-ui-workflows.md](spec-design-ui-workflows.md)
- [spec/spec-schema-http-api-and-auth.md](spec-schema-http-api-and-auth.md)
