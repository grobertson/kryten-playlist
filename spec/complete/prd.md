## PRD: Kryten Playlist + MediaCMS Catalog

## 1. Product overview

### 1.1 Document title and version

* PRD: Kryten Playlist + MediaCMS Catalog
* Version: 0.1

### 1.2 Product summary

The project adds a web-based playlist builder and MediaCMS catalog search layer to the Kryten ecosystem, enabling users to find media items from a legacy MediaCMS.io installation and construct reusable playlists that can be applied to a Cytube channel.

The service will not require deep understanding of Cytube “custom manifest” JSON beyond generating/using a manifest URL per media item. The system will focus on usability (fast search, easy playlist assembly, drag-and-drop ordering) while remaining compatible with an older MediaCMS deployment.

## 2. Goals

### 2.1 Business goals

* Reduce friction in finding and queueing MediaCMS content on Cytube.
* De-silo MediaCMS catalog metadata into a usable, searchable index.
* Enable repeatable programming constructs (named playlists, marathons) without manual Cytube queue work.
* Maintain compatibility with the current MediaCMS version (avoid upgrades).

### 2.2 User goals

* Search MediaCMS titles and categories quickly.
* Build a temporary grouping of items and save as a named playlist.
* Merge saved playlists into marathons and adjust ordering easily.
* Replace or append to the Cytube queue with a saved playlist (with safe controls around the currently playing item).

### 2.3 Non-goals

* Upgrading MediaCMS.io (beyond minimal changes strictly required to read catalog data).
* Validating or parsing custom manifest JSON beyond deriving and passing manifest URLs.
* Replacing Cytube’s real-time state model (Cytube remains source of truth for what is currently playing).

## 3. User personas

### 3.1 Key user types

* Viewer (unprivileged)
* Playlist editor (blessed user)
* Administrator (service admin)

### 3.2 Basic persona details

* **Viewer**: Browses search results and saved playlists (read-only).
* **Playlist editor**: Builds playlists, saves playlists, merges playlists, applies playlists to the queue.
* **Administrator**: Manages blessed users, config, and operational controls (rate limits, maintenance actions).

### 3.3 Role-based access

* **viewer**: Can view catalog and saved playlists. Cannot modify.
* **blessed**: Can create/edit/delete saved playlists and apply playlists to Cytube (subject to safety constraints).
* **admin**: All blessed permissions plus user/role management and operational controls.

## 4. Functional requirements

* **Catalog indexing connector** (Priority: P0)
  * Provide a connector workflow that can fetch MediaCMS catalog metadata and build a time-frozen local index.
  * The connector may evolve as the legacy MediaCMS capabilities are discovered; it must be decoupled from the core service.
  * The refresh operation must be invokable on-demand (CLI and/or admin UI trigger).
  * Minimum indexed fields per media item:
    * `title`
    * `video_id` (the ID needed to derive the manifest URL)
    * `categories` (MTM; flat list of strings)
  * Derived field:
    * `manifest_url` = `https://www.420grindhouse.com/api/v1/media/cytube/{video_id}.json?format=json`

* **Catalog storage and search** (Priority: P0)
  * Persist the time-frozen index in a queryable format suitable for fast text search.
  * Preferred storage pattern:
    * Source of truth for lightweight shared state: NATS KV (via `kryten-py`).
    * Local search index: SQLite (or equivalent) to support fast search over ~5000 items.
  * Search must support:
    * Title substring search
    * Category filtering
    * Combined title + category search

* **Playlist data model** (Priority: P0)
  * A saved playlist consists of:
    * Playlist name (unique per namespace)
    * Ordered list of media items (referenced by `video_id`)
    * Optional metadata: created_by, created_at, updated_at
  * Support playlist operations:
    * Create/save
    * Load
    * Rename
    * Delete
    * Reorder items (including drag-and-drop)
    * Merge playlists into a new playlist (for marathons)
    * Generate marathons from multiple sources, including:
      * Concatenate (append playlists in sequence)
      * Shuffle (simple randomization with optional seed)
      * Interleave (TV-style marathons) with one or more patterns:
        * Round-robin by source (A, B, A, B, ...)
        * Weighted blocks (A, A, B, B, ...)
        * Custom repeating pattern (e.g., A, A, B, C, C, A, ...)
    * Define a custom interleave “pattern syntax” for repeatable marathons:
      * Sources are assigned stable short labels `A`, `B`, `C`, ... based on the user’s selected source playlists in order of selection.
      * Pattern string grammar (case-insensitive):
        * A pattern is a sequence of *tokens*; each token is a source label followed by an optional positive integer count.
        * Token form: `<label><count?>` where:
          * `<label>` is `A`-`Z` corresponding to the selected sources
          * `<count?>` is an integer `>= 1` (default is `1`)
        * Allowed separators between tokens: optional whitespace, commas, dashes, or pipes (` `, `,`, `-`, `|`).
        * The pattern repeats from the start until all sources are exhausted.
      * Examples:
        * `A B` or `A,B` or `A|B` -> round-robin (A, B, A, B, ...)
        * `A2B2` or `A2 B2` -> weighted blocks (A, A, B, B, ...)
        * `A2B1C2` -> A, A, B, C, C, repeating
      * Validation rules:
        * Tokens referencing labels not in the selected sources are rejected with an actionable error.
        * Zero/negative counts are rejected.
        * If a token’s source is exhausted, it is skipped and the generator continues.
      * Shuffle seed behavior:
        * If a seed is provided, shuffle results are deterministic for the same inputs and seed.
    * Attempt to preserve “run order” for episodic content during marathon generation when possible:
      * Best-effort parsing of season/episode from title strings (e.g., `S01E04`, `s01e4`, `s01.e04`, `S01 E04`)
      * When season/episode cannot be derived, fall back to the item’s existing order within its source playlist

* **Cytube queue application** (Priority: P0)
  * Applying a saved playlist to the Cytube queue must enqueue items using their `manifest_url` and existing Kryten/Cytube queue mechanisms.
  * Provide three modes (UI/command selectable):
    * Preserve-current (default): keep the currently playing item, replace everything after it.
    * Append: keep queue intact and append playlist items.
    * Hard-replace: remove everything including currently playing item.
  * Permissions:
    * Blessed users can use Preserve-current and Append.
    * Hard-replace requires admin permission or an explicit configuration flag enabling it for blessed users.

* **Authentication via Cytube PM OTP** (Priority: P0)
  * Users authenticate to the web UI by requesting a one-time code (OTP) delivered via Cytube private message.
  * OTP properties:
    * Alphanumeric code suitable for copy/paste
    * Single use
    * Short TTL (configurable)
  * Anti-abuse:
    * Rate limit OTP requests per username and per IP (configurable)
    * Limit OTP entry attempts to 3 per OTP/session (hard requirement)
    * Lockout/backoff after repeated failures (configurable)
    * If an OTP verification attempt occurs without a corresponding OTP request, prompt the user to confirm they requested it and offer a protective action:
      * Option to temporarily block the source IP from further OTP actions for a configurable duration (default 72 hours)

* **Blessed user management** (Priority: P0)
  * Maintain a separate blessed user list independent of Cytube levels.
  * Blessed user list is stored in NATS KV via `kryten-py`.
  * Admin can:
    * Add/remove blessed users
    * View current blessed user list

* **Playlist analytics and ecosystem statistics** (Priority: P1)
  * Track and store ecosystem-specific statistics about playlist usage and media playback, including (minimum viable set):
    * Items queued (count)
    * Items played (count)
    * Total duration queued (sum of durations when known)
    * Total duration played (sum of durations when known)
    * Per-item play counts and last-played timestamp
    * Per-playlist apply counts and last-applied timestamp
  * Store analytics and derived stats in NATS KV using the available methods provided by `kryten-py`.
  * Data must be append-safe and resilient to service restarts.
  * If an item’s duration is unknown at queue time, the system may populate it later from the catalog snapshot or manifest metadata if available.

* **User “like” signals for currently playing media** (Priority: P2)
  * Provide a mechanism for any user to signal that they like the currently playing media.
  * Likes are recorded as an ecosystem signal (not a Cytube permission concept) and are stored in NATS KV via `kryten-py`.
  * Provide at least one read path to view aggregated likes later (by item, by time window, or “top liked”).
  * Apply anti-abuse controls:
    * Rate limit likes per user
    * Optionally deduplicate likes per user per item within a configurable window

* **Administration via commands** (Priority: P1)
  * Provide CLI and/or Kryten command hooks enabling admins to:
    * Trigger catalog refresh
    * Apply a named playlist to the Cytube queue
    * Manage blessed users

* **Remove “moderator” references and align versioning** (Priority: P1)
  * Update the codebase and documentation to remove/replace “moderator” references with playlist-appropriate terminology.
  * Ensure versioning uses a single source of truth from `pyproject.toml` (consistent with other Kryten services).

## 5. User experience

### 5.1 Entry points & first-time user flow

* User opens the web UI.
* User enters Cytube username and requests an OTP.
* System sends OTP via Cytube PM.
* User enters OTP to authenticate.
* Authenticated user lands on catalog search + playlist builder view.

### 5.2 Core experience

* **Search catalog**: User searches by title and/or selects one or more categories.
  * Results show title and categories (and optionally thumbnail if available via MediaCMS).
  * User can add items from results into a working playlist.

* **Build playlist**: User assembles a working list of items.
  * User can reorder items via drag-and-drop.
  * User can remove items.

* **Save playlist**: User saves working list as a named playlist.
  * Name collisions are handled with a clear error and guidance.

* **Apply playlist to queue**: User selects a saved playlist and applies it to the Cytube queue.
  * User selects mode (Preserve-current / Append / Hard-replace).
  * UI clearly explains which modes the user can execute.

### 5.3 Advanced features & edge cases

* Playlist merging into marathons (concatenate, shuffle, and TV-style interleaving patterns).
* Manual reorder of merged playlist before saving.
* Catalog refresh while users are browsing:
  * Active sessions continue using the current snapshot until refresh completes.
* Missing or invalid video IDs:
  * Item is shown as unavailable for queueing with a clear reason.
* Manifest URL errors at queue time:
  * Surface an actionable error message; do not break the whole operation.

### 5.4 UI/UX highlights

* Fast, incremental search (title and category).
* Drag-and-drop reordering for the working playlist and saved playlist editor.
* Clear call-to-action to “Apply to queue” with mode selection and permission messaging.

## 6. Narrative

A playlist editor signs in using an OTP delivered via Cytube PM, searches the MediaCMS catalog by title and category, builds and saves named playlists, then applies a saved playlist to Cytube to quickly program the channel—either preserving the currently playing item or appending—without manual queue management.

## 7. Success metrics

### 7.1 User-centric metrics

* Median time from landing page to applying a playlist to queue.
* Search-to-add conversion rate (search queries leading to playlist additions).
* Number of saved playlists created and reused.
* Number of likes recorded per day and per currently playing item.

### 7.2 Business metrics

* Reduction in manual queue operations performed in Cytube UI.
* Increased scheduled/structured programming usage (marathons, themed playlists).
* Growth in repeat engagement indicators (playlist reuse, likes per session).

### 7.3 Technical metrics

* Search latency p95 for title queries over ~5000 items.
* OTP delivery success rate and median delivery time.
* Queue apply success rate and median completion time.
* Analytics write success rate to NATS KV.
* Like signal ingestion success rate and p95 end-to-end latency.

## 8. Technical considerations

### 8.1 Integration points

* **Cytube / Kryten ecosystem**:
  * Use `kryten-py` `KrytenClient` and existing queue functions to enqueue manifest URLs.
  * Use NATS subjects under `nats_subject_prefix` to communicate with other services.
* **OTP delivery**:
  * Send OTP via Cytube PM using existing Kryten/Cytube messaging mechanisms (likely via kryten-robot or equivalent messaging publisher).
* **Blessed user list**:
  * Store in NATS KV using `kryten-py` access patterns.
* **Analytics and likes**:
  * Store counters, aggregates, and event summaries in NATS KV using `kryten-py`.
  * Subscribe to relevant queue/playback events from the Kryten/Cytube ecosystem to update metrics.

### 8.2 Data storage & privacy

* Store minimal necessary data:
  * Catalog metadata (title, video_id, categories)
  * Saved playlists (name + ordered video_id list)
  * Auth session tokens and OTP state (short-lived)
  * Aggregated analytics and like signals (do not store unnecessary personal data)
* Do not store user passwords.
* Log OTP events without logging the raw OTP value.
* For likes, store the minimal identity required to support anti-abuse (configurable):
  * Preferred: store a stable user identifier and deduplicate per item within a window
  * Do not store raw OTPs or PM contents

### 8.3 Scalability & performance

* Design for fast search over ~5000 items locally.
* Ensure catalog refresh is safe and does not block read-only search.
* NATS connectivity must be resilient; degraded mode should still allow browsing local catalog and saved playlists even if queue operations are unavailable.

### 8.4 Potential challenges

* Legacy MediaCMS catalog extraction may require iteration; connector must be easy to modify.
* Reliable OTP PM delivery depends on Cytube connectivity and message pathway.
* Queue replacement semantics must avoid disruptive actions by non-admins (currently-playing protection).
* Reliable playback tracking depends on observing “now playing” or play-start signals from Cytube/Kryten.

## 9. Milestones & sequencing

### 9.1 Project estimate

* Medium: 3–6 weeks

### 9.2 Team size & composition

* 1–2 engineers: backend + UI

### 9.3 Suggested phases

* **Phase 1**: Catalog snapshot + search + basic playlist save/load (1–2 weeks)
  * Connector workflow scaffolded and runnable.
  * Search UI with title/category filtering.
  * Saved playlist CRUD.

* **Phase 2**: Queue apply + permissions + OTP auth (1–2 weeks)
  * OTP PM flow.
  * Blessed/admin role enforcement.
  * Apply playlist modes (preserve-current, append, hard-replace guarded).

* **Phase 3**: Merge + reorder polish + admin commands (1–2 weeks)
  * Playlist merge flows.
  * Drag-and-drop reordering everywhere relevant.
  * Admin command hooks and operational documentation.

## 10. User stories

### 10.1 Sign in via OTP

* **ID**: GH-001
* **Description**: As a user, I want to request an OTP delivered via Cytube PM so I can authenticate to the playlist web UI without managing a separate password.
* **Acceptance criteria**:
  * User can submit a Cytube username and request an OTP.
  * System sends an alphanumeric OTP via Cytube PM.
  * OTP expires after a configurable TTL.
  * OTP is single-use.
  * OTP entry attempts are limited to 3 per OTP/session.
  * OTP request and OTP verification are rate-limited per username and per IP.
  * If a user attempts OTP verification without having requested an OTP, the UI indicates the OTP was not requested and offers an option to temporarily block the source IP from further OTP actions (default 72 hours, configurable).
  * Failed OTP entry is eventually locked out/backed off per configuration.

### 10.2 Browse and search the catalog snapshot

* **ID**: GH-002
* **Description**: As a user, I want to search the MediaCMS catalog by title and filter by categories so I can find content quickly.
* **Acceptance criteria**:
  * User can search titles with substring matching.
  * User can filter results by one or more categories.
  * Search returns results within a defined performance target (to be set in implementation; p95 tracked).
  * Results display at least title, video_id, and categories.

### 10.3 Refresh the catalog snapshot

* **ID**: GH-003
* **Description**: As an admin, I want to refresh the catalog snapshot on-demand so the search index reflects new MediaCMS content.
* **Acceptance criteria**:
  * Admin can trigger a refresh via CLI and/or admin UI.
  * Refresh produces a time-frozen snapshot.
  * Users can continue searching the previous snapshot while refresh runs.
  * After refresh completes, new sessions use the updated snapshot.

### 10.4 Build a working playlist from search results

* **ID**: GH-004
* **Description**: As a blessed user, I want to add catalog items to a working playlist so I can curate a list before saving.
* **Acceptance criteria**:
  * User can add an item from search results to a working list.
  * User can remove items from the working list.
  * Items in the working list retain order.

### 10.5 Reorder playlist items with drag-and-drop

* **ID**: GH-005
* **Description**: As a blessed user, I want to reorder items with drag-and-drop so I can quickly arrange playback order.
* **Acceptance criteria**:
  * User can drag-and-drop to reorder items in the working playlist.
  * The new order persists in the UI state and is saved when the playlist is saved.

### 10.6 Save a named playlist

* **ID**: GH-006
* **Description**: As a blessed user, I want to save my working playlist with a name so I can reuse it later.
* **Acceptance criteria**:
  * User can save a playlist with a name.
  * Playlist name uniqueness rules are enforced and errors are surfaced clearly.
  * Saved playlist includes an ordered list of video IDs.

### 10.7 View and edit saved playlists

* **ID**: GH-007
* **Description**: As a blessed user, I want to load and edit a saved playlist so I can refine it over time.
* **Acceptance criteria**:
  * User can list saved playlists.
  * User can load a saved playlist into an editor.
  * User can reorder and remove items and re-save.
  * User can delete a saved playlist.

### 10.8 Merge saved playlists into a marathon

* **ID**: GH-008
* **Description**: As a blessed user, I want to merge multiple saved playlists into a new playlist so I can create TV-style marathons.
* **Acceptance criteria**:
  * User can select multiple saved playlists.
  * User can choose a marathon generation method:
    * Concatenate (default)
    * Shuffle
    * Interleave
  * For Interleave, user can choose at least one interleaving pattern:
    * Round-robin (A, B, A, B, ...)
    * Weighted blocks (A, A, B, B, ...)
    * Custom repeating pattern (e.g., A, A, B, C, C, A, ...)
  * System creates a combined ordered list according to the selected method.
  * User can reorder the merged result before saving as a new named playlist.

### 10.9 Preserve TV show run order during marathons

* **ID**: GH-015
* **Description**: As a blessed user, I want episodic content to remain in season/episode order during interleaving and shuffles so marathons feel like traditional TV programming.
* **Acceptance criteria**:
  * The system attempts to infer season and episode numbers from titles using common patterns (case-insensitive), including:
    * `S01E04`, `s01e4`
    * `s01.e04`, `S01.E04`
    * `S01 E04`
  * When season/episode numbers can be inferred for items within a source playlist, the system preserves ascending run order within that source while interleaving between sources.
  * When season/episode cannot be inferred for some or all items, the system falls back to the source playlist’s existing order for those items.
  * The UI provides a preview of the generated order before saving or applying.

### 10.10 Apply a saved playlist to the Cytube queue

* **ID**: GH-009
* **Description**: As a blessed user, I want to apply a saved playlist to the Cytube queue so the channel plays my curated list.
* **Acceptance criteria**:
  * User can select a saved playlist to apply.
  * User can choose mode: Preserve-current (default) or Append.
  * The system enqueues items using each item’s derived manifest URL.
  * If a subset of items fails to enqueue, the UI surfaces which items failed and why.

### 10.11 Hard-replace the Cytube queue

* **ID**: GH-010
* **Description**: As an admin, I want to hard-replace the Cytube queue (including the currently playing item) so I can immediately switch programming.
* **Acceptance criteria**:
  * Hard-replace mode is available only to admins by default.
  * An explicit configuration option can enable hard-replace for blessed users.
  * The UI clearly warns that the currently playing item will be removed.

### 10.12 Manage blessed users

* **ID**: GH-011
* **Description**: As an admin, I want to manage a separate list of blessed users so access is not tied to Cytube’s permission levels.
* **Acceptance criteria**:
  * Admin can add and remove blessed users.
  * Blessed user list is stored in NATS KV.
  * Changes take effect without restarting the service.

### 10.13 Enforce permissions for destructive actions

* **ID**: GH-012
* **Description**: As the system, I want to enforce role-based access so only authorized users can modify playlists or modify the queue.
* **Acceptance criteria**:
  * Viewer cannot create/edit/delete playlists.
  * Viewer cannot apply playlists to queue.
  * Blessed can create/edit/delete playlists and apply Preserve-current/Append.
  * Admin can perform all actions including hard-replace.

### 10.14 System resilience for NATS outages

* **ID**: GH-013
* **Description**: As a user, I want the UI to degrade gracefully when NATS is unavailable so I can still browse and build playlists even if queue operations are down.
* **Acceptance criteria**:
  * If NATS is unavailable, queue apply actions are disabled with a clear message.
  * Catalog browsing and saved playlist editing remains available using local data stores.

### 10.15 Track playlist and playback statistics

* **ID**: GH-016
* **Description**: As an administrator, I want the service to track playlist usage and playback statistics so we can understand what content is used and enjoyed.
* **Acceptance criteria**:
  * The system records at least: queued count, played count, and per-item play counts.
  * The system records duration-based totals when durations are known.
  * Statistics are stored in NATS KV via `kryten-py` and survive service restarts.
  * The system can produce a basic “top played” view for a configurable time window.

### 10.16 Like the currently playing item

* **ID**: GH-017
* **Description**: As any user, I want to signal that I like the currently playing media so that preference data can be viewed later.
* **Acceptance criteria**:
  * Any user (including non-blessed) can send a “like” signal for the currently playing item.
  * The system rate limits likes per user.
  * The system optionally deduplicates likes per user per item within a configurable time window.
  * Like signals are stored in NATS KV via `kryten-py` and survive service restarts.
  * A privileged user can view aggregated likes for an item and a “top liked” list.

### 10.14 Align terminology and versioning

* **ID**: GH-014
* **Description**: As a maintainer, I want the service to use consistent naming (no “moderator” references) and single-source versioning so releases match the Kryten ecosystem conventions.
* **Acceptance criteria**:
  * “moderator” terminology is removed/replaced across code and docs.
  * The runtime version is sourced from `pyproject.toml`.
