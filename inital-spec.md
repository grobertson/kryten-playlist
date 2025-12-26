# Initial Specification: Kryten-Playlist Service Integration with MediaCMS.io

## Overview

The `kryten-playlist` service will provide a modern, dynamic web interface and backend for managing, searching, and manipulating video playlists, integrating tightly with a legacy MediaCMS.io instance and Cytube. The service will enable users to search, group, and manage media items from the MediaCMS catalog, create and manipulate playlists, and interact with Cytube for queue management. The system will be designed for extensibility, maintainability, and seamless integration with the existing Kryten ecosystem.

## Key Requirements

### 1. MediaCMS Catalog Integration

- **Catalog Indexing**: Periodically or on-demand, extract a time-frozen index of all items in the MediaCMS.io catalog (approx. 5000 items).
  - Minimum fields: Item name, video ID, category.
  - Store this index in a fast, queryable format (e.g., SQLite, JSON, or a lightweight DB).
- **Manifest URL Generation**: For each item, generate a Cytube-compatible manifest URL using the video ID (e.g., `https://www.420grindhouse.com/api/v1/media/cytube/{video_id}.json?format=json`).
- **No MediaCMS Upgrades**: Integration must work with the current MediaCMS version, avoiding upgrades unless strictly necessary.

### 2. Web Interface

- **Modern UI**: Provide a dynamic, responsive web interface for:
  - Searching by title or category
  - Grouping and filtering items
  - Creating, saving, and naming playlists
  - Viewing, editing, and merging playlists (e.g., for marathons)
  - Manually adjusting playlist order
  - Listing and selecting saved playlists for queue insertion
- **Playlist Management**:
  - Allow users to save, load, merge, and delete playlists
  - Support temporary and named playlists
  - Allow combining playlists and manual reordering

### 3. Cytube Integration

- **Queue Management**:
  - Allow administrators and blessed users to select a playlist and replace the Cytube queue with its contents
  - Use the manifest URLs for queue insertion
  - Playlists can be inserted via web or PM command
- **User Permissions**:
  - Maintain a separate list of "blessed users" (independent of Cytube's permission levels)
  - Only blessed users and admins can perform queue replacement and playlist management actions

### 4. Service Architecture

- **Python/Poetry**: Use Python with Poetry for packaging and dependency management
- **Systemd**: Provide a systemd service file for deployment
- **NATS Integration**: Connect to the local NATS bus for inter-service communication (with kryten-robot, kryten-userstats, kryten-llm, kryten-moderator, etc.)
- **Admin Tools**: Support administration via kryten-shell and kryten-cli
- **Versioning**: Implement a single source of truth for the version number in `pyproject.toml`, consistent with other Kryten services
- **Codebase Cleanup**: Remove all references to "moderator" from the codebase, replacing with appropriate playlist terminology

## Stretch Goals

- **Advanced Search**: Fuzzy search, tag-based filtering, and category hierarchies (HIGH PRIORITY)
- **Playlist Export/Import**: Allow playlists to be exported/imported as JSON (LOW PRIORITY)
- **Audit Logging**: Track playlist changes and queue insertions for admin review (V LOW PRIORITY)
- **User Interface Enhancements**: Drag-and-drop reordering, batch actions, and playlist previews (HUGE PRIORITY)

## Non-Goals

- Upgrading MediaCMS.io beyond the current version
- Deep parsing or validation of Cytube manifest JSON (service only needs to generate and pass URLs)

## Open Questions

- Should playlist changes be broadcast to all connected clients in real time? This is handled by cytube. Just queue the media.
- What is the preferred authentication mechanism for the web interface? Flexible, the server does have a valid https name (www.420grindhouse.com)
- Should playlist history be retained for audit or rollback? I think this is already being held in the userstats database. 

---

*This document serves as the initial specification for the Kryten-Playlist service integration with MediaCMS.io and Cytube. It will be updated as requirements evolve.*
