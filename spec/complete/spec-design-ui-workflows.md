---
title: UI Workflow Specification for Kryten Playlist Web Interface
version: 0.1
date_created: 2025-12-18
last_updated: 2025-12-18
owner: kryten
tags: [design, ui, workflows]
---

# Introduction

This specification defines the required UI workflows for the `kryten-playlist` web interface, aligned to the PRD. The UI is “modern and dynamic” but must not add extra pages or features beyond what is described.

## 1. Purpose & Scope

**Purpose**: Provide explicit UX flows and screen requirements that map to backend endpoints.

**Scope**: Screens, primary interactions, and state transitions.

## 2. Definitions

- **Working playlist**: An in-progress list not yet saved.
- **Saved playlist**: Persisted named list.
- **Marathon preview**: Generated order preview prior to saving/applying.

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: UI shall provide OTP login via Cytube username + OTP entry.
- **REQ-002**: UI shall provide catalog search by title and filter by categories.
- **REQ-003**: UI shall allow building a working playlist from search results.
- **REQ-004**: UI shall allow drag-and-drop reorder of the working playlist and playlist editor.
- **REQ-005**: UI shall support saved playlist CRUD.
- **REQ-006**: UI shall support marathon generation: concatenate/shuffle/interleave with pattern input and preview.
- **REQ-007**: UI shall allow applying a saved playlist to Cytube queue in modes: Preserve-current, Append, Hard-replace (shown only when allowed).
- **REQ-008**: UI shall provide a minimal view for statistics (top played/top liked) for privileged users.
- **REQ-009**: UI shall allow any authenticated user to “Like current item”.
- **CON-001**: UI shall not add features beyond the PRD (no extra dashboards, no unrelated views).

## 4. Interfaces & Data Contracts

UI shall use the HTTP API defined in `spec-schema-http-api-and-auth`.

## 5. Acceptance Criteria

### Screen A: Login (OTP)

- **AC-UI-001**: Given user enters username and clicks “Send OTP”, when request succeeds, then UI shows OTP input and expiry countdown.
- **AC-UI-002**: Given user enters OTP incorrectly 3 times, then UI shows “locked” and requires new OTP request.
- **AC-UI-003**: Given server responds `unrequested`, then UI asks “Did you request this OTP?” and shows button “Block this IP for 72 hours” (configurable duration shown).

### Screen B: Catalog Search + Working Playlist

Layout regions:
- Search input + category filter
- Results list with “Add” action
- Working playlist panel

- **AC-UI-010**: Search results update when user types and/or changes category filters.
- **AC-UI-011**: User can add items to working playlist from results.
- **AC-UI-012**: User can reorder working playlist via drag-and-drop.
- **AC-UI-013**: User can remove items from working playlist.
- **AC-UI-014**: User can save working playlist as a named playlist.

### Screen C: Saved Playlists

- List saved playlists
- Select playlist → open editor

- **AC-UI-020**: Viewer can open and view saved playlists but cannot edit/save/delete.
- **AC-UI-021**: Blessed/admin can edit, reorder, and save changes.
- **AC-UI-022**: Blessed/admin can delete a playlist with confirmation.

### Screen D: Marathon Builder (within Saved Playlists flow)

Inputs:
- Source selection (2+ playlists)
- Method selection: concatenate/shuffle/interleave
- Interleave pattern input (enabled only for interleave)
- Preserve episode order toggle
- Preview area

- **AC-UI-030**: User can preview the generated marathon order.
- **AC-UI-031**: User can reorder the preview order manually.
- **AC-UI-032**: User can save the preview as a new named playlist.

### Screen E: Apply to Queue

- Select saved playlist
- Mode selection
- Apply button

- **AC-UI-040**: Preserve-current and Append are visible to blessed/admin.
- **AC-UI-041**: Hard-replace is visible only to admins (unless enabled for blessed by config).
- **AC-UI-042**: On apply, UI shows per-item failures if any.

### Screen F: Stats + Likes

- “Like current” button
- Top played list
- Top liked list

- **AC-UI-050**: Any authenticated user can click “Like current”.
- **AC-UI-051**: Privileged users can view top played/top liked lists.

## 6. Test Automation Strategy

- Playwright or equivalent E2E tests for login, search, save playlist, marathon preview, apply to queue.

## 7. Rationale & Context

- UI consolidates features into minimal set of screens to avoid scope creep.

## 8. Dependencies & External Integrations

- HTTP API server.

## 9. Examples & Edge Cases

```text
Edge case: Catalog refresh mid-session
- UI continues using current snapshot id until reload or explicit refresh.

Edge case: Interleave pattern invalid
- UI shows server-provided validation error and example patterns.
```

## 10. Validation Criteria

- All required flows map to API endpoints.
- RBAC correctly hides/disables disallowed actions.

## 11. Related Specifications / Further Reading

- [spec/prd.md](prd.md)
- [spec/spec-schema-http-api-and-auth.md](spec-schema-http-api-and-auth.md)
