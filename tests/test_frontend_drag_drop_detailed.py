#!/usr/bin/env python3
"""Test script to simulate frontend drag and drop with detailed logging."""

import json
import urllib.error
import urllib.request


def test_frontend_behavior():
    """Test the exact behavior that frontend would use."""

    # Get current queue state
    try:
        with urllib.request.urlopen('http://localhost:8089/api/v1/queue') as response:
            queue_data = json.loads(response.read())

        print(f"Current queue has {len(queue_data['items'])} items")

        # Show first 10 items with their positions
        print("\nFirst 10 items:")
        for i, item in enumerate(queue_data['items'][:10]):
            print(f"  Position {i}: UID {item['uid']} - {item['media']['title'][:50]}...")

        # Simulate moving item from position 2 to position 5 (like frontend drag and drop)
        if len(queue_data['items']) >= 6:
            old_index = 2
            new_index = 5

            item_to_move = queue_data['items'][old_index]

            # Frontend logic: if moving to position 0, after_uid is None
            # Otherwise, after_uid is the UID of the item at new_index - 1
            after_uid = None if new_index == 0 else queue_data['items'][new_index - 1]['uid']

            print("\n🔄 Simulating frontend drag and drop:")
            print(f"   Moving item from position {old_index} to position {new_index}")
            print(f"   Item: {item_to_move['media']['title'][:50]}... (UID: {item_to_move['uid']})")
            print(f"   After UID: {after_uid}")

            # Make the move request like frontend does
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

                    print("\n📋 Updated queue state:")
                    for i, item in enumerate(updated_queue['items'][:10]):
                        print(f"  Position {i}: UID {item['uid']} - {item['media']['title'][:50]}...")

                    # Verify the move worked
                    moved_item_found = False
                    for i, item in enumerate(updated_queue['items']):
                        if item['uid'] == item_to_move['uid']:
                            if i == new_index:
                                print(f"✅ Item correctly moved to position {new_index}")
                            else:
                                print(f"⚠️  Item found at position {i} (expected {new_index})")
                            moved_item_found = True
                            break

                    if not moved_item_found:
                        print("❌ Item not found in updated queue")

            except urllib.error.HTTPError as e:
                error_body = e.read().decode('utf-8')
                print(f"❌ Move failed: {e.code} {e.reason}")
                print(f"   Error response: {error_body}")

        else:
            print("Not enough items in queue to test drag and drop")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_frontend_behavior()
