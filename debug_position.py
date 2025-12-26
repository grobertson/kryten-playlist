#!/usr/bin/env python3
"""Test script to debug queue move operations and position calculation."""

import asyncio
import json
import urllib.request
import urllib.error

def fetch_queue():
    """Fetch the current queue from the backend."""
    try:
        with urllib.request.urlopen("http://localhost:8089/api/v1/queue") as response:
            data = json.loads(response.read().decode())
            return data
    except urllib.error.URLError as e:
        print(f"Error fetching queue: {e}")
        return None

def find_position_by_uid(items, target_uid):
    """Find the position (index) of an item with the given UID."""
    for i, item in enumerate(items):
        if item['uid'] == target_uid:
            return i
    return -1

def main():
    print("Fetching current queue...")
    queue_data = fetch_queue()
    
    if not queue_data:
        print("Failed to fetch queue")
        return
    
    items = queue_data.get('items', [])
    print(f"Queue has {len(items)} items")
    
    # Show first few items
    print("\nFirst 10 items:")
    for i, item in enumerate(items[:10]):
        print(f"  {i}: UID {item['uid']} - {item.get('title', 'Unknown')}")
    
    # Test position calculation logic
    test_uid = 88  # This was the after_uid from our test
    pos = find_position_by_uid(items, test_uid)
    print(f"\nItem with UID {test_uid} is at position {pos}")
    
    if pos >= 0:
        # If we want to move an item AFTER this one, the target position would be pos + 1
        target_position = pos + 1
        print(f"To move an item AFTER UID {test_uid}, we need position {target_position}")
    
    # Test "prepend" case
    print(f"\nTo move an item to the beginning (prepend), we need position 0")

if __name__ == "__main__":
    main()