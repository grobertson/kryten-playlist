#!/usr/bin/env python3
"""Simple script to view current queue state."""

import json
import urllib.request

def main():
    try:
        with urllib.request.urlopen('http://localhost:8089/api/v1/queue') as response:
            data = json.loads(response.read())
        
        print('Current queue items:')
        for i, item in enumerate(data['items'][:10]):  # Show first 10 items
            title = item['media']['title'][:50] + '...' if len(item['media']['title']) > 50 else item['media']['title']
            print(f'{i+1}. UID: {item["uid"]}, Title: {title}')
        
        print(f'Total items: {len(data["items"])}')
        
        if data.get('current'):
            print(f'Currently playing: {data["current"]["title"]}')
            
        # Return some UIDs for testing
        if len(data['items']) > 5:
            print(f'\nTest UIDs available: {data["items"][0]["uid"]}, {data["items"][1]["uid"]}, {data["items"][2]["uid"]}')
            
    except Exception as e:
        print(f'Error: {e}')

if __name__ == '__main__':
    main()