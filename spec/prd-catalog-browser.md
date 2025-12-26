# PRD: Catalog Browser and Playlist Management

Version: 1.0

## 1. Product overview

### 1.1 Document title and version

PRD: Catalog Browser and Playlist Management
Version: 1.0

### 1.2 Product summary

The Catalog Browser is a web-based interface for browsing, searching, and managing a fully-enriched video catalog of 5,465+ items (movies and TV episodes). It enables channel moderators to efficiently discover content using rich metadata (genre, mood, era, director, cast, tags), build playlists, and push them directly to a CyTube channel queue.

The system leverages LLM-enriched catalog data including synopsis, cast lists, directors, genre classifications, mood tags, and era designations to provide powerful filtering and discovery capabilities. The primary workflow is: **Browse → Select → Build Playlist → Push to CyTube**.

## 2. Goals

### 2.1 Business goals

- Enable rapid playlist creation using rich metadata instead of manual title searching
- Reduce time to build themed programming blocks (e.g., "80s horror night") from hours to minutes
- Provide a persistent library of reusable playlists for recurring programming schedules
- Streamline weekly programming management (e.g., Monday morning playlist push for the week)

### 2.2 User goals

- Find content quickly using multiple filter dimensions (genre + mood + era + director)
- Build playlists by selecting items from search results with minimal clicks
- Reorder, edit, and save playlists for future use
- Push playlists directly to CyTube queue with correct episode ordering
- Manage bulk operations efficiently (select all matching, add range, remove duplicates)

### 2.3 Non-goals

- Dynamic/smart playlists that auto-update based on saved queries (future consideration)
- Multi-channel management from single interface (architecture supports but not in scope)
- Public-facing catalog browsing (moderator-only access)
- Video playback or preview within the interface
- Automated scheduling (e.g., "push this playlist every Monday at 9am")

## 3. User personas

### 3.1 Key user types

- Channel Moderators: Primary users who curate and manage video content for the CyTube channel
- Channel Admins: Moderators with additional permissions (hard queue replacement)

### 3.2 Basic persona details

- **Mod Mike**: A regular moderator who builds themed movie nights. Knows what mood he wants ("dark 80s sci-fi") but doesn't remember exact titles. Needs fast filtering and bulk selection.

- **Admin Alice**: The channel owner who sets up weekly programming. Creates master playlists for weekday rotations and pushes them Monday mornings. Needs playlist management and organization.

### 3.3 Role-based access

- **Blessed User**: Can browse catalog, create/edit playlists, push to queue (append/next modes)
- **Admin**: All blessed permissions plus hard queue replacement (clears existing queue)

## 4. Functional requirements

### 4.1 Enhanced catalog API (Priority: High)

- Expose all enriched fields in search results: genre, mood, era, director, cast, synopsis, content rating, tags
- Support multi-value filtering: genre=Horror&genre=Comedy (OR within field)
- Support cross-field filtering: genre=Horror&mood=comedic&era=1980s (AND across fields)
- Full-text search across title, synopsis, cast, director using FTS5
- Return facet counts for active filters (e.g., "Horror: 767 items, Comedy: 1347 items")
- Pagination with configurable page size (25, 50, 100, 200)
- Sort options: title (A-Z), year (newest/oldest), duration (shortest/longest), random

### 4.2 Catalog item detail (Priority: Medium)

- Single-item endpoint returning full enriched metadata
- Include all tags associated with item
- Include related items (same director, same franchise, same cast)

### 4.3 Faceted browse (Priority: High)

- Aggregated counts for: genre, mood, era, content rating, is_tv
- Dynamic facet updates as filters are applied
- Top N tags with counts
- Director/cast facets (top 20 by item count)

### 4.4 Playlist builder (Priority: High)

- Add individual items from search results
- Add all visible results (respecting current filters)
- Remove items individually or in bulk
- Reorder via drag-and-drop
- Duplicate detection with optional auto-removal
- Clear playlist
- Playlist duration calculation (total runtime)

### 4.5 Playlist persistence (Priority: High)

- Save playlist with name and optional description
- Update existing playlist
- Delete playlist
- List all playlists with metadata (name, item count, total duration, last modified)
- Duplicate/clone playlist

### 4.6 CyTube queue integration (Priority: Critical)

- Push playlist to CyTube queue as temporary items
- Queue modes:
  - **Append**: Add to end of current queue
  - **Next**: Insert after currently playing item (requires reverse-order push)
  - **Replace**: Clear queue and add playlist (admin only)
- Automatic reverse-order handling for "next" mode (LIFO compensation)
- Progress feedback during push (X of Y items queued)
- Error handling for failed queue additions

### 4.7 TV series handling (Priority: High)

- Filter to TV-only or Movies-only
- Group episodes by series
- Select entire series or specific seasons
- Maintain episode order within selection (S01E01 before S01E02)
- "Add Season X" quick action

## 5. User experience

### 5.1 Entry points and first-time user flow

- User logs in via existing OTP authentication
- Lands on catalog browser as default home page
- Empty working playlist panel on right side
- Filter panel on left, results in center
- Brief tooltip hints for first-time users (dismissable)

### 5.2 Core experience

- **Filter Panel**: Collapsible sidebar with genre, mood, era, rating, type (TV/Movie) filters. Each filter shows count of matching items. Multi-select within each category.

- **Search Bar**: Full-text search across all enriched fields. Instant results as user types (debounced 300ms).

- **Results Grid**: Compact list view showing title, year, genre, mood, duration. Checkbox for selection. Click row to see detail popover.

- **Working Playlist**: Right panel showing current playlist being built. Drag to reorder. Shows running total duration.

- **Action Bar**: Save, Push to Queue, Clear buttons. Push has dropdown for mode selection (Append/Next/Replace).

### 5.3 Advanced features and edge cases

- Keyboard shortcuts: Ctrl+A (select all visible), Ctrl+Click (add to selection), Shift+Click (range select)
- Bulk add: "Add all X matching items" button
- Episode ordering: When adding TV content via "Next" mode, system automatically reverses order to compensate for LIFO queue behavior
- Duplicate handling: Warning when adding item already in playlist, option to skip or allow
- Large playlist warning: Confirmation when pushing 50+ items

### 5.4 UI/UX highlights

- Compact, information-dense list view optimized for efficiency
- Persistent filter state during session
- Keyboard-navigable result list
- Inline duration display (both per-item and playlist total)
- Visual distinction between movies and TV episodes
- "Loading" states for all async operations

## 6. Narrative

Mike opens the catalog browser on Friday afternoon to set up Saturday's horror movie night. He clicks "Horror" in the genre filter, sees 767 items. He adds "comedic" mood—now 47 items. He scans the list, clicks a few favorites, and uses Ctrl+Click to multi-select. With 6 movies chosen, he drags them into his preferred order, checks the total runtime (8h 23m—perfect for an overnight marathon), and saves as "Saturday Horror Comedy Night."

Saturday evening, Mike opens his saved playlist, clicks "Push to Queue" → "Next", and watches as all 6 movies queue up in the correct order right after the currently playing video. The room is set for the night.

## 7. Success metrics

### 7.1 User-centric metrics

- Time to build a 10-item themed playlist: target < 3 minutes
- Successful queue push rate: target > 99%
- Filter-to-selection clicks: target < 5 clicks to first item added

### 7.2 Business metrics

- Playlist reuse rate: target > 50% of pushes use saved playlists
- Weekly active playlist creators: target 80% of moderators

### 7.3 Technical metrics

- Search response time: < 200ms for filtered queries
- Facet calculation time: < 100ms
- Queue push time: < 500ms per item
- API error rate: < 0.1%

## 8. Technical considerations

### 8.1 Integration points

- **SQLite catalog database**: Primary data store with FTS5 for search
- **NATS KV**: Playlist persistence (existing infrastructure)
- **CyTube via kryten-py**: Queue manipulation via NATS message bus
- **FastAPI backend**: Existing web framework, extend with new endpoints
- **Jinja2 templates + vanilla JS**: Existing frontend pattern, extend

### 8.2 Data storage and privacy

- All data stored locally (SQLite + NATS KV)
- No external API calls for browse/search operations
- Playlist ownership tracked by creator username
- No PII beyond CyTube usernames

### 8.3 Scalability and performance

- Catalog size: ~5,500 items (current), design for 50,000+
- Concurrent users: < 15 (moderator team)
- FTS5 indexing for sub-200ms search
- Facet aggregations via SQL GROUP BY (cached if needed)
- Pagination to limit response sizes

### 8.4 Potential challenges

- **LIFO queue behavior**: CyTube's "queue next" creates reverse ordering; must push items in reverse to achieve correct playback order
- **FTS5 sync**: Triggers maintain FTS index; bulk updates may need optimization
- **Large playlist push**: 100+ items pushed sequentially; need progress feedback and error recovery
- **Tag normalization**: 3,342 LLM-generated tags may have duplicates/near-duplicates; consider consolidation

## 9. Milestones and sequencing

### 9.1 Project estimate

Medium: 2-3 weeks for full implementation

### 9.2 Team size and composition

Solo developer with AI assistance

### 9.3 Suggested phases

**Phase 1: Enhanced Catalog API** (3-4 days)
- Extend CatalogItemOut schema with enriched fields
- Add filter parameters to search endpoint
- Implement facets endpoint
- Add item detail endpoint
- Update CatalogRepository with new query methods

**Phase 2: Browse UI** (3-4 days)
- Filter panel component with multi-select
- Results list with enrichment display
- Search bar with debounced FTS
- Facet count display
- Pagination controls

**Phase 3: Playlist Builder UI** (2-3 days)
- Working playlist panel
- Add/remove/reorder functionality
- Duration calculation
- Duplicate detection
- Keyboard shortcuts

**Phase 4: CyTube Integration** (2-3 days)
- Queue push with mode selection
- Reverse-order handling for "next" mode
- Progress feedback
- Error handling and retry

**Phase 5: Polish and Testing** (2-3 days)
- Keyboard navigation
- Loading states
- Error messages
- Edge case handling
- Integration testing

## 10. User stories

### 10.1 Search catalog with text query

- **ID**: CB-001
- **Description**: As a moderator, I want to search the catalog by typing keywords so that I can find specific titles, actors, or directors quickly.
- **Acceptance criteria**:
  - Search input field is visible on catalog browse page
  - Typing triggers search after 300ms debounce
  - Results include matches in title, synopsis, cast, and director fields
  - Matching terms are highlighted in results
  - Empty search shows all items (respecting other filters)

### 10.2 Filter by genre

- **ID**: CB-002
- **Description**: As a moderator, I want to filter the catalog by genre so that I can find all horror movies or all comedies.
- **Acceptance criteria**:
  - Genre filter displays all available genres with item counts
  - Selecting a genre filters results to only items with that genre
  - Multiple genres can be selected (OR logic within genre)
  - Genre counts update when other filters are applied
  - Deselecting all genres shows all items

### 10.3 Filter by mood

- **ID**: CB-003
- **Description**: As a moderator, I want to filter by mood (dark, comedic, uplifting) so that I can curate content matching a desired atmosphere.
- **Acceptance criteria**:
  - Mood filter displays available moods with counts
  - Selecting a mood filters to items with that mood
  - Mood filter combines with other filters (AND logic)
  - "dark" + "Horror" shows dark horror films only

### 10.4 Filter by era

- **ID**: CB-004
- **Description**: As a moderator, I want to filter by era (1980s, 2010s, classic) so that I can build decade-themed programming.
- **Acceptance criteria**:
  - Era filter displays available eras with counts
  - Era represents the period/decade of content
  - Combines with genre and mood filters

### 10.5 Filter by content type

- **ID**: CB-005
- **Description**: As a moderator, I want to filter between movies and TV episodes so that I can focus on one content type.
- **Acceptance criteria**:
  - Toggle or dropdown for: All, Movies Only, TV Only
  - TV filter includes all episodes from all series
  - Counts update to reflect filter

### 10.6 View faceted counts

- **ID**: CB-006
- **Description**: As a moderator, I want to see how many items match each filter value so that I can understand the catalog composition.
- **Acceptance criteria**:
  - Each filter option shows count of matching items
  - Counts update dynamically as filters are applied
  - Zero-count options are shown but visually de-emphasized

### 10.7 View item details

- **ID**: CB-007
- **Description**: As a moderator, I want to click an item to see its full details so that I can make informed selection decisions.
- **Acceptance criteria**:
  - Clicking item row opens detail panel/modal
  - Detail shows: title, year, synopsis, cast, director, genre, mood, era, rating, duration, tags
  - "Add to Playlist" button in detail view
  - Close detail to return to results

### 10.8 Add item to working playlist

- **ID**: CB-008
- **Description**: As a moderator, I want to add items from search results to my working playlist so that I can build a custom queue.
- **Acceptance criteria**:
  - "Add" button or checkbox on each result row
  - Added items appear in working playlist panel
  - Visual feedback confirms addition
  - Item cannot be added twice (duplicate detection)

### 10.9 Add multiple items at once

- **ID**: CB-009
- **Description**: As a moderator, I want to select multiple items and add them all at once so that I can build playlists faster.
- **Acceptance criteria**:
  - Checkbox column for multi-select
  - "Add Selected" button adds all checked items
  - Ctrl+A selects all visible results
  - Shift+Click for range selection

### 10.10 Remove item from working playlist

- **ID**: CB-010
- **Description**: As a moderator, I want to remove items from my working playlist so that I can refine my selection.
- **Acceptance criteria**:
  - Remove button (X) on each playlist item
  - Item is removed immediately
  - Bulk remove selected items option

### 10.11 Reorder working playlist

- **ID**: CB-011
- **Description**: As a moderator, I want to drag items to reorder my playlist so that content plays in my preferred sequence.
- **Acceptance criteria**:
  - Drag handle on each playlist item
  - Drag-and-drop reordering works smoothly
  - Order is reflected in save and push operations

### 10.12 View playlist duration

- **ID**: CB-012
- **Description**: As a moderator, I want to see the total runtime of my playlist so that I can plan programming blocks.
- **Acceptance criteria**:
  - Each item shows individual duration
  - Playlist footer shows total duration (HH:MM format)
  - Duration updates as items are added/removed

### 10.13 Save playlist

- **ID**: CB-013
- **Description**: As a moderator, I want to save my working playlist with a name so that I can reuse it later.
- **Acceptance criteria**:
  - "Save" button prompts for playlist name
  - Name must be unique (error if duplicate)
  - Saved playlist appears in playlists list
  - Success confirmation shown

### 10.14 Load saved playlist

- **ID**: CB-014
- **Description**: As a moderator, I want to load a saved playlist into my working area so that I can modify or push it.
- **Acceptance criteria**:
  - Playlists list shows all saved playlists
  - Clicking playlist loads it into working area
  - Warning if working playlist has unsaved changes

### 10.15 Update saved playlist

- **ID**: CB-015
- **Description**: As a moderator, I want to update an existing playlist with my changes so that I don't have to recreate it.
- **Acceptance criteria**:
  - "Update" option when working playlist was loaded from saved
  - Overwrites existing playlist content
  - Preserves playlist ID and metadata

### 10.16 Delete saved playlist

- **ID**: CB-016
- **Description**: As a moderator, I want to delete saved playlists I no longer need so that the list stays manageable.
- **Acceptance criteria**:
  - Delete button on playlist list
  - Confirmation prompt before deletion
  - Playlist removed from list after confirmation

### 10.17 Push playlist to CyTube queue (append)

- **ID**: CB-017
- **Description**: As a moderator, I want to push my playlist to the CyTube queue (appending to end) so that content plays after current queue.
- **Acceptance criteria**:
  - "Push to Queue" button with mode selector
  - "Append" mode adds items to end of queue
  - Items pushed as temporary queue items
  - Progress indicator during push
  - Success/error feedback

### 10.18 Push playlist to CyTube queue (next)

- **ID**: CB-018
- **Description**: As a moderator, I want to push my playlist to play next so that content plays immediately after current video.
- **Acceptance criteria**:
  - "Next" mode inserts after currently playing
  - System automatically reverses item order before push (LIFO compensation)
  - Final queue order matches playlist order
  - Works correctly for both single items and multi-item playlists

### 10.19 Replace CyTube queue (admin only)

- **ID**: CB-019
- **Description**: As an admin, I want to replace the entire queue with my playlist so that I can reset programming.
- **Acceptance criteria**:
  - "Replace" mode only available to admins
  - Confirmation prompt warns about queue clear
  - Existing queue is cleared before push
  - New playlist items become the entire queue

### 10.20 Browse TV series

- **ID**: CB-020
- **Description**: As a moderator, I want to browse TV content grouped by series so that I can easily find and add full seasons.
- **Acceptance criteria**:
  - TV filter shows series with episode counts
  - Expanding series shows seasons
  - Expanding season shows episodes in order
  - "Add Season" adds all episodes in correct order

### 10.21 Add TV season to playlist

- **ID**: CB-021
- **Description**: As a moderator, I want to add an entire TV season at once so that I don't have to select episodes individually.
- **Acceptance criteria**:
  - "Add Season X" button on season row
  - All episodes added in episode order (S01E01, S01E02, etc.)
  - Episodes appear in correct order in working playlist

### 10.22 Search by director

- **ID**: CB-022
- **Description**: As a moderator, I want to search or filter by director so that I can build director retrospectives.
- **Acceptance criteria**:
  - Director appears in search results
  - Director filter/facet shows directors with item counts
  - Selecting director filters to their filmography

### 10.23 Search by cast member

- **ID**: CB-023
- **Description**: As a moderator, I want to search by actor name so that I can find all movies featuring that person.
- **Acceptance criteria**:
  - Actor names searchable via text search
  - Results include all items where actor is in cast

### 10.24 Sort search results

- **ID**: CB-024
- **Description**: As a moderator, I want to sort results by different criteria so that I can organize my browsing.
- **Acceptance criteria**:
  - Sort dropdown with options: Title A-Z, Title Z-A, Year (Newest), Year (Oldest), Duration (Shortest), Duration (Longest), Random
  - Sort persists during session
  - Random option shuffles results

### 10.25 Paginate search results

- **ID**: CB-025
- **Description**: As a moderator, I want to paginate through large result sets so that the interface remains responsive.
- **Acceptance criteria**:
  - Page size selector: 25, 50, 100, 200
  - Previous/Next page navigation
  - Page X of Y indicator
  - Jump to first/last page

### 10.26 Clear working playlist

- **ID**: CB-026
- **Description**: As a moderator, I want to clear my working playlist so that I can start fresh.
- **Acceptance criteria**:
  - "Clear" button on working playlist
  - Confirmation prompt if playlist has items
  - Playlist emptied after confirmation

### 10.27 Duplicate playlist

- **ID**: CB-027
- **Description**: As a moderator, I want to duplicate an existing playlist so that I can create variations without modifying the original.
- **Acceptance criteria**:
  - "Duplicate" option on saved playlist
  - Creates copy with name "Copy of [Original Name]"
  - New playlist appears in list

### 10.28 Handle push errors gracefully

- **ID**: CB-028
- **Description**: As a moderator, I want clear feedback when queue push fails so that I can understand and resolve issues.
- **Acceptance criteria**:
  - Error message identifies which item(s) failed
  - Option to retry failed items
  - Successful items remain in queue
  - Partial success clearly communicated

### 10.29 Filter by content rating

- **ID**: CB-029
- **Description**: As a moderator, I want to filter by content rating (PG, R, TV-MA) so that I can curate age-appropriate programming.
- **Acceptance criteria**:
  - Rating filter shows available ratings with counts
  - Filter restricts results to selected rating(s)
  - Combines with other filters

### 10.30 Filter by tags

- **ID**: CB-030
- **Description**: As a moderator, I want to filter by LLM-generated tags so that I can find thematically similar content.
- **Acceptance criteria**:
  - Tag filter shows most common tags with counts
  - Tag search/autocomplete for finding specific tags
  - Selecting tag filters results
  - Multiple tags can be combined
