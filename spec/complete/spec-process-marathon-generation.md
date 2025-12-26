---
title: Marathon Generation Process Specification
version: 0.1
date_created: 2025-12-18
last_updated: 2025-12-18
owner: kryten
tags: [process, playlist, marathon, algorithm]
---

# Introduction

This specification defines how `kryten-playlist` generates marathons from multiple playlist sources, including interleaving patterns and best-effort episodic run-order preservation.

## 1. Purpose & Scope

**Purpose**: Define deterministic, testable algorithms for concatenate/shuffle/interleave and episode parsing.

**Scope**:
- Input sources
- Interleave pattern syntax
- Episode (S/E) parsing rules
- Output semantics and edge cases

## 2. Definitions

- **Source**: A playlist (or future category selection) contributing items.
- **Token**: Pattern element specifying source label and repeat count.

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: System shall support concatenate, shuffle, and interleave methods.
- **REQ-002**: Shuffle shall be deterministic when a seed is provided.
- **REQ-003**: Interleave shall support round-robin, weighted blocks, and custom repeating pattern syntax.
- **REQ-004**: System shall attempt to preserve episodic run order within each source when `preserve_episode_order=true`.
- **CON-001**: If episode parsing fails for items, fall back to existing source order.

## 4. Interfaces & Data Contracts

### 4.1 Input schema

```json
{
  "sources": [
    {
      "label": "A",
      "items": [{"video_id":"string","title":"string"}]
    }
  ],
  "method": "concatenate|shuffle|interleave",
  "shuffle_seed": "string|null",
  "interleave_pattern": "string|null",
  "preserve_episode_order": true
}
```

### 4.2 Output schema

```json
{ "items": [{"video_id":"string","title":"string"}], "warnings": ["string"] }
```

### 4.3 Pattern syntax (normative)

- Labels: `A`..`Z` assigned by selection order.
- Token: `<label><count?>` where count default is 1.
- Separators: whitespace, comma, dash, pipe.
- Pattern repeats until all sources exhausted.
- Validation:
  - Unknown label: error
  - Count < 1: error

Examples:
- `A B` → A,B,A,B,...
- `A2B2` → A,A,B,B,...
- `A2B1C2` → A,A,B,C,C,... (repeat)

## 5. Acceptance Criteria

- **AC-001**: Given sources A and B, when pattern is `A B`, then output alternates until one source exhausted, then continues with remaining source.
- **AC-002**: Given seed `xyz`, when shuffle is executed twice on same input, then output order is identical.
- **AC-003**: Given preserve_episode_order enabled and titles contain parseable S/E, then per-source order is ascending by (season, episode).

## 6. Test Automation Strategy

- Unit tests for pattern parser.
- Property tests for pattern repetition and exhaustion behavior.
- Unit tests for episode parsing across known title formats.

## 7. Rationale & Context

- Interleaving provides TV-style marathons.
- Episode parsing is best-effort due to title variability.

## 8. Dependencies & External Integrations

None.

## 9. Examples & Edge Cases

### 9.1 Episode parsing patterns

The system should recognize (case-insensitive) at least:
- `S01E04`
- `s01e4`
- `s01.e04`
- `S01 E04`

If multiple matches exist, use the first plausible match.

### 9.2 Edge case: Mixed episode and non-episode items

- When only some items parse, keep parsed items sorted and append unparsed in original relative order, OR preserve original order entirely (implementation must choose one and document it). Default: preserve original order for unparsed items and keep parsed in order.

## 10. Validation Criteria

- Pattern parser rejects invalid labels/counts.
- Episode parser returns deterministic (season, episode) or None.

## 11. Related Specifications / Further Reading

- [spec/prd.md](prd.md)
- [spec/spec-schema-http-api-and-auth.md](spec-schema-http-api-and-auth.md)
