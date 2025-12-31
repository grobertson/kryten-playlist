#!/usr/bin/env python3
"""Test script to reproduce the queue drag-and-drop UID validation issue."""

import asyncio
import json

import httpx


async def test_queue_operations():
    """Test queue operations to reproduce the UID validation issue."""

    # Test the queue move endpoint with different UID values
    base_url = "http://localhost:8088/api/v1"

    async with httpx.AsyncClient() as client:
        # First, get the current queue state
        try:
            response = await client.get(f"{base_url}/queue")
            print(f"Queue state response: {response.status_code}")

            if response.status_code == 200:
                queue_data = response.json()
                print(f"Queue items count: {len(queue_data.get('items', []))}")

                if queue_data.get('items'):
                    # Test moving the first item with UID "0"
                    first_item = queue_data['items'][0]
                    print(f"First item UID: {first_item.get('uid')}")

                    # Test move with UID "0" (this should fail)
                    move_data = {
                        "uid": "0",
                        "after_uid": None
                    }

                    print(f"Testing move with data: {json.dumps(move_data, indent=2)}")

                    response = await client.post(
                        f"{base_url}/queue/move",
                        json=move_data
                    )

                    print(f"Move response status: {response.status_code}")
                    print(f"Move response text: {response.text}")

                    # Test move with actual UID
                    if first_item.get('uid'):
                        move_data_real = {
                            "uid": first_item['uid'],
                            "after_uid": None
                        }

                        print(f"Testing move with real UID: {json.dumps(move_data_real, indent=2)}")

                        response = await client.post(
                            f"{base_url}/queue/move",
                            json=move_data_real
                        )

                        print(f"Real UID move response status: {response.status_code}")
                        print(f"Real UID move response text: {response.text}")
                else:
                    print("No items in queue to test with")
            else:
                print(f"Failed to get queue state: {response.text}")

        except Exception as e:
            print(f"Error during test: {e}")

if __name__ == "__main__":
    asyncio.run(test_queue_operations())
