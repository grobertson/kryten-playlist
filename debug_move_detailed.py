#!/usr/bin/env python3
"""Debug script to test move operation with detailed logging."""

import asyncio
import json
import urllib.request
import urllib.error
import urllib.parse

def move_item_debug(uid, after_uid):
    """Move an item in the queue with detailed debugging."""
    url = "http://localhost:3000/api/v1/queue/move"
    data = {
        "uid": str(uid),
        "after_uid": str(after_uid) if after_uid is not None else None
    }
    
    print(f"Making move request:")
    print(f"  URL: {url}")
    print(f"  Data: {json.dumps(data, indent=2)}")
    
    json_data = json.dumps(data).encode('utf-8')
    
    req = urllib.request.Request(url, data=json_data, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Accept', 'application/json')
    
    try:
        print(f"  Sending request...")
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print(f"  Response status: {response.status}")
            print(f"  Response headers: {dict(response.headers)}")
            print(f"  Response body: {json.dumps(result, indent=2)}")
            return result
    except urllib.error.HTTPError as e:
        print(f"  HTTP Error {e.code}: {e.reason}")
        try:
            error_body = e.read().decode()
            print(f"  Error response: {error_body}")
        except:
            print(f"  Could not read error response body")
        return None
    except urllib.error.URLError as e:
        print(f"  URL Error: {e}")
        return None

def main():
    print("=== Debug Move Operation ===")
    
    # Test with a simple move
    result = move_item_debug(68, 62)
    
    if result:
        print(f"\nMove operation result: {result}")
    else:
        print(f"\nMove operation failed")

if __name__ == "__main__":
    main()