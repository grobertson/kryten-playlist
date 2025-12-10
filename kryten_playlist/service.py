"""Main service class for kryten-playlist."""

import asyncio
import logging
from pathlib import Path

from kryten import KrytenClient

from kryten_playlist.config import Config


logger = logging.getLogger(__name__)


class PlaylistService:
    """Kryten Playlist Service."""

    def __init__(self, config_path: Path):
        """Initialize the service."""
        self.config = Config(config_path)
        self.client = KrytenClient(
            nats_url=self.config.nats_url,
            subject_prefix=self.config.nats_subject_prefix,
            service_name=self.config.service_name,
        )
        self._shutdown_event = asyncio.Event()

    async def start(self) -> None:
        """Start the service."""
        logger.info("Starting playlist service")

        # Connect to NATS
        await self.client.connect()

        # Subscribe to events
        await self.client.subscribe("queue", self._handle_queue)
        await self.client.subscribe("delete", self._handle_delete)
        await self.client.subscribe("moveVideo", self._handle_move_video)
        await self.client.subscribe("setTemp", self._handle_set_temp)

        logger.info("Playlist service started")

    async def stop(self) -> None:
        """Stop the service."""
        logger.info("Stopping playlist service")
        self._shutdown_event.set()

        # Disconnect from NATS
        await self.client.disconnect()

        logger.info("Playlist service stopped")

    async def wait_for_shutdown(self) -> None:
        """Wait for shutdown signal."""
        await self._shutdown_event.wait()

    async def _handle_queue(self, subject: str, data: dict) -> None:
        """Handle queue events."""
        item = data.get("item", {})
        after = data.get("after", "")
        logger.info(f"Video queued: {item.get('title', 'unknown')} after {after}")

        # TODO: Add playlist management logic here
        # - Track queued videos
        # - Manage playlist state
        # - Handle queue position

    async def _handle_delete(self, subject: str, data: dict) -> None:
        """Handle delete events."""
        uid = data.get("uid", "")
        logger.info(f"Video deleted: {uid}")

        # TODO: Add deletion logic here
        # - Remove from tracked playlist
        # - Update playlist state

    async def _handle_move_video(self, subject: str, data: dict) -> None:
        """Handle moveVideo events."""
        from_pos = data.get("from", 0)
        to_pos = data.get("after", "")
        logger.info(f"Video moved from {from_pos} to after {to_pos}")

        # TODO: Add move logic here
        # - Update playlist order
        # - Maintain playlist state

    async def _handle_set_temp(self, subject: str, data: dict) -> None:
        """Handle setTemp events."""
        uid = data.get("uid", "")
        temp = data.get("temp", False)
        logger.info(f"Video {uid} temp status set to {temp}")

        # TODO: Add temp status logic here
        # - Track temporary videos
        # - Handle auto-removal
