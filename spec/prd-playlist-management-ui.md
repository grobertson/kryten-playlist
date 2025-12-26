# PRD: Kryten Playlist Management Web UI

**Version:** 1.0  
**Created:** 2025-12-20  
**Last Updated:** 2025-12-20  
**Owner:** kryten  

---

## 1. Product overview

### 1.1 Document title and version

- PRD: Kryten Playlist Management Web UI
- Version: 1.0

### 1.2 Product summary

The Kryten Playlist Management Web UI is a modern, single-page application (SPA) that provides blessed and admin users with a comprehensive interface for creating, organizing, and managing video playlists. The application enables users to search a media catalog, build custom playlists with intuitive drag-and-drop reordering, and apply playlists to the CyTube queue.

The UI follows a Spotify-inspired design language with a dark theme, emphasizing usability and visual polish. Playlists support a rich visibility model (private, shared, public) allowing users to keep personal collections while optionally sharing with others. Shared playlists can be forked into personal copies, enabling collaborative discovery without compromising ownership.

The application is built as a React-based SPA that communicates with the existing FastAPI backend via JSON APIs. Real-time updates for the currently playing video enhance the live experience, while the desktop-first responsive design ensures optimal usability on primary workstations with graceful mobile fallbacks.

---

## 2. Goals

### 2.1 Business goals

- Provide a polished, professional interface that enhances the CyTube viewing experience
- Enable efficient playlist curation to reduce friction for content organizers
- Support community engagement through playlist sharing and discovery
- Establish a modern frontend architecture that can scale with future features (MCP integration, etc.)

### 2.2 User goals

- Quickly search and browse the media catalog with filtering capabilities
- Create and organize personal playlists with minimal friction
- Reorder playlist items intuitively via drag-and-drop
- Share curated playlists with the community or keep them private
- Discover and fork interesting playlists created by others
- Apply playlists to the CyTube queue with appropriate mode selection
- See real-time updates of what's currently playing

### 2.3 Non-goals

- Viewer-level (unauthenticated or low-privilege) access to playlist management features
- Collaborative real-time editing of the same playlist by multiple users
- Playlist folders or hierarchical organization (tags are preferred)
- Playlist export/import functionality
- Real-time sync of playlist changes made by other users
- Real-time sync of catalog updates

---

## 3. User personas

### 3.1 Key user types

- **Content Curator**: Blessed user who actively creates and manages playlists for community viewing sessions
- **Marathon Organizer**: Admin user who builds complex marathon playlists from multiple sources
- **Casual Contributor**: Blessed user who occasionally creates personal playlists and queues content

### 3.2 Basic persona details

- **Content Curator (Alex)**: Spends 2-3 hours weekly organizing themed playlists. Values efficiency, wants keyboard shortcuts and bulk operations. Frequently shares playlists publicly.

- **Marathon Organizer (Jordan)**: Plans multi-hour viewing events. Needs marathon builder with interleave/shuffle capabilities. Requires full admin access to hard-replace queues.

- **Casual Contributor (Sam)**: Creates personal "watch later" playlists. Occasionally shares with friends. Values simplicity and discoverability of others' public playlists.

### 3.3 Role-based access

- **Viewer (Level 1 and below)**: No access to playlist management features. UI elements are not shown or advertised to these users. Redirected to appropriate pages if attempting direct URL access.

- **Blessed**: Full access to playlist CRUD, catalog search, marathon builder, and queue apply (preserve-current, append modes). Can create private/shared/public playlists. Can fork shared/public playlists.

- **Admin**: All blessed capabilities plus hard-replace queue mode. Can manage system-wide settings if applicable.

---

## 4. Functional requirements

### 4.1 Authentication gate (Priority: Critical)

- Users must authenticate via OTP before accessing any playlist features
- Unauthenticated users see only the login page
- Users with viewer role or below are shown a "no access" message and cannot proceed
- Session persistence via secure cookie with appropriate expiry

### 4.2 Catalog browser (Priority: Critical)

- Full-text search across video titles with debounced input (200ms)
- Category filtering with multi-select capability
- Paginated or infinite-scroll results display
- Each result shows: title, duration, categories
- Subtle blurred thumbnail as background element for each item (optional display toggle)
- "Add to playlist" action for each catalog item
- Quick-add to currently selected/working playlist

### 4.3 Playlist management (Priority: Critical)

- Create new playlist with name and visibility setting
- Edit existing playlist (rename, modify items, change visibility)
- Delete playlist with confirmation dialog
- Drag-and-drop reordering of playlist items
- Remove individual items from playlist
- Bulk selection and removal of multiple items
- Duplicate detection warning when adding items already in playlist
- Auto-save with debounce or explicit save button

### 4.4 Playlist visibility model (Priority: Critical)

- **Private**: Only visible to the owner
- **Shared**: Visible to all blessed/admin users, but only editable by owner
- **Public**: Visible to all blessed/admin users, forkable by others
- Visibility can be changed after creation
- Clear visual indicators for visibility status (icons/badges)

### 4.5 Playlist discovery and forking (Priority: High)

- Browse all public and shared playlists from other users
- Filter by creator, tag, or search by name
- View playlist contents without editing capability
- Fork/clone a shared or public playlist into user's own collection
- Forked playlists default to private visibility
- Attribution shown ("forked from @username")

### 4.6 Playlist tagging (Priority: Medium - Nice to Have)

- Add tags to playlists for organization
- Filter own playlists by tag
- Suggested tags based on existing tags in the system
- Tag management (create, rename, delete personal tags)

### 4.7 Marathon builder (Priority: High)

- Select multiple source playlists (minimum 2)
- Choose combination method: concatenate, shuffle, interleave
- Interleave pattern input with validation and examples
- Preserve episode order toggle
- Live preview of generated order
- Manual reordering of preview items via drag-and-drop
- Save marathon result as new playlist

### 4.8 Queue application (Priority: Critical)

- Select playlist to apply to CyTube queue
- Mode selection based on role:
  - Preserve-current (blessed/admin)
  - Append (blessed/admin)
  - Hard-replace (admin only)
- Confirmation dialog before applying
- Progress indicator during application
- Success/failure summary with per-item error details

### 4.9 Now playing display (Priority: High)

- Real-time display of currently playing video
- Video title and metadata visible in header or dedicated component
- "Like" button for current video with visual feedback
- Like count display
- WebSocket or polling-based updates (30-second interval acceptable)

### 4.10 Statistics view (Priority: Medium)

- Top played videos list
- Top liked videos list
- Time window filtering (7 days, 30 days, all time)
- Click-through to add items to current playlist

### 4.11 Responsive layout (Priority: Medium)

- Desktop-first design optimized for 1280px+ viewports
- Graceful degradation to tablet (768px+) layouts
- Mobile (< 768px) basic functionality preserved
- Touch-friendly drag-and-drop on mobile devices

### 4.12 Keyboard navigation (Priority: Medium)

- Tab navigation through interactive elements
- Keyboard shortcuts for common actions (search focus, save, etc.)
- Arrow key navigation within lists
- Escape to close modals/dialogs

---

## 5. User experience

### 5.1 Entry points and first-time user flow

- User navigates to application URL
- If unauthenticated: Login page with OTP request/verify flow
- If authenticated but unauthorized (viewer role): "Access restricted" page with explanation
- If authorized (blessed/admin): Main dashboard with catalog search and playlist sidebar
- First-time users see an empty "My Playlists" section with prominent "Create Playlist" CTA
- Optional onboarding tooltip highlighting key features

### 5.2 Core experience

- **Navigation**: Persistent sidebar with sections: My Playlists, Shared Playlists, Public Playlists, Marathon Builder, Queue, Stats
  - Sidebar collapses to icons on smaller viewports
  - Active section highlighted

- **Catalog search**: Central search bar with instant results
  - Results appear in scrollable panel
  - Hover/focus reveals "Add" button
  - Drag from catalog directly to playlist panel

- **Playlist editing**: Split-pane view with catalog on left, playlist editor on right
  - Playlist items show drag handles, title, duration
  - Smooth drag-and-drop animations
  - Optimistic UI updates with error recovery

- **Saving and feedback**: Auto-save indicator or explicit save button
  - Toast notifications for success/error states
  - Unsaved changes warning before navigation

### 5.3 Advanced features and edge cases

- Large playlists (500+ items): Virtualized list rendering for performance
- Catalog refresh during session: User continues with current snapshot; refresh button available
- Network errors: Retry logic with exponential backoff; offline indicator
- Concurrent edit conflict: Last-write-wins with notification if data changed
- Invalid interleave pattern: Inline validation error with format examples
- Empty search results: Helpful message with suggestions
- Session expiry: Graceful redirect to login with "session expired" message

### 5.4 UI/UX highlights

- **Dark theme**: Spotify-inspired dark color palette with high contrast text
- **Subtle thumbnails**: Blurred thumbnail backgrounds for catalog/playlist items (toggleable)
- **Smooth animations**: 200-300ms transitions for drag-drop, panel expansion, modals
- **Skeleton loaders**: Content placeholder animations during data fetching
- **Micro-interactions**: Button hover effects, successful action confirmations
- **Consistent iconography**: Cohesive icon set (Lucide, Phosphor, or similar)
- **Typography**: Clean sans-serif font stack with clear hierarchy

---

## 6. Narrative

Alex opens the Kryten Playlist app on Saturday afternoon to prepare for the evening's horror movie marathon. After logging in with OTP, they're greeted by the familiar dark interface with their playlist sidebar already populated. They click "Create Playlist" and name it "Spooky Saturdays Vol. 4" setting it to public visibility.

Using the catalog search, Alex types "halloween" and filters by the "Horror" category. Results appear instantly, showing titles with their durations. They drag a few favorites directly into the new playlist panel on the right. As they build the list, they drag items to reorder them, placing the shorter films first as warm-ups.

Noticing a great public playlist called "Classic Monster Movies" by Jordan, Alex opens it, likes what they see, and clicks "Fork" to create their own copy. They merge a few items from the forked playlist into their Spooky Saturdays list using drag-and-drop.

When ready, Alex navigates to the Queue section, selects their playlist, chooses "Append" mode, and hits Apply. A progress indicator shows items being queued, and a success toast confirms "24 items queued successfully." The Now Playing widget in the header updates to show the first video as it starts, and Alex can see community members liking the current selection in real-time.

---

## 7. Success metrics

### 7.1 User-centric metrics

- Time to create a new playlist (target: < 30 seconds for empty playlist)
- Time to add 10 items from catalog search (target: < 2 minutes)
- Drag-and-drop success rate (target: > 95% without accidental drops)
- Feature discoverability (users finding fork/share within first session)
- User-reported satisfaction scores

### 7.2 Business metrics

- Number of playlists created per week
- Percentage of playlists shared publicly
- Fork rate for public playlists
- Queue apply frequency
- Active blessed/admin users per week

### 7.3 Technical metrics

- Initial page load time (target: < 2 seconds on desktop)
- Time to interactive (target: < 3 seconds)
- API response latency (p95 < 200ms for search, < 500ms for mutations)
- WebSocket/polling reliability for now-playing updates
- Error rate for drag-and-drop operations

---

## 8. Technical considerations

### 8.1 Integration points

- **FastAPI backend**: All data operations via existing `/api/v1/*` endpoints
- **NATS KV**: Playlist storage, session management, analytics (via backend)
- **SQLite catalog**: Search and category filtering (via backend)
- **CyTube integration**: Queue application, now-playing state (via backend/NATS)
- **Authentication**: OTP flow via existing auth endpoints

### 8.2 Data storage and privacy

- All playlist data stored in NATS KV via backend
- Private playlists only returned to owner by API (backend enforcement)
- Session tokens in secure, httpOnly cookies
- No client-side storage of sensitive data
- Playlist visibility enforced at API level, not just UI

### 8.3 Scalability and performance

- Virtual scrolling for large lists (500+ items)
- Debounced search (200ms) to reduce API load
- Optimistic UI updates with rollback on failure
- Bundle size optimization (code splitting, tree shaking)
- Lazy loading of non-critical components (marathon builder, stats)

### 8.4 Potential challenges

- **Drag-and-drop complexity**: Cross-panel dragging (catalog to playlist) requires careful state management
- **Real-time updates**: WebSocket connection management, reconnection logic
- **Large playlist performance**: Virtual list rendering while maintaining drag-and-drop
- **Mobile drag-and-drop**: Touch event handling differs from mouse events
- **Build tooling**: Requires Node.js, bundler (Vite recommended), development server

---

## 9. Milestones and sequencing

### 9.1 Project estimate

- **Large project**: 6-8 weeks with single developer focus

### 9.2 Team size and composition

- 1 Frontend developer (primary)
- 1 Backend developer (API adjustments, part-time)
- Design consultation (ad-hoc)

### 9.3 Suggested phases

- **Phase 1: Foundation** (2 weeks)
  - React project setup with Vite
  - Routing, authentication integration, layout shell
  - API client layer with error handling
  - Dark theme implementation
  - Key deliverables: Login flow working, basic navigation, authenticated API calls

- **Phase 2: Catalog and basic playlist CRUD** (2 weeks)
  - Catalog search with filtering
  - Playlist list view (my playlists, shared, public)
  - Create/edit/delete playlist
  - Basic item management (add, remove)
  - Key deliverables: Full catalog browsing, playlist CRUD functional

- **Phase 3: Drag-and-drop and UX polish** (1.5 weeks)
  - Drag-and-drop reordering within playlist
  - Cross-panel drag (catalog to playlist)
  - Animations and transitions
  - Skeleton loaders and loading states
  - Key deliverables: Smooth drag-and-drop, polished interactions

- **Phase 4: Visibility, sharing, and forking** (1 week)
  - Visibility model implementation
  - Browse shared/public playlists
  - Fork functionality
  - Attribution display
  - Key deliverables: Full sharing workflow operational

- **Phase 5: Marathon builder and queue apply** (1 week)
  - Marathon builder with preview
  - Queue application with mode selection
  - Progress and error feedback
  - Key deliverables: Marathon and queue features complete

- **Phase 6: Real-time, stats, and polish** (0.5-1 week)
  - Now-playing WebSocket/polling integration
  - Like functionality
  - Stats view
  - Responsive breakpoints
  - Keyboard navigation
  - Final bug fixes and polish
  - Key deliverables: Production-ready application

---

## 10. User stories

### 10.1 Authentication and access control

- **ID**: PM-001
- **Description**: As a blessed/admin user, I want to log in using OTP so that I can securely access the playlist management features.
- **Acceptance criteria**:
  - Given I am on the login page, when I enter my CyTube username and click "Request OTP", then an OTP is sent to me via CyTube PM
  - Given I have received an OTP, when I enter it correctly, then I am authenticated and redirected to the main dashboard
  - Given I enter an incorrect OTP 3 times, then I am locked out and must request a new OTP
  - Given an unsolicited OTP verification is attempted, then I am prompted to optionally block the IP

### 10.2 Access restriction for unauthorized users

- **ID**: PM-002
- **Description**: As a viewer-level user, I should not see or access playlist management features so that privileged functionality remains protected.
- **Acceptance criteria**:
  - Given I am authenticated as a viewer, when I access any playlist management URL, then I see an "Access Restricted" message
  - Given I am a viewer, when the page loads, then no playlist management navigation items are visible
  - Given I am unauthenticated, when I access any protected URL, then I am redirected to the login page

### 10.3 Catalog search

- **ID**: PM-003
- **Description**: As a curator, I want to search the media catalog by title and filter by category so that I can quickly find content to add to my playlists.
- **Acceptance criteria**:
  - Given I am on the main dashboard, when I type in the search bar, then results appear within 500ms after I stop typing
  - Given I select one or more category filters, when results update, then only items matching selected categories are shown
  - Given the search returns results, when I view an item, then I see the title, duration, and categories
  - Given there are more results than fit on screen, when I scroll, then additional results load (pagination or infinite scroll)

### 10.4 Create new playlist

- **ID**: PM-004
- **Description**: As a curator, I want to create a new playlist with a name and visibility setting so that I can start organizing content.
- **Acceptance criteria**:
  - Given I click "Create Playlist", when a modal appears, then I can enter a playlist name
  - Given the modal is open, when I select visibility (private/shared/public), then my selection is saved with the playlist
  - Given I submit a valid name, when the playlist is created, then it appears in my playlist list
  - Given I submit an empty or duplicate name, when validation runs, then an appropriate error message is shown

### 10.5 Edit playlist metadata

- **ID**: PM-005
- **Description**: As a curator, I want to rename my playlist and change its visibility so that I can manage how it's shared.
- **Acceptance criteria**:
  - Given I am viewing my playlist, when I click the playlist name, then it becomes editable inline or opens an edit modal
  - Given I change the name to a valid value, when I save, then the new name is persisted
  - Given I change visibility from private to public, when I save, then the playlist becomes visible to other users
  - Given I am not the owner, when I view a shared playlist, then edit controls are not available

### 10.6 Add items to playlist

- **ID**: PM-006
- **Description**: As a curator, I want to add items from catalog search results to my playlist so that I can build my content list.
- **Acceptance criteria**:
  - Given search results are displayed, when I click "Add" on an item, then it is appended to my currently selected playlist
  - Given search results are displayed, when I drag an item to the playlist panel, then it is added at the drop position
  - Given the item already exists in the playlist, when I add it, then a duplicate warning is shown
  - Given an item is successfully added, when the playlist updates, then the new item is visible with correct metadata

### 10.7 Remove items from playlist

- **ID**: PM-007
- **Description**: As a curator, I want to remove items from my playlist so that I can curate the content.
- **Acceptance criteria**:
  - Given I am editing my playlist, when I click the remove button on an item, then it is removed from the list
  - Given I select multiple items, when I click bulk remove, then all selected items are removed
  - Given an item is removed, when the UI updates, then the item is no longer visible
  - Given I remove an item accidentally, when I have unsaved changes, then I can undo or cancel

### 10.8 Reorder playlist items via drag-and-drop

- **ID**: PM-008
- **Description**: As a curator, I want to reorder items in my playlist by dragging them so that I can arrange the viewing order intuitively.
- **Acceptance criteria**:
  - Given I am editing my playlist, when I drag an item by its handle, then a visual indicator shows the drag in progress
  - Given I am dragging an item, when I drop it at a new position, then the item order updates immediately
  - Given drag-and-drop completes, when the order changes, then the new order is persisted (auto-save or on explicit save)
  - Given I am on a touch device, when I long-press and drag an item, then reordering works correctly

### 10.9 View shared and public playlists

- **ID**: PM-009
- **Description**: As a curator, I want to browse playlists shared by other users so that I can discover content curated by the community.
- **Acceptance criteria**:
  - Given I navigate to "Shared Playlists", when the list loads, then I see playlists with visibility "shared" from all users
  - Given I navigate to "Public Playlists", when the list loads, then I see playlists with visibility "public" from all users
  - Given I click on a shared/public playlist, when it opens, then I can view its contents but not edit
  - Given I am viewing another user's playlist, when I look at the header, then I see the owner's username

### 10.10 Fork a shared or public playlist

- **ID**: PM-010
- **Description**: As a curator, I want to fork (clone) a shared or public playlist so that I can create my own editable copy.
- **Acceptance criteria**:
  - Given I am viewing a shared/public playlist, when I click "Fork", then a copy is created in my playlists
  - Given the fork is created, when I view it, then visibility defaults to "private"
  - Given the fork is created, when I view its metadata, then attribution shows "Forked from @originalOwner"
  - Given I fork a playlist, when I edit my copy, then the original playlist is not affected

### 10.11 Marathon builder source selection

- **ID**: PM-011
- **Description**: As a marathon organizer, I want to select multiple playlists as sources for a marathon so that I can combine content from different collections.
- **Acceptance criteria**:
  - Given I am in the Marathon Builder, when I click "Add Source", then I can select from my playlists
  - Given I have added a source, when I add another, then both appear in the source list with labels (A, B, C, etc.)
  - Given I have sources selected, when I remove one, then it is removed from the source list
  - Given I have fewer than 2 sources, when I try to generate, then validation prevents generation

### 10.12 Marathon combination method

- **ID**: PM-012
- **Description**: As a marathon organizer, I want to choose how playlists are combined (concatenate, shuffle, interleave) so that I can create varied viewing experiences.
- **Acceptance criteria**:
  - Given I have selected sources, when I choose "Concatenate", then the preview shows playlists in sequence
  - Given I choose "Shuffle", when the preview generates, then items are in randomized order
  - Given I choose "Interleave" and provide a valid pattern (e.g., "ABAB"), when the preview generates, then items alternate per pattern
  - Given I enter an invalid interleave pattern, when validation runs, then an error message with format examples is shown

### 10.13 Marathon preview and manual reorder

- **ID**: PM-013
- **Description**: As a marathon organizer, I want to preview and manually adjust the generated order so that I can fine-tune the marathon.
- **Acceptance criteria**:
  - Given I click "Generate Preview", when the API responds, then I see the ordered list of items
  - Given the preview is displayed, when I drag items, then I can reorder them manually
  - Given I toggle "Preserve Episode Order", when preview regenerates, then episode ordering is maintained per source
  - Given I am satisfied with the order, when I click "Save as Playlist", then a new playlist is created with the preview items

### 10.14 Apply playlist to queue - mode selection

- **ID**: PM-014
- **Description**: As a curator, I want to apply my playlist to the CyTube queue with the appropriate mode so that content is queued correctly.
- **Acceptance criteria**:
  - Given I am on the Queue Apply page, when I select a playlist, then I see available apply modes
  - Given I am a blessed user, when mode options appear, then I see "Preserve Current" and "Append"
  - Given I am an admin, when mode options appear, then I also see "Hard Replace"
  - Given I am a blessed user, when I try to access "Hard Replace" via URL manipulation, then the API rejects the request

### 10.15 Apply playlist to queue - execution

- **ID**: PM-015
- **Description**: As a curator, I want to see progress and results when applying a playlist so that I know what succeeded or failed.
- **Acceptance criteria**:
  - Given I click "Apply", when a confirmation dialog appears, then I must confirm before proceeding
  - Given I confirm, when application begins, then a progress indicator is shown
  - Given application completes successfully, when results appear, then I see "X items queued successfully"
  - Given some items fail, when results appear, then I see a list of failed items with reasons

### 10.16 Now playing real-time display

- **ID**: PM-016
- **Description**: As a user, I want to see what video is currently playing so that I know what's on without switching to CyTube.
- **Acceptance criteria**:
  - Given I am authenticated, when the page loads, then the current video title is displayed in the header
  - Given the current video changes, when 30 seconds pass (or WebSocket updates), then the display updates automatically
  - Given no video is playing, when I view the header, then a "Nothing playing" message is shown
  - Given the current video is displayed, when I see the component, then the video title and optionally thumbnail are visible

### 10.17 Like current video

- **ID**: PM-017
- **Description**: As a user, I want to like the currently playing video so that I can contribute to community ratings.
- **Acceptance criteria**:
  - Given a video is playing, when I click the "Like" button, then a like is recorded for that video
  - Given I have already liked this video recently, when I try to like again, then I see "Already liked" feedback
  - Given I successfully like, when the UI updates, then the like count increments
  - Given no video is playing, when I view the like button, then it is disabled

### 10.18 View top played statistics

- **ID**: PM-018
- **Description**: As a user, I want to see the most played videos so that I can discover popular content.
- **Acceptance criteria**:
  - Given I navigate to the Stats page, when it loads, then I see a "Top Played" list
  - Given the list is displayed, when I view an item, then I see video title and play count
  - Given I select a time window filter (7/30/all), when the list refreshes, then counts reflect the selected period
  - Given I click an item, when the action completes, then I can add it to my current playlist

### 10.19 View top liked statistics

- **ID**: PM-019
- **Description**: As a user, I want to see the most liked videos so that I can discover community favorites.
- **Acceptance criteria**:
  - Given I am on the Stats page, when it loads, then I see a "Top Liked" list
  - Given the list is displayed, when I view an item, then I see video title and like count
  - Given I click an item, when the action completes, then I can add it to my current playlist

### 10.20 Playlist tags (nice to have)

- **ID**: PM-020
- **Description**: As a curator, I want to add tags to my playlists so that I can organize them by theme or category.
- **Acceptance criteria**:
  - Given I am editing a playlist, when I click "Add Tag", then I can enter a tag name or select from existing tags
  - Given I have tagged playlists, when I filter by tag, then only matching playlists are shown
  - Given I create a new tag, when I save, then it becomes available for future use
  - Given I remove all playlists with a tag, when I view tags, then the unused tag can be cleaned up

### 10.21 Responsive layout

- **ID**: PM-021
- **Description**: As a user on a mobile device, I want basic playlist functionality to work so that I can manage playlists on the go.
- **Acceptance criteria**:
  - Given I access the app on a tablet (768px+), when the layout renders, then the sidebar collapses to icons
  - Given I access the app on mobile (< 768px), when the layout renders, then navigation becomes a hamburger menu
  - Given I am on mobile, when I try to reorder via touch, then drag-and-drop works with long-press
  - Given any viewport size, when I use the app, then all text remains readable and buttons are tappable

### 10.22 Session expiry handling

- **ID**: PM-022
- **Description**: As a user, I want to be gracefully redirected to login when my session expires so that I understand what happened.
- **Acceptance criteria**:
  - Given my session has expired, when I make an API call, then I receive a 401 response
  - Given a 401 response is received, when the app handles it, then I am redirected to login with a "Session expired" message
  - Given I had unsaved changes, when redirected, then the app attempts to preserve draft state (best effort)

### 10.23 Error handling and feedback

- **ID**: PM-023
- **Description**: As a user, I want clear feedback when errors occur so that I understand what went wrong and can retry.
- **Acceptance criteria**:
  - Given an API call fails, when the error is network-related, then a "Connection error, retrying..." message appears
  - Given retries are exhausted, when the final failure occurs, then a clear error message with retry option is shown
  - Given a validation error occurs, when I see the form, then the specific field error is highlighted
  - Given any error toast appears, when I view it, then it auto-dismisses after 5 seconds or can be manually closed

### 10.24 Keyboard navigation

- **ID**: PM-024
- **Description**: As a power user, I want to navigate and perform actions using the keyboard so that I can work efficiently.
- **Acceptance criteria**:
  - Given I am on any page, when I press "/" or Ctrl+K, then the search bar is focused
  - Given I am in a list, when I press arrow keys, then selection moves through items
  - Given I have an item selected, when I press Delete or Backspace, then the item is removed (with confirmation if destructive)
  - Given a modal is open, when I press Escape, then the modal closes

---

*This PRD is approved for functional specification development. Once approved, GitHub issues can be created for each user story.*
