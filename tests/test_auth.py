#!/usr/bin/env python3
"""Test authentication bypass for debugging."""

import asyncio
import httpx


async def test_auth_bypass():
    """Test if authentication bypass is working."""
    
    base_url = "http://localhost:8088/api/v1"
    
    async with httpx.AsyncClient() as client:
        # Test queue endpoint without authentication
        try:
            response = await client.get(f"{base_url}/queue")
            print(f"Queue response status: {response.status_code}")
            
            if response.status_code == 200:
                queue_data = response.json()
                print(f"Queue items count: {len(queue_data.get('items', []))}")
                
                if queue_data.get('items'):
                    # Test moving the first item
                    first_item = queue_data['items'][0]
                    print(f"First item UID: {first_item.get('uid')}")
                    
                    # Test move with actual UID
                    move_data = {
                        "uid": first_item['uid'],
                        "after_uid": None
                    }
                    
                    print(f"Testing move with real UID: {move_data}")
                    
                    response = await client.post(
                        f"{base_url}/queue/move",
                        json=move_data
                    )
                    
                    print(f"Real UID move response status: {response.status_code}")
                    print(f"Real UID move response text: {response.text}")
                else:
                    print("No queue items found")
            else:
                print(f"Queue response text: {response.text}")
                
        except Exception as e:
            print(f"Error during test: {e}")


if __name__ == "__main__":
    asyncio.run(test_auth_bypass())