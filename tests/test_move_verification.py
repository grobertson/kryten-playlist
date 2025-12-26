#!/usr/bin/env python3
"""Comprehensive test to verify queue move operations work correctly."""

import asyncio
import json
import urllib.request
import urllib.error
import urllib.parse

def fetch_queue():
    """Fetch the current queue from the backend."""
    try:
        with urllib.request.urlopen("http://localhost:8089/api/v1/queue") as response:
            data = json.loads(response.read().decode())
            return data
    except urllib.error.URLError as e:
        print(f"Error fetching queue: {e}")
        return None

def find_item_by_uid(items, target_uid):
    """Find an item by UID and return its position."""
    for i, item in enumerate(items):
        if item.get('uid') == target_uid:
            return i, item
    return -1, None

def move_item(uid, after_uid):
    """Move an item in the queue."""
    url = "http://localhost:8089/api/v1/queue/move"
    data = json.dumps({
        "uid": str(uid),
        "after_uid": str(after_uid) if after_uid is not None else None
    }).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return result
    except urllib.error.URLError as e:
        print(f"Error moving item: {e}")
        return None

def main():
    print("=== Testing Queue Move Operations ===")
    
    # Fetch initial queue
    print("\n1. Fetching initial queue...")
    initial_queue = fetch_queue()
    if not initial_queue:
        print("Failed to fetch initial queue")
        return
    
    items = initial_queue.get('items', [])
    print(f"Queue has {len(items)} items")
    
    if len(items) < 3:
        print("Need at least 3 items to test move operation")
        return
    
    # Show first few items
    print("\nFirst 5 items:")
    for i, item in enumerate(items[:5]):
        print(f"  {i}: UID {item.get('uid')} - {item.get('title', 'Unknown')}")
    
    # Test moving item from position 1 to the beginning (prepend)
    item_to_move_uid = items[1].get('uid')
    
    print(f"\n2. Testing move operation:")
    print(f"   Moving item UID {item_to_move_uid} (position 1)")
    print(f"   To beginning (prepend)")
    
    # Perform the move
    result = move_item(item_to_move_uid, "prepend")
    print(f"   Move result: {result}")
    
    if result and result.get('status') == 'ok':
        print("   Move command sent successfully")
        
        # Fetch queue again to verify the change
        print("\n3. Fetching updated queue...")
        updated_queue = fetch_queue()
        if updated_queue:
            updated_items = updated_queue.get('items', [])
            print(f"Updated queue has {len(updated_items)} items")
            
            print("\nFirst 5 items after move:")
            for i, item in enumerate(updated_items[:5]):
                print(f"  {i}: UID {item.get('uid')} - {item.get('title', 'Unknown')}")
            
            # Find the moved item in the new queue
            new_pos, _ = find_item_by_uid(updated_items, item_to_move_uid)
            if new_pos >= 0:
                print(f"\n4. Verification:")
                print(f"   Item UID {item_to_move_uid} is now at position {new_pos}")
                
                # Expected position should be at the beginning
                expected_pos = 0
                if new_pos == expected_pos:
                    print("   ✓ Move operation successful - item is in correct position!")
                else:
                    print(f"   ✗ Move operation failed - expected position {expected_pos}, got {new_pos}")
            else:
                print(f"   ✗ Item UID {item_to_move_uid} not found in updated queue")
        else:
            print("Failed to fetch updated queue")
    else:
        print("Move operation failed")

if __name__ == "__main__":
    main()