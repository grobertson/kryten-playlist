# Spec 006: MCP Server for Playlist & Catalog Integration

## Status: Draft
## Author: System
## Created: 2024-12-20

---

## 1. Introduction

### 1.1 Purpose

This specification defines a Model Context Protocol (MCP) server that exposes kryten-playlist's catalog and queue management capabilities to AI agents, specifically kryten-llm. The MCP server enables natural language interactions with the video catalog, playlist management, and queue operations.

### 1.2 Scope

- Catalog search and browsing
- Playlist CRUD operations
- Queue manipulation
- Marathon scheduling queries
- Role-based access control integration

### 1.3 Out of Scope

- Direct CyTube socket communication (handled by kryten-py/Kryten-Robot)
- LLM prompt engineering (handled by kryten-llm)
- User authentication (sessions passed from kryten-llm)

---

## 2. Architecture

### 2.1 System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                         kryten-llm                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ TriggerEngine│  │ LLMManager  │  │ MCP Client (Tool Calls) │  │
│  └─────────────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│                          │                      │                │
└──────────────────────────┼──────────────────────┼────────────────┘
                           │                      │
                           │              ┌───────▼───────┐
                           │              │  kryten-mcp   │
                           │              │  MCP Server   │
                           │              └───────┬───────┘
                           │                      │
              ┌────────────┼──────────────────────┼────────────┐
              │            ▼                      ▼            │
              │    ┌──────────────┐      ┌──────────────┐      │
              │    │    NATS      │      │   SQLite     │      │
              │    │  (KV + Cmd)  │      │  (Catalog)   │      │
              │    └──────────────┘      └──────────────┘      │
              │              kryten-playlist infrastructure     │
              └─────────────────────────────────────────────────┘
```

### 2.2 Transport Options

| Transport | Use Case | Pros | Cons |
|-----------|----------|------|------|
| **stdio** | Local deployment | Simple, no network | Must spawn process |
| **SSE** | Service deployment | Independent scaling | HTTP overhead |
| **Streamable HTTP** | Future-proof | Modern MCP standard | Newer, less tooling |

**Recommendation**: Start with **stdio** for simplicity, with SSE as a configuration option.

### 2.3 Package Structure

```
kryten-mcp/
├── pyproject.toml
├── README.md
├── config.example.json
├── kryten_mcp/
│   ├── __init__.py
│   ├── __main__.py              # Entry point
│   ├── config.py                # Configuration
│   ├── server.py                # MCP server setup
│   ├── context.py               # Shared state (NATS, SQLite connections)
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── catalog.py           # Catalog search tools
│   │   ├── playlists.py         # Playlist management tools
│   │   ├── queue.py             # Queue manipulation tools
│   │   └── marathon.py          # Marathon query tools
│   └── resources/
│       ├── __init__.py
│       ├── catalog.py           # Catalog resources
│       └── queue.py             # Queue state resources
└── tests/
    ├── test_catalog_tools.py
    ├── test_playlist_tools.py
    └── test_queue_tools.py
```

---

## 3. MCP Tools

### 3.1 Catalog Tools

#### 3.1.1 `catalog_search`

Search the video catalog by title and/or category.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "q": {
      "type": "string",
      "description": "Search query for video titles (partial match)"
    },
    "categories": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Filter by category names"
    },
    "limit": {
      "type": "integer",
      "default": 20,
      "minimum": 1,
      "maximum": 100,
      "description": "Maximum results to return"
    },
    "offset": {
      "type": "integer",
      "default": 0,
      "minimum": 0,
      "description": "Pagination offset"
    }
  },
  "required": []
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "video_id": { "type": "string" },
          "title": { "type": "string" },
          "categories": { "type": "array", "items": { "type": "string" } },
          "duration_seconds": { "type": "integer", "nullable": true },
          "manifest_url": { "type": "string" }
        }
      }
    },
    "total": { "type": "integer" },
    "snapshot_id": { "type": "string" }
  }
}
```

**Example Usage:**
```
User: "Find horror movies"
LLM Tool Call: catalog_search(categories=["Horror"])

User: "What Friday the 13th movies do we have?"
LLM Tool Call: catalog_search(q="Friday the 13th")
```

#### 3.1.2 `catalog_categories`

List all available categories in the catalog.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "categories": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

#### 3.1.3 `catalog_get_video`

Get details for a specific video by ID.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "video_id": {
      "type": "string",
      "description": "The video ID (friendly token)"
    }
  },
  "required": ["video_id"]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "video_id": { "type": "string" },
    "title": { "type": "string" },
    "categories": { "type": "array", "items": { "type": "string" } },
    "duration_seconds": { "type": "integer", "nullable": true },
    "thumbnail_url": { "type": "string", "nullable": true },
    "manifest_url": { "type": "string" }
  }
}
```

---

### 3.2 Playlist Tools

#### 3.2.1 `playlist_list`

List all saved playlists.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "playlists": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "playlist_id": { "type": "string" },
          "name": { "type": "string" },
          "updated_at": { "type": "string", "format": "date-time" }
        }
      }
    }
  }
}
```

#### 3.2.2 `playlist_get`

Get full details of a playlist including its items.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "playlist_id": {
      "type": "string",
      "description": "Playlist ID"
    }
  },
  "required": ["playlist_id"]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "playlist_id": { "type": "string" },
    "name": { "type": "string" },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "video_id": { "type": "string" },
          "title": { "type": "string" },
          "duration_seconds": { "type": "integer", "nullable": true }
        }
      }
    },
    "total_duration_seconds": { "type": "integer" },
    "created_by": { "type": "string" },
    "created_at": { "type": "string", "format": "date-time" }
  }
}
```

#### 3.2.3 `playlist_create`

Create a new playlist from video IDs.

**Required Role:** `blessed` or `admin`

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Playlist name",
      "minLength": 1,
      "maxLength": 100
    },
    "video_ids": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of video IDs to include",
      "minItems": 1
    }
  },
  "required": ["name", "video_ids"]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "playlist_id": { "type": "string" },
    "name": { "type": "string" },
    "item_count": { "type": "integer" }
  }
}
```

#### 3.2.4 `playlist_update`

Update an existing playlist.

**Required Role:** `blessed` or `admin`

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "playlist_id": { "type": "string" },
    "name": { "type": "string", "nullable": true },
    "video_ids": {
      "type": "array",
      "items": { "type": "string" },
      "nullable": true
    }
  },
  "required": ["playlist_id"]
}
```

#### 3.2.5 `playlist_delete`

Delete a playlist.

**Required Role:** `admin`

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "playlist_id": { "type": "string" }
  },
  "required": ["playlist_id"]
}
```

---

### 3.3 Queue Tools

#### 3.3.1 `queue_apply_playlist`

Apply a saved playlist to the live CyTube queue.

**Required Role:** `blessed` (or `admin` for `hard_replace` mode)

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "playlist_id": {
      "type": "string",
      "description": "Playlist ID to apply"
    },
    "mode": {
      "type": "string",
      "enum": ["append", "preserve_current", "hard_replace"],
      "default": "append",
      "description": "How to apply: append to end, clear except current video, or full replace"
    }
  },
  "required": ["playlist_id"]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "status": { "type": "string", "enum": ["ok", "error"] },
    "enqueued_count": { "type": "integer" },
    "failed": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "video_id": { "type": "string" },
          "error": { "type": "string" }
        }
      }
    }
  }
}
```

**Example Usage:**
```
User: "Queue up the Friday the 13th marathon"
LLM: 
  1. playlist_list() → find "Friday the 13th Marathon"
  2. queue_apply_playlist(playlist_id="abc123", mode="append")
```

#### 3.3.2 `queue_add_video`

Add a single video to the queue.

**Required Role:** `blessed` or `admin`

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "video_id": {
      "type": "string",
      "description": "Video ID from catalog"
    },
    "position": {
      "type": "string",
      "enum": ["end", "next"],
      "default": "end",
      "description": "Where to add: end of queue or after current video"
    }
  },
  "required": ["video_id"]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "status": { "type": "string", "enum": ["ok", "error"] },
    "correlation_id": { "type": "string" }
  }
}
```

#### 3.3.3 `queue_add_videos`

Add multiple videos to the queue.

**Required Role:** `blessed` or `admin`

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "video_ids": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Video IDs from catalog",
      "minItems": 1,
      "maxItems": 50
    },
    "position": {
      "type": "string",
      "enum": ["end", "next"],
      "default": "end"
    }
  },
  "required": ["video_ids"]
}
```

#### 3.3.4 `queue_status`

Get current queue state (read from NATS KV).

**Input Schema:**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "current_video": {
      "type": "object",
      "nullable": true,
      "properties": {
        "title": { "type": "string" },
        "duration_seconds": { "type": "integer" },
        "elapsed_seconds": { "type": "integer" }
      }
    },
    "queue_length": { "type": "integer" },
    "total_duration_seconds": { "type": "integer" },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "uid": { "type": "string" },
          "title": { "type": "string" },
          "duration_seconds": { "type": "integer" }
        }
      }
    }
  }
}
```

---

### 3.4 Marathon Tools

#### 3.4.1 `marathon_list`

List scheduled marathons.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "include_past": {
      "type": "boolean",
      "default": false,
      "description": "Include completed marathons"
    }
  },
  "required": []
}
```

#### 3.4.2 `marathon_get`

Get details of a specific marathon.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "marathon_id": { "type": "string" }
  },
  "required": ["marathon_id"]
}
```

---

## 4. MCP Resources

Resources provide read-only contextual data that the LLM can reference.

### 4.1 Resource URIs

| URI Pattern | Description | MIME Type |
|-------------|-------------|-----------|
| `catalog://categories` | All category names | `application/json` |
| `catalog://stats` | Catalog statistics | `application/json` |
| `queue://current` | Current queue state | `application/json` |
| `playlist://index` | All playlist summaries | `application/json` |
| `playlist://{id}` | Specific playlist | `application/json` |

### 4.2 Resource Templates

```python
@server.list_resource_templates()
async def list_templates():
    return [
        ResourceTemplate(
            uriTemplate="playlist://{playlist_id}",
            name="Playlist by ID",
            description="Get a specific playlist's contents",
            mimeType="application/json"
        )
    ]
```

---

## 5. Security & Authorization

### 5.1 Role Requirements

| Tool | Required Role | Notes |
|------|---------------|-------|
| `catalog_search` | `viewer` | Read-only |
| `catalog_categories` | `viewer` | Read-only |
| `catalog_get_video` | `viewer` | Read-only |
| `playlist_list` | `viewer` | Read-only |
| `playlist_get` | `viewer` | Read-only |
| `playlist_create` | `blessed` | Write operation |
| `playlist_update` | `blessed` | Write operation |
| `playlist_delete` | `admin` | Destructive |
| `queue_status` | `viewer` | Read-only |
| `queue_add_video` | `blessed` | Write operation |
| `queue_add_videos` | `blessed` | Write operation |
| `queue_apply_playlist` | `blessed` | `admin` for hard_replace |
| `marathon_list` | `viewer` | Read-only |
| `marathon_get` | `viewer` | Read-only |

### 5.2 Session Context

The MCP server receives session context from kryten-llm via tool call metadata:

```json
{
  "session": {
    "username": "someuser",
    "role": "blessed",
    "session_id": "abc123"
  }
}
```

The MCP server validates the session against NATS KV before executing privileged operations.

### 5.3 Audit Logging

All write operations are logged:

```json
{
  "timestamp": "2024-12-20T10:30:00Z",
  "tool": "queue_apply_playlist",
  "username": "someuser",
  "role": "blessed",
  "input": { "playlist_id": "xyz", "mode": "append" },
  "result": { "status": "ok", "enqueued_count": 5 }
}
```

---

## 6. Configuration

### 6.1 Config Schema

```json
{
  "nats_url": "nats://localhost:4222",
  "nats_subject_prefix": "kryten",
  "namespace": "default",
  "sqlite_path": "./data/catalog.sqlite3",
  
  "mcp": {
    "transport": "stdio",
    "sse_port": 8089,
    "enable_resources": true,
    "enable_prompts": false,
    "max_results_per_search": 100
  },
  
  "cytube_domain": "cytu.be",
  "cytube_channel": "lounge"
}
```

### 6.2 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `KRYTEN_MCP_CONFIG` | Path to config file | `./config.json` |
| `KRYTEN_MCP_TRANSPORT` | `stdio` or `sse` | `stdio` |
| `KRYTEN_MCP_LOG_LEVEL` | Logging level | `INFO` |

---

## 7. Integration with kryten-llm

### 7.1 MCP Client Configuration

Add to kryten-llm's config:

```json
{
  "mcp": {
    "servers": [
      {
        "name": "playlist",
        "command": "python",
        "args": ["-m", "kryten_mcp"],
        "env": {
          "KRYTEN_MCP_CONFIG": "/path/to/config.json"
        }
      }
    ]
  }
}
```

### 7.2 System Prompt Integration

The LLM's system prompt should include tool awareness:

```
You have access to the following playlist management capabilities:
- Search the video catalog by title or category
- List and view saved playlists
- Add videos to the queue (requires blessed role)
- Apply entire playlists to the queue

When users ask about videos or playlists, use the catalog_search and playlist_list 
tools to find relevant content before responding.
```

### 7.3 Conversation Flow Example

```
User: "Hey Kryten, queue up some horror movies for tonight"

LLM Internal:
  1. catalog_search(categories=["Horror"], limit=10)
  2. Receives list of horror movies
  3. Presents options or creates ad-hoc selection
  4. queue_add_videos(video_ids=["a", "b", "c"])

LLM Response: "I've added 'Halloween', 'Friday the 13th', and 
'A Nightmare on Elm Street' to the queue. Should be about 
5 hours of spooky entertainment!"
```

---

## 8. Error Handling

### 8.1 Error Response Format

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Error: Insufficient permissions. This operation requires 'blessed' role."
    }
  ]
}
```

### 8.2 Error Codes

| Code | Description | HTTP Equivalent |
|------|-------------|-----------------|
| `unauthorized` | No valid session | 401 |
| `forbidden` | Insufficient role | 403 |
| `not_found` | Resource not found | 404 |
| `conflict` | Name already exists | 409 |
| `validation_error` | Invalid input | 400 |
| `nats_error` | NATS connection issue | 503 |
| `internal_error` | Unexpected error | 500 |

---

## 9. Implementation Phases

### Phase 1: Core Read Operations
- [ ] Project scaffolding with MCP SDK
- [ ] NATS and SQLite connection management
- [ ] `catalog_search`, `catalog_categories`, `catalog_get_video`
- [ ] `playlist_list`, `playlist_get`
- [ ] `queue_status`
- [ ] Basic resources: `catalog://categories`, `queue://current`

### Phase 2: Write Operations
- [ ] Session validation integration
- [ ] `playlist_create`, `playlist_update`
- [ ] `queue_add_video`, `queue_add_videos`
- [ ] `queue_apply_playlist`
- [ ] Audit logging

### Phase 3: Advanced Features
- [ ] `playlist_delete`
- [ ] `marathon_list`, `marathon_get`
- [ ] SSE transport option
- [ ] MCP prompts for common workflows

### Phase 4: kryten-llm Integration
- [ ] MCP client configuration
- [ ] System prompt updates
- [ ] End-to-end testing
- [ ] Documentation

---

## 10. Testing Strategy

### 10.1 Unit Tests

- Tool input validation
- Response formatting
- Role permission checks

### 10.2 Integration Tests

- NATS connectivity
- SQLite queries
- Full tool execution flows

### 10.3 E2E Tests

- MCP client ↔ server communication
- kryten-llm tool call handling
- Multi-step conversation scenarios

---

## 11. Dependencies

```toml
[project]
dependencies = [
    "mcp>=1.0.0",
    "kryten-py>=0.2.0",
    "aiosqlite>=0.19.0",
    "pydantic>=2.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
]
```

---

## 12. Open Questions

1. **Caching**: Should the MCP server cache catalog data, or always query SQLite?
2. **Rate Limiting**: Apply rate limits at MCP level or rely on kryten-llm's rate limiter?
3. **Prompts**: Should we implement MCP prompts for common workflows (e.g., "Create marathon from search")?
4. **Notifications**: Should queue changes trigger MCP notifications to the LLM?

---

## Appendix A: Example Tool Implementations

### A.1 catalog_search

```python
from mcp.server import Server
from mcp.types import Tool, TextContent

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "catalog_search":
        q = arguments.get("q")
        categories = arguments.get("categories", [])
        limit = min(arguments.get("limit", 20), 100)
        offset = arguments.get("offset", 0)
        
        repo = CatalogRepository(ctx.sqlite_conn)
        result = await repo.search(q=q, categories=categories, limit=limit, offset=offset)
        
        return [TextContent(
            type="text",
            text=json.dumps({
                "items": result.items,
                "total": result.total,
                "snapshot_id": result.snapshot_id
            }, indent=2)
        )]
```

### A.2 queue_apply_playlist

```python
@server.call_tool()
async def call_tool(name: str, arguments: dict, context: dict) -> list[TextContent]:
    if name == "queue_apply_playlist":
        session = context.get("session", {})
        role = session.get("role", "viewer")
        
        mode = arguments.get("mode", "append")
        
        # Check permissions
        if role not in ("blessed", "admin"):
            return [TextContent(type="text", text=json.dumps({
                "isError": True,
                "error": "forbidden",
                "message": "Requires blessed or admin role"
            }))]
        
        if mode == "hard_replace" and role != "admin":
            return [TextContent(type="text", text=json.dumps({
                "isError": True,
                "error": "forbidden", 
                "message": "hard_replace requires admin role"
            }))]
        
        # Execute via NATS command
        result = await apply_playlist_to_queue(
            client=ctx.nats_client,
            kv=ctx.kv,
            sqlite_conn=ctx.sqlite_conn,
            channel=ctx.config.cytube_channel,
            playlist_id=arguments["playlist_id"],
            mode=mode,
        )
        
        return [TextContent(type="text", text=json.dumps(result.as_dict(), indent=2))]
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2024-12-20 | System | Initial draft |
