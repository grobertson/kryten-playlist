# Catalog Management Guide

This guide describes how to use the `kryten-catalog` CLI tool to manage the media catalog, including ingesting content from MediaCMS and enriching metadata using LLMs (Large Language Models).

## Overview

The catalog management workflow consists of two main steps:
1. **Ingest**: Fetch raw media items from a MediaCMS instance and store them in the local database.
2. **Enrich**: Use an LLM (like OpenAI GPT-4 or a local Ollama model) to generate rich metadata including synopses, genres, moods, and tags.

## Installation

Ensure the package is installed with the necessary dependencies:

```bash
# From the project root
pip install -e .
# OR if using poetry
poetry install
```

The CLI tool is available as `kryten-catalog` or via `python -m kryten_playlist.catalog.cli`.

---

## Command Reference

### Global Options

*   `--db PATH`: Path to the SQLite database (default: `data/catalog.db`).
*   `--help`: Show help message.

### 1. Ingest

Fetches all media items from the configured MediaCMS instance. It now displays detailed timing statistics including average time per item and processing rate.

**Usage:**

```bash
kryten-catalog ingest [OPTIONS]
```

**Options:**

*   `--base-url URL`: MediaCMS Base URL (default: `https://www.420grindhouse.com`).
*   `--timeout FLOAT`: Request timeout in seconds (default: 30.0).
*   `--concurrency INT`: Number of concurrent requests (default: 24).

**Example:**

```bash
kryten-catalog ingest --base-url "https://my-mediacms.local"
```

### 2. Stats

Shows general statistics about the catalog (item counts, categories, enrichment status).

**Usage:**

```bash
kryten-catalog stats
```

### 3. Enrich

Enriches catalog items with metadata using an LLM.

**Global Enrichment Options:**

These options can be passed to the `enrich` group command or set via environment variables.

*   `--api-key TEXT`: LLM API Key (Env: `LLM_API_KEY`). Required.
*   `--api-base TEXT`: LLM API Base URL (Env: `LLM_API_BASE`). Default: `https://api.openai.com/v1`.
*   `--model TEXT`: Model name (Env: `LLM_MODEL`). Default: `gpt-4o-mini`.
*   `--timeout FLOAT`: Request timeout in seconds. Default: 240.0.

#### A. Enrich Single Item

Useful for testing prompt performance on a specific title.

```bash
kryten-catalog enrich [LLM_OPTIONS] single "The Matrix" [--dry-run]
```

#### B. Enrich Sample

Enrich a random sample of items to verify configuration.

```bash
kryten-catalog enrich [LLM_OPTIONS] sample --count 5 [--dry-run]
```

#### C. Enrich Batch (Production Mode)

Process all unenriched items in the database.

**Options:**

*   `--limit INT`: Maximum items to process.
*   `--concurrency INT`: Number of concurrent workers (default: 1).
*   `--delay FLOAT`: Delay between API calls per worker (default: 0.5s).
*   `--tv-only / --movies-only`: Filter content type.
*   `--dry-run`: Preview changes without saving.
*   `--random-dry-run`: Preview changes on a RANDOM sample of items (implies `--dry-run`).
*   `--force-all`: Re-process ALL items, even those already enriched.
*   `--raw-output`: Disable human-readable timing output (show raw ms/sec).

**Example: High-Performance Local Batch**

```bash
kryten-catalog enrich \
  --api-base "http://localhost:11434/v1" \
  --api-key "ollama" \
  --model "llama3" \
  --timeout 300 \
  batch \
  --concurrency 4 \
  --limit 1000 \
  --force-all
```

**Example: Random Test Run**

```bash
kryten-catalog enrich batch --limit 10 --random-dry-run
```

#### D. Enrichment Stats

Shows detailed statistics about the enrichment process (genres, moods, tags).

```bash
kryten-catalog enrich stats
```

---

## Local Inference (Ollama) Setup

To use a local Ollama instance for enrichment:

1.  **Start Ollama**: Ensure your Ollama server is running (e.g., `ollama serve`).
2.  **Pull Model**: `ollama pull llama3` (or your preferred model).
3.  **Run Command**:

    ```bash
    export LLM_API_KEY="ollama"  # Value doesn't matter for Ollama, but must be present
    export LLM_API_BASE="http://localhost:11434/v1"
    export LLM_MODEL="llama3"

    kryten-catalog enrich batch --concurrency 4
    ```

## Troubleshooting

*   **Timeouts**: If using a slow local model or high concurrency, increase the timeout using `--timeout 300`.
*   **"No items found"**: By default, `batch` only processes *unenriched* items. Use `--force-all` to re-process everything.
*   **JSON Errors**: If the LLM returns invalid JSON, check the logs. Smaller models (< 7B parameters) may struggle with the strict JSON schema.
*   **Performance**: Use the timing summary at the end of a batch run to tune your `--concurrency` settings.
