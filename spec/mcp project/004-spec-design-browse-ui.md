---
title: Catalog Browser UI Specification
version: 1.0
date_created: 2025-12-18
owner: kryten-playlist
tags: [design, ui, frontend, browse, search]
---

# Introduction

This specification defines the catalog browser user interface for kryten-playlist. The UI enables moderators to search, filter, and browse the enriched video catalog, build working playlists, and push them to CyTube. The design prioritizes efficiency and bulk operations over discovery aesthetics.

## 1. Purpose & Scope

**Purpose**: Define the UI layout, components, interactions, and client-side behavior for the catalog browser.

**Scope**:
- Three-panel layout: filters, results, working playlist
- Search and filter controls
- Results display with enrichment metadata
- Working playlist management
- Push to queue controls
- Keyboard navigation and shortcuts

**Intended Audience**: Frontend developers implementing the UI.

**Assumptions**:
- Jinja2 templates with vanilla JavaScript (existing pattern)
- No frontend framework (React, Vue, etc.)
- CSS follows existing app.css patterns
- Modern browsers only (Chrome, Firefox, Edge)
- Desktop-first (mobile not in scope)

## 2. Definitions

| Term | Definition |
|------|------------|
| **Filter Panel** | Left sidebar with faceted filters |
| **Results Panel** | Center area showing search results |
| **Working Playlist Panel** | Right sidebar with items being built into playlist |
| **Facet** | Filter category with checkboxes (genre, mood, etc.) |
| **Chip** | Small tag/badge showing active filter or metadata |

## 3. Requirements, Constraints & Guidelines

### Functional Requirements

- **REQ-UI-001**: Page MUST display three-panel layout (filters | results | playlist)
- **REQ-UI-002**: Search input MUST trigger search after 300ms debounce
- **REQ-UI-003**: Filter changes MUST immediately update results
- **REQ-UI-004**: Results MUST show enrichment metadata (genre, mood, year, duration)
- **REQ-UI-005**: Clicking result row MUST show detail popover/modal
- **REQ-UI-006**: Checkbox selection MUST support Ctrl+Click and Shift+Click
- **REQ-UI-007**: "Add to Playlist" MUST add selected items to working playlist
- **REQ-UI-008**: Working playlist MUST support drag-and-drop reordering
- **REQ-UI-009**: Working playlist MUST display running total duration
- **REQ-UI-010**: Push button MUST offer mode dropdown (Append/Next/Replace)

### Non-Functional Requirements

- **REQ-UI-011**: Initial page load MUST complete in < 2 seconds
- **REQ-UI-012**: Filter/search updates MUST reflect in < 500ms (including API)
- **REQ-UI-013**: Drag-and-drop MUST feel responsive (< 16ms frame time)
- **REQ-UI-014**: UI MUST remain responsive with 200 items in results

### Constraints

- **CON-001**: No frontend build process; inline or static JS only
- **CON-002**: Must work without WebSocket (HTTP polling fallback for progress)
- **CON-003**: Limited to existing CSS variables and patterns

### Guidelines

- **GUD-001**: Use semantic HTML elements (button, input, select, etc.)
- **GUD-002**: Provide visual feedback for all async operations
- **GUD-003**: Use native drag-and-drop API (no library)
- **GUD-004**: Preserve scroll position during filter updates
- **GUD-005**: Use CSS Grid for main layout, Flexbox for components

### Patterns

- **PAT-001**: API calls via centralized `api(method, url, body)` function
- **PAT-002**: State management via module-level objects
- **PAT-003**: Event delegation for dynamic list items
- **PAT-004**: Template partials for reusable components

## 4. Interfaces & Data Contracts

### 4.1 Page Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ Header: kryten-playlist | Catalog | Playlists | Marathon | [Logout] │
├─────────────┬────────────────────────────────┬───────────────────────┤
│ FILTERS     │ RESULTS                        │ WORKING PLAYLIST      │
│             │                                │                       │
│ [Search...] │ ┌────────────────────────────┐ │ ┌───────────────────┐ │
│             │ │ □ The Exorcist (1973)      │ │ │ 1. Aliens (2h22m) │ │
│ ▼ Genre     │ │   Horror | dark | 2h 12m   │ │ │ 2. The Thing      │ │
│   □ Horror  │ ├────────────────────────────┤ │ │    (1h 49m)       │ │
│   □ Comedy  │ │ □ Aliens (1986)            │ │ │ 3. They Live      │ │
│   □ Sci-Fi  │ │   Sci-Fi | dark | 2h 22m   │ │ │    (1h 34m)       │ │
│             │ ├────────────────────────────┤ │ ├───────────────────┤ │
│ ▼ Mood      │ │ □ Young Frankenstein       │ │ │ Total: 5h 45m     │ │
│   □ dark    │ │   Comedy | comedic | 1h46m │ │ │ 3 items           │ │
│   □ comedic │ └────────────────────────────┘ │ ├───────────────────┤ │
│             │                                │ │ [Save] [Push ▼]   │ │
│ ▼ Era       │ Showing 1-50 of 767   [< >]    │ │ [Clear]           │ │
│             │ [Add Selected (3)]             │ └───────────────────┘ │
└─────────────┴────────────────────────────────┴───────────────────────┘
```

### 4.2 HTML Structure

```html
<div class="browse-layout">
  <!-- Left: Filters -->
  <aside class="filter-panel">
    <div class="search-box">
      <input type="text" data-search placeholder="Search titles, cast, directors..." />
      <button type="button" data-search-clear title="Clear">×</button>
    </div>
    
    <div class="filter-section" data-filter="type">
      <h3>Type</h3>
      <label><input type="radio" name="type" value="all" checked /> All</label>
      <label><input type="radio" name="type" value="movie" /> Movies <span class="count">3156</span></label>
      <label><input type="radio" name="type" value="tv" /> TV <span class="count">2309</span></label>
    </div>
    
    <div class="filter-section collapsible" data-filter="genre">
      <h3 class="toggle">Genre <span class="caret">▼</span></h3>
      <div class="filter-options">
        <!-- Populated dynamically -->
        <label><input type="checkbox" value="Horror" /> Horror <span class="count">767</span></label>
        <label><input type="checkbox" value="Comedy" /> Comedy <span class="count">1347</span></label>
      </div>
    </div>
    
    <div class="filter-section collapsible" data-filter="mood">
      <h3 class="toggle">Mood <span class="caret">▼</span></h3>
      <div class="filter-options"></div>
    </div>
    
    <div class="filter-section collapsible" data-filter="era">
      <h3 class="toggle">Era <span class="caret">▼</span></h3>
      <div class="filter-options"></div>
    </div>
    
    <div class="filter-section collapsible" data-filter="rating">
      <h3 class="toggle">Rating <span class="caret">▼</span></h3>
      <div class="filter-options"></div>
    </div>
    
    <button type="button" data-clear-filters>Clear All Filters</button>
  </aside>
  
  <!-- Center: Results -->
  <main class="results-panel">
    <div class="results-header">
      <span class="results-count">Showing <strong>1-50</strong> of <strong>767</strong></span>
      <div class="results-controls">
        <select data-sort>
          <option value="title_asc">Title A-Z</option>
          <option value="title_desc">Title Z-A</option>
          <option value="year_desc">Newest</option>
          <option value="year_asc">Oldest</option>
          <option value="duration_asc">Shortest</option>
          <option value="duration_desc">Longest</option>
          <option value="random">Random</option>
        </select>
        <select data-page-size>
          <option value="25">25</option>
          <option value="50" selected>50</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </select>
      </div>
    </div>
    
    <div class="results-list" data-results>
      <!-- Result items rendered dynamically -->
    </div>
    
    <div class="results-footer">
      <div class="bulk-actions">
        <button type="button" data-select-all>Select All</button>
        <button type="button" data-add-selected disabled>Add Selected (<span>0</span>)</button>
      </div>
      <div class="pagination">
        <button type="button" data-page="prev" disabled>← Prev</button>
        <span class="page-info">Page <strong>1</strong> of <strong>16</strong></span>
        <button type="button" data-page="next">Next →</button>
      </div>
    </div>
  </main>
  
  <!-- Right: Working Playlist -->
  <aside class="playlist-panel">
    <div class="playlist-header">
      <h2>Working Playlist</h2>
      <span class="playlist-source" data-source></span>
    </div>
    
    <ul class="playlist-items" data-playlist>
      <!-- Playlist items rendered dynamically, draggable -->
    </ul>
    
    <div class="playlist-summary">
      <span><strong data-item-count>0</strong> items</span>
      <span><strong data-total-duration>0m</strong></span>
    </div>
    
    <div class="playlist-actions">
      <button type="button" data-save-playlist>Save</button>
      <div class="push-dropdown">
        <button type="button" data-push-playlist>Push to Queue</button>
        <select data-push-mode>
          <option value="next">Next</option>
          <option value="append">Append</option>
          <option value="replace">Replace (Admin)</option>
        </select>
      </div>
      <button type="button" data-clear-playlist>Clear</button>
    </div>
    
    <div class="playlist-load">
      <select data-load-playlist>
        <option value="">Load saved playlist...</option>
      </select>
    </div>
  </aside>
</div>

<!-- Item detail modal -->
<dialog class="item-detail-modal" data-detail-modal>
  <button type="button" class="close" data-close>×</button>
  <div class="detail-content"></div>
</dialog>

<!-- Push progress modal -->
<dialog class="push-progress-modal" data-push-modal>
  <h3>Pushing to Queue...</h3>
  <progress data-progress max="100" value="0"></progress>
  <p><span data-current>0</span> / <span data-total>0</span> items</p>
  <ul class="push-log" data-push-log></ul>
  <button type="button" data-cancel>Cancel</button>
</dialog>
```

### 4.3 Result Item Template

```html
<div class="result-item" data-video-id="abc123">
  <input type="checkbox" class="select-checkbox" />
  <div class="item-content" role="button" tabindex="0">
    <div class="item-main">
      <span class="item-title">The Exorcist</span>
      <span class="item-year">(1973)</span>
      <span class="item-badge tv" hidden>TV</span>
    </div>
    <div class="item-meta">
      <span class="chip genre">Horror</span>
      <span class="chip mood">dark</span>
      <span class="item-duration">2h 12m</span>
    </div>
  </div>
  <button type="button" class="add-btn" title="Add to playlist">+</button>
</div>
```

### 4.4 Playlist Item Template

```html
<li class="playlist-item" data-video-id="abc123" draggable="true">
  <span class="drag-handle">⋮⋮</span>
  <span class="item-position">1.</span>
  <div class="item-info">
    <span class="item-title">Aliens</span>
    <span class="item-duration">2h 22m</span>
  </div>
  <button type="button" class="remove-btn" title="Remove">×</button>
</li>
```

### 4.5 CSS Classes

```css
/* Layout */
.browse-layout {
  display: grid;
  grid-template-columns: 250px 1fr 300px;
  gap: 16px;
  height: calc(100vh - 60px);  /* Below header */
  padding: 16px;
}

/* Filter Panel */
.filter-panel {
  overflow-y: auto;
  padding-right: 8px;
}

.filter-section {
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 12px;
}

.filter-section.collapsible .filter-options {
  max-height: 200px;
  overflow-y: auto;
}

.filter-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  cursor: pointer;
}

.filter-options .count {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 0.85em;
}

/* Results */
.results-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.results-list {
  flex: 1;
  overflow-y: auto;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.1s;
}

.result-item:hover {
  background: var(--hover-bg);
}

.result-item.selected {
  background: var(--selected-bg);
}

.chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  background: var(--chip-bg);
}

.chip.genre { background: var(--genre-color); }
.chip.mood { background: var(--mood-color); }

/* Playlist Panel */
.playlist-panel {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-color);
  padding-left: 16px;
}

.playlist-items {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  padding: 0;
  margin: 0;
}

.playlist-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid var(--border-light);
  cursor: grab;
}

.playlist-item.dragging {
  opacity: 0.5;
  background: var(--drag-bg);
}

.playlist-item.drag-over {
  border-top: 2px solid var(--primary-color);
}

.drag-handle {
  cursor: grab;
  color: var(--text-muted);
}
```

### 4.6 JavaScript State

```javascript
// Module state
const state = {
  // Filters
  filters: {
    q: '',
    genre: [],
    mood: [],
    era: [],
    rating: [],
    is_tv: null,  // null = all, true = TV, false = movies
  },
  
  // Pagination
  pagination: {
    offset: 0,
    limit: 50,
    total: 0,
    sort: 'title_asc',
  },
  
  // Results
  results: [],          // Current page of results
  selectedIds: new Set(), // Selected video_ids
  
  // Working playlist
  playlist: {
    items: [],           // Array of playlist items with metadata
    sourceId: null,      // If loaded from saved playlist
    isDirty: false,      // Has unsaved changes
  },
  
  // Facets (for counts)
  facets: {
    genre: [],
    mood: [],
    era: [],
    rating: [],
  },
  
  // Saved playlists (for dropdown)
  savedPlaylists: [],
};

// Actions
async function search() {
  const params = new URLSearchParams();
  if (state.filters.q) params.set('q', state.filters.q);
  state.filters.genre.forEach(g => params.append('genre', g));
  state.filters.mood.forEach(m => params.append('mood', m));
  state.filters.era.forEach(e => params.append('era', e));
  state.filters.rating.forEach(r => params.append('rating', r));
  if (state.filters.is_tv !== null) params.set('is_tv', state.filters.is_tv);
  params.set('limit', state.pagination.limit);
  params.set('offset', state.pagination.offset);
  params.set('sort', state.pagination.sort);
  
  const data = await api('GET', `/api/v1/catalog/search?${params}`);
  state.results = data.items;
  state.pagination.total = data.total;
  renderResults();
}

async function loadFacets() {
  const params = new URLSearchParams();
  // Same filters as search
  if (state.filters.q) params.set('q', state.filters.q);
  state.filters.genre.forEach(g => params.append('genre', g));
  // ... etc
  
  const data = await api('GET', `/api/v1/catalog/facets?${params}`);
  state.facets = data;
  renderFacets();
}
```

### 4.7 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` or `Ctrl+K` | Focus search input |
| `Escape` | Clear search / close modal |
| `Ctrl+A` | Select all visible results |
| `Ctrl+Shift+A` | Deselect all |
| `Enter` | Add selected to playlist |
| `Delete` | Remove selected from playlist |
| `Ctrl+S` | Save playlist |
| `Ctrl+Shift+P` | Push to queue |

```javascript
document.addEventListener('keydown', (e) => {
  // Focus search
  if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
    e.preventDefault();
    document.querySelector('[data-search]').focus();
    return;
  }
  
  // Select all
  if (e.ctrlKey && e.key === 'a' && !e.shiftKey) {
    if (document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      selectAllVisible();
    }
  }
  
  // Save playlist
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    savePlaylist();
  }
});
```

### 4.8 Drag and Drop

```javascript
function initDragAndDrop() {
  const list = document.querySelector('[data-playlist]');
  let dragItem = null;
  
  list.addEventListener('dragstart', (e) => {
    if (!e.target.classList.contains('playlist-item')) return;
    dragItem = e.target;
    dragItem.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  
  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    const target = e.target.closest('.playlist-item');
    if (!target || target === dragItem) return;
    
    // Clear previous indicators
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    
    // Show drop indicator
    const rect = target.getBoundingClientRect();
    const insertBefore = e.clientY < rect.top + rect.height / 2;
    target.classList.add('drag-over');
    target.dataset.insertBefore = insertBefore;
  });
  
  list.addEventListener('drop', (e) => {
    e.preventDefault();
    const target = e.target.closest('.playlist-item');
    if (!target || !dragItem) return;
    
    const fromIndex = getItemIndex(dragItem);
    const toIndex = getItemIndex(target);
    
    // Update state
    const [item] = state.playlist.items.splice(fromIndex, 1);
    const insertAt = target.dataset.insertBefore === 'true' ? toIndex : toIndex + 1;
    state.playlist.items.splice(insertAt > fromIndex ? insertAt - 1 : insertAt, 0, item);
    state.playlist.isDirty = true;
    
    renderPlaylist();
  });
  
  list.addEventListener('dragend', () => {
    if (dragItem) dragItem.classList.remove('dragging');
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    dragItem = null;
  });
}
```

## 5. Acceptance Criteria

- **AC-001**: Given page load, Then filter panel shows facets with counts
- **AC-002**: Given text in search, Then results update after 300ms
- **AC-003**: Given filter checkbox clicked, Then results update immediately
- **AC-004**: Given multiple filters active, Then counts update to reflect filtered set
- **AC-005**: Given result row clicked, Then detail modal shows full metadata
- **AC-006**: Given items selected, Then "Add Selected" button shows count
- **AC-007**: Given "Add to Playlist" clicked, Then items appear in working playlist
- **AC-008**: Given playlist item dragged, Then order updates visually and in state
- **AC-009**: Given "Save" clicked, Then save modal appears for name input
- **AC-010**: Given "Push" clicked, Then progress modal shows push status

## 6. Test Automation Strategy

- **Test Levels**: Manual testing for UI, unit tests for state logic
- **Frameworks**: Manual testing checklist, Jest for JS unit tests (if added)
- **Test Data**: Catalog with diverse metadata for visual testing
- **Key Test Cases**:
  - Filter combination behavior
  - Keyboard shortcut functionality
  - Drag-and-drop edge cases
  - Large result set performance (200 items)
  - Modal focus trapping

## 7. Rationale & Context

The three-panel layout mirrors common bulk-selection UIs (email clients, file managers). Users can see filters, results, and their working selection simultaneously without context switching.

Vanilla JavaScript was chosen to:
1. Maintain consistency with existing codebase
2. Avoid build process complexity
3. Keep bundle size minimal for fast loads

## 8. Dependencies & External Integrations

### Infrastructure Dependencies

- **INF-001**: FastAPI backend with enhanced catalog API
- **INF-002**: Static file serving for CSS/JS

### Technology Platform Dependencies

- **PLT-001**: Modern browsers with native drag-and-drop API
- **PLT-002**: CSS Grid and Flexbox support

## 9. Examples & Edge Cases

### Example: Multi-Select Flow

1. User searches "alien"
2. 15 results appear
3. User clicks first result checkbox
4. User Shift+clicks fifth result → items 1-5 selected
5. User Ctrl+clicks item 3 → item 3 deselected
6. "Add Selected (4)" button shows count
7. User clicks "Add Selected"
8. 4 items appear in working playlist

### Edge Cases

1. **Empty search results**: Show "No items match your filters" message
2. **All filters cleared**: Show all items, facets show full catalog counts
3. **Playlist at 500 items**: Disable add buttons, show warning
4. **Network error during search**: Show error toast, preserve previous results
5. **Unsaved changes + page navigation**: Show confirmation dialog
6. **Very long title**: Truncate with ellipsis, show full on hover

## 10. Validation Criteria

- [ ] Search debounces correctly (300ms)
- [ ] Multi-select with Ctrl+Click and Shift+Click works
- [ ] Drag-and-drop reorders correctly
- [ ] Duration sums update on add/remove
- [ ] Keyboard shortcuts work without conflicts
- [ ] Modal focus is properly trapped
- [ ] Page remains responsive with 200 result items

## 11. Related Specifications / Further Reading

- [PRD: Catalog Browser and Playlist Management](../docs/prd-catalog-browser.md)
- [spec-design-catalog-api.md](spec-design-catalog-api.md) - API endpoints consumed
- [spec-design-playlist-builder.md](spec-design-playlist-builder.md) - Playlist state management
- [spec-design-queue-push.md](spec-design-queue-push.md) - Push modal behavior
- [Existing app.js](../kryten_playlist/web/static/app.js) - Current patterns
