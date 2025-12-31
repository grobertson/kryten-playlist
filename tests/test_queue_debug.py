#!/usr/bin/env python3
"""Debug script to inspect queue structure and test operations."""

import asyncio
import sys
from pathlib import Path

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

from kryten_playlist.config import Config  # noqa: E402
from kryten_playlist.service import PlaylistService  # noqa: E402


async def debug_queue():
    """Debug the queue structure."""
    try:
        # Initialize config
        config = Config()

        # Initialize service to get channel
        service = PlaylistService(config)
        await service._resolve_channel()

        if not service.resolved_channel:
            print("ERROR: No resolved channel available")
            return

        channel = service.resolved_channel
        print(f"Channel: {channel}")

        # Get client
        # We need to simulate the app state for the client
        class MockApp:
            def __init__(self):
                self.state = type('State', (), {})()

        # This is a bit hacky but we need the actual client
        print("Note: This debug script requires the service to be running to get the client")
        print(f"Channel should be: {channel}")
        print("Queue bucket would be: kryten_{}_playlist".format(channel))

    except Exception as e:
        print(f"Error during debug: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("=== Queue Debug Script ===")
    print()
    print("This script helps debug queue operations.")
    print("To see the actual queue structure, the service needs to be running.")
    print()
    print("Configuration:")
    config = Config()
    print(f"  HTTP log level: {config.http_log_level}")
    print(f"  HTTP host: {config.http_host}")
    print(f"  HTTP port: {config.http_port}")
    print()

    # Run the debug
    asyncio.run(debug_queue())
