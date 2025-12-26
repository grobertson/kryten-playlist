"""Tests for marathon generation algorithms."""

from __future__ import annotations

import pytest

from kryten_playlist.marathon import (
    MarathonItem,
    MarathonResult,
    MarathonSource,
    concatenate,
    generate_marathon,
    interleave,
    parse_episode,
    parse_pattern,
    shuffle,
    sort_items_by_episode,
)


# --------------------------------------------------------------------------- #
# Episode parsing
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize(
    "title,expected",
    [
        ("Show S01E04 - Title", (1, 4)),
        ("Show s01e04 - Title", (1, 4)),
        ("Show S01.E04 Title", (1, 4)),
        ("Show S01 E04 Title", (1, 4)),
        ("Show 1x04 Title", (1, 4)),
        ("Show S2E14 Title", (2, 14)),
        ("No episode info here", None),
        ("Season 1 Episode 4", None),  # Not a supported pattern
        ("E04 - Missing Season", None),
    ],
)
def test_parse_episode(title: str, expected: tuple[int, int] | None) -> None:
    assert parse_episode(title) == expected


def test_sort_items_by_episode() -> None:
    items = [
        MarathonItem("v3", "Show S01E03"),
        MarathonItem("v1", "Show S01E01"),
        MarathonItem("v5", "Show S02E01"),
        MarathonItem("v2", "Show S01E02"),
        MarathonItem("v0", "No episode info"),
    ]

    sorted_items = sort_items_by_episode(items)
    titles = [it.title for it in sorted_items]

    # Parseable first sorted by season then episode, unparsed at end
    assert titles == [
        "Show S01E01",
        "Show S01E02",
        "Show S01E03",
        "Show S02E01",
        "No episode info",
    ]


# --------------------------------------------------------------------------- #
# Pattern parsing
# --------------------------------------------------------------------------- #


def test_parse_pattern_simple() -> None:
    tokens = parse_pattern("ABC", {"A", "B", "C"})
    assert [(t.label, t.count) for t in tokens] == [("A", 1), ("B", 1), ("C", 1)]


def test_parse_pattern_with_counts() -> None:
    tokens = parse_pattern("A2B1C2", {"A", "B", "C"})
    assert [(t.label, t.count) for t in tokens] == [("A", 2), ("B", 1), ("C", 2)]


def test_parse_pattern_with_spaces() -> None:
    tokens = parse_pattern("A B C", {"A", "B", "C"})
    assert [(t.label, t.count) for t in tokens] == [("A", 1), ("B", 1), ("C", 1)]


def test_parse_pattern_lowercase() -> None:
    tokens = parse_pattern("a2b1", {"A", "B"})
    assert [(t.label, t.count) for t in tokens] == [("A", 2), ("B", 1)]


def test_parse_pattern_empty_raises() -> None:
    with pytest.raises(ValueError, match="pattern_empty"):
        parse_pattern("", {"A", "B"})


def test_parse_pattern_unknown_label_raises() -> None:
    with pytest.raises(ValueError, match="unknown_label:C"):
        parse_pattern("A B C", {"A", "B"})


# --------------------------------------------------------------------------- #
# Concatenate
# --------------------------------------------------------------------------- #


def test_concatenate_basic() -> None:
    src_a = MarathonSource("A", [MarathonItem("a1", "A1"), MarathonItem("a2", "A2")])
    src_b = MarathonSource("B", [MarathonItem("b1", "B1")])

    result = concatenate([src_b, src_a])  # Pass out of order

    # Should be sorted by label, so A first then B
    assert [it.video_id for it in result.items] == ["a1", "a2", "b1"]


def test_concatenate_with_episode_order() -> None:
    src_a = MarathonSource(
        "A",
        [
            MarathonItem("a2", "Show S01E02"),
            MarathonItem("a1", "Show S01E01"),
        ],
    )

    result = concatenate([src_a], preserve_episode_order=True)

    assert [it.video_id for it in result.items] == ["a1", "a2"]


# --------------------------------------------------------------------------- #
# Shuffle
# --------------------------------------------------------------------------- #


def test_shuffle_deterministic_with_seed() -> None:
    src_a = MarathonSource("A", [MarathonItem(f"a{i}", f"A{i}") for i in range(5)])
    src_b = MarathonSource("B", [MarathonItem(f"b{i}", f"B{i}") for i in range(5)])

    result1 = shuffle([src_a, src_b], seed="test-seed")
    result2 = shuffle([src_a, src_b], seed="test-seed")

    # Same seed => same order
    assert [it.video_id for it in result1.items] == [it.video_id for it in result2.items]


def test_shuffle_different_seeds() -> None:
    src_a = MarathonSource("A", [MarathonItem(f"a{i}", f"A{i}") for i in range(10)])

    result1 = shuffle([src_a], seed="seed-one")
    result2 = shuffle([src_a], seed="seed-two")

    # Different seeds => (almost certainly) different order
    order1 = [it.video_id for it in result1.items]
    order2 = [it.video_id for it in result2.items]
    assert order1 != order2


def test_shuffle_no_seed_random() -> None:
    src_a = MarathonSource("A", [MarathonItem(f"a{i}", f"A{i}") for i in range(10)])

    result1 = shuffle([src_a], seed=None)
    result2 = shuffle([src_a], seed=None)

    # Without seed, orders will likely differ (very small chance they match)
    # This is a probabilistic test, but 10! orderings make collision unlikely
    order1 = [it.video_id for it in result1.items]
    order2 = [it.video_id for it in result2.items]
    # Note: This could theoretically fail, but probability is 1/3628800
    # If it becomes flaky, we can remove this assertion
    assert order1 != order2 or len(order1) == 1


# --------------------------------------------------------------------------- #
# Interleave
# --------------------------------------------------------------------------- #


def test_interleave_simple_round_robin() -> None:
    src_a = MarathonSource("A", [MarathonItem("a1", "A1"), MarathonItem("a2", "A2")])
    src_b = MarathonSource("B", [MarathonItem("b1", "B1"), MarathonItem("b2", "B2")])

    result = interleave([src_a, src_b], "A B")

    assert [it.video_id for it in result.items] == ["a1", "b1", "a2", "b2"]


def test_interleave_with_counts() -> None:
    src_a = MarathonSource("A", [MarathonItem(f"a{i}", f"A{i}") for i in range(6)])
    src_b = MarathonSource("B", [MarathonItem(f"b{i}", f"B{i}") for i in range(3)])

    # Pattern: 2 from A, 1 from B, repeat
    result = interleave([src_a, src_b], "A2B1")

    assert [it.video_id for it in result.items] == [
        "a0", "a1", "b0",  # first cycle
        "a2", "a3", "b1",  # second cycle
        "a4", "a5", "b2",  # third cycle
    ]


def test_interleave_uneven_sources() -> None:
    src_a = MarathonSource("A", [MarathonItem("a1", "A1")])
    src_b = MarathonSource("B", [MarathonItem(f"b{i}", f"B{i}") for i in range(5)])

    result = interleave([src_a, src_b], "A B")

    # A exhausts after first item, B continues
    assert [it.video_id for it in result.items] == ["a1", "b0", "b1", "b2", "b3", "b4"]


def test_interleave_with_episode_order() -> None:
    src_a = MarathonSource(
        "A",
        [
            MarathonItem("a2", "Show S01E02"),
            MarathonItem("a1", "Show S01E01"),
        ],
    )
    src_b = MarathonSource("B", [MarathonItem("b1", "B1"), MarathonItem("b2", "B2")])

    result = interleave([src_a, src_b], "A B", preserve_episode_order=True)

    # A items sorted by episode before interleaving
    assert [it.video_id for it in result.items] == ["a1", "b1", "a2", "b2"]


# --------------------------------------------------------------------------- #
# High-level generate_marathon
# --------------------------------------------------------------------------- #


def test_generate_marathon_concatenate() -> None:
    src_a = MarathonSource("A", [MarathonItem("a1", "A1")])
    src_b = MarathonSource("B", [MarathonItem("b1", "B1")])

    result = generate_marathon([src_a, src_b], method="concatenate")

    assert [it.video_id for it in result.items] == ["a1", "b1"]


def test_generate_marathon_shuffle() -> None:
    src_a = MarathonSource("A", [MarathonItem(f"a{i}", f"A{i}") for i in range(5)])

    result1 = generate_marathon([src_a], method="shuffle", shuffle_seed="seed")
    result2 = generate_marathon([src_a], method="shuffle", shuffle_seed="seed")

    assert [it.video_id for it in result1.items] == [it.video_id for it in result2.items]


def test_generate_marathon_interleave() -> None:
    src_a = MarathonSource("A", [MarathonItem("a1", "A1"), MarathonItem("a2", "A2")])
    src_b = MarathonSource("B", [MarathonItem("b1", "B1"), MarathonItem("b2", "B2")])

    result = generate_marathon(
        [src_a, src_b], method="interleave", interleave_pattern="A B"
    )

    assert [it.video_id for it in result.items] == ["a1", "b1", "a2", "b2"]


def test_generate_marathon_interleave_default_pattern() -> None:
    src_a = MarathonSource("A", [MarathonItem("a1", "A1")])
    src_b = MarathonSource("B", [MarathonItem("b1", "B1")])

    # No pattern provided, should default to "A B"
    result = generate_marathon([src_a, src_b], method="interleave")

    assert [it.video_id for it in result.items] == ["a1", "b1"]


def test_generate_marathon_unknown_method() -> None:
    src_a = MarathonSource("A", [MarathonItem("a1", "A1")])

    result = generate_marathon([src_a], method="zigzag")

    assert result.items == []
    assert "unknown_method:zigzag" in result.warnings


def test_marathon_item_to_dict() -> None:
    item = MarathonItem("v1", "Title 1")
    assert item.to_dict() == {"video_id": "v1", "title": "Title 1"}


def test_marathon_result_to_dict() -> None:
    result = MarathonResult(
        items=[MarathonItem("v1", "T1"), MarathonItem("v2", "T2")],
        warnings=["warn1"],
    )
    d = result.to_dict()
    assert d["items"] == [
        {"video_id": "v1", "title": "T1"},
        {"video_id": "v2", "title": "T2"},
    ]
    assert d["warnings"] == ["warn1"]
