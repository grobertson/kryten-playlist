#!/usr/bin/env python3
"""Test script to simulate frontend drag and drop behavior."""

import json
import urllib.request
import urllib.error

def test_drag_drop_simulation():
    """Simulate frontend drag and drop behavior."""
    
    # Get current queue state
    try:
        with urllib.request.urlopen('http://localhost:8089/api/v1/queue') as response:
            queue_data = json.loads(response.read())
        
        print(f"Current queue has {len(queue_data['items'])} items")
        
        # Simulate moving item from position 1 to position 3 (like frontend drag and drop)
        if len(queue_data['items']) >= 4:
            item_to_move = queue_data['items'][1]  # Index 1 (second item)
            target_position = 3  # Move to position 3
            
            # Calculate after_uid like frontend does
            after_uid = queue_data['items'][target_position - 1]['uid'] if target_position > 0 else None
            
            print(f"Simulating: Move '{item_to_move['media']['title']}' (UID: {item_to_move['uid']}) to position {target_position}")
            print(f"After UID: {after_uid}")
            
            # Make the move request
            data = json.dumps({
                "uid": str(item_to_move['uid']),
                "after_uid": str(after_uid) if after_uid is not None else None
            }).encode('utf-8')
            
            req = urllib.request.Request(
                'http://localhost:8089/api/v1/queue/move',
                data=data,
                headers={'Content-Type': 'application/json'}
            )
            
            try:
                with urllib.request.urlopen(req) as response:
                    result = json.loads(response.read())
                    print(f"✅ Move successful: {result}")
                    
                    # Get updated queue state
                    with urllib.request.urlopen('http://localhost:8089/api/v1/queue') as response:
                        updated_queue = json.loads(response.read())
                    
                    print(f"Updated queue state:")
                    for i, item in enumerate(updated_queue['items'][:5]):
                        print(f"  {i+1}. UID: {item['uid']}, Title: {item['media']['title'][:50]}...")
                    
            except urllib.error.HTTPError as e:
                error_body = e.read().decode('utf-8')
                print(f"❌ Move failed: {e.code} {e.reason}")
                print(f"   Error response: {error_body}")
                
        else:
            print("Not enough items in queue to test drag and drop")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    test_drag_drop_simulation()