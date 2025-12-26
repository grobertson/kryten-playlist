"""Tests for the MediaCMS connector."""

from __future__ import annotations

import re

import pytest
from pytest_httpx import HTTPXMock

from kryten_playlist.catalog.mediacms_connector import (
    MediaCMSConnector,
    cytube_manifest_url,
)


@pytest.fixture
def base_url() -> str:
    return "https://media.example.com"


@pytest.mark.asyncio
async def test_iter_items_parses_media_list(httpx_mock: HTTPXMock, base_url: str) -> None:
    """MediaCMSConnector should parse media items from API response."""
    # Mock categories response
    httpx_mock.add_response(
        url=f"{base_url}/api/v1/categories",
        json=[
            {"id": 1, "title": "Movies"},
            {"id": 2, "title": "TV Shows"},
        ],
    )

    # Mock media response (page 1)
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json=[
            {
                "friendly_token": "abc123",
                "title": "Test Video",
                "categories": [1],
                "duration": 3600,
                "thumbnail_url": "https://media.example.com/thumb/abc123.jpg",
            },
            {
                "friendly_token": "def456",
                "title": "Another Video",
                "categories": [2],
                "duration": 1800,
                "thumbnail_url": None,
            },
        ],
    )

    # Mock empty page 2
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json=[],
    )

    connector = MediaCMSConnector(base_url=base_url)
    items = [item async for item in connector.iter_items()]
    items.sort(key=lambda x: x.video_id)

    assert len(items) == 2
    assert items[0].video_id == "abc123"
    assert items[0].title == "Test Video"
    assert items[0].categories == ["Movies"]
    assert items[0].duration_seconds == 3600
    assert items[0].thumbnail_url == "https://media.example.com/thumb/abc123.jpg"

    assert items[1].video_id == "def456"
    assert items[1].title == "Another Video"
    assert items[1].categories == ["TV Shows"]
    assert items[1].duration_seconds == 1800
    assert items[1].thumbnail_url is None


@pytest.mark.asyncio
async def test_iter_items_handles_paginated_response(httpx_mock: HTTPXMock, base_url: str) -> None:
    """MediaCMSConnector should handle DRF-style pagination."""
    httpx_mock.add_response(
        url=f"{base_url}/api/v1/categories",
        json=[],
    )

    # Page 1 with "next" indicator
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json={
            "count": 3,
            "next": f"{base_url}/api/v1/media?page=2",
            "previous": None,
            "results": [
                {"friendly_token": "vid1", "title": "Video 1"},
                {"friendly_token": "vid2", "title": "Video 2"},
            ],
        },
    )

    # Page 2
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json={
            "count": 3,
            "next": None,
            "previous": f"{base_url}/api/v1/media?page=1",
            "results": [
                {"friendly_token": "vid3", "title": "Video 3"},
            ],
        },
    )

    # Empty page 3 to stop iteration
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json={"results": []},
    )

    connector = MediaCMSConnector(base_url=base_url)
    items = [item async for item in connector.iter_items()]
    items.sort(key=lambda x: x.video_id)

    assert len(items) == 3
    assert [it.video_id for it in items] == ["vid1", "vid2", "vid3"]


@pytest.mark.asyncio
async def test_iter_items_handles_category_objects(httpx_mock: HTTPXMock, base_url: str) -> None:
    """MediaCMSConnector should handle categories as embedded objects."""
    httpx_mock.add_response(
        url=f"{base_url}/api/v1/categories",
        json=[],
    )

    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        json=[
            {
                "friendly_token": "xyz",
                "title": "Video with Object Cats",
                "categories": [
                    {"id": 1, "title": "Action"},
                    {"id": 2, "name": "Comedy"},  # Some APIs use "name"
                ],
            },
        ],
    )

    httpx_mock.add_response(url=re.compile(r".*/api/v1/media.*"), json=[])

    connector = MediaCMSConnector(base_url=base_url)
    items = [item async for item in connector.iter_items()]

    assert len(items) == 1
    assert items[0].categories == ["Action", "Comedy"]


@pytest.mark.asyncio
async def test_iter_items_handles_api_error(httpx_mock: HTTPXMock, base_url: str) -> None:
    """MediaCMSConnector should handle API errors gracefully."""
    httpx_mock.add_response(
        url=f"{base_url}/api/v1/categories",
        status_code=500,
    )

    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/media.*"),
        status_code=503,
    )

    connector = MediaCMSConnector(base_url=base_url)
    items = [item async for item in connector.iter_items()]

    # Should return empty list on error
    assert items == []


def test_cytube_manifest_url(base_url: str) -> None:
    """cytube_manifest_url should generate correct manifest URLs."""
    url = cytube_manifest_url(base_url, "abc123")
    assert url == "https://media.example.com/api/v1/media/cytube/abc123.json"


def test_cytube_manifest_url_strips_trailing_slash() -> None:
    """cytube_manifest_url should handle trailing slashes."""
    url = cytube_manifest_url("https://media.example.com/", "token")
    assert url == "https://media.example.com/api/v1/media/cytube/token.json"


def test_catalog_item_manifest_url() -> None:
    """CatalogItem.manifest_url should use the Cytube format."""
    from kryten_playlist.catalog import CatalogItem

    item = CatalogItem(video_id="mytoken", title="Test")
    url = item.manifest_url("https://media.example.com")

    assert url == "https://media.example.com/api/v1/media/cytube/mytoken.json?format=json"
