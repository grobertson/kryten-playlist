import asyncio
import logging

import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verify_queue")

BASE_URL = "http://localhost:8088/api/v1"

async def main():
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Get current queue
        logger.info("Fetching current queue...")
        resp = await client.get(f"{BASE_URL}/queue")
        if resp.status_code != 200:
            logger.error(f"Failed to fetch queue: {resp.status_code} {resp.text}")
            return

        queue_data = resp.json()
        items = queue_data.get("items", [])
        logger.info(f"Queue has {len(items)} items")

        if not items:
            logger.warning("Queue is empty, cannot verify move/delete")
            return

        # Print first few items
        for i, item in enumerate(items[:5]):
            logger.info(f"[{i+1}] UID: {item.get('uid')} | Title: {item.get('media', {}).get('title')}")

        # 3. Test MOVE
        # Try to move item at position 2 to position 1 (swap first two if possible)
        if len(items) >= 2:
            # item_to_move = items[1] # 2nd item
            # target_pos = 1 # move to 1st position (after nothing? or after 0? API says "after_uid")

            # To move to top, after_uid might need to be specific.
            # Kryten-cli logic: "prepend" string or None for top.
            # Let's try moving item 2 to be after item 1 (no-op effectively, but testing API)
            # Or better, move item 1 to be after item 2.

            # Let's try moving the LAST item to the FIRST position (prepend)
            last_item = items[-1]
            logger.info(f"Attempting to move last item (UID: {last_item['uid']}) to top (prepend)...")

            move_payload = {
                "uid": last_item['uid'],
                "after_uid": "prepend"
            }

            resp = await client.post(f"{BASE_URL}/queue/move", json=move_payload)
            logger.info(f"Move response: {resp.status_code} {resp.text}")

            # Also try moving using POSITIONS (integers < 1000)
            # Move item at pos 2 to pos 3
            logger.info("Attempting to move item at pos 2 to pos 3 (using integer positions)...")
            move_pos_payload = {
                "uid": 2,
                "after_uid": 3
            }
            resp = await client.post(f"{BASE_URL}/queue/move", json=move_pos_payload)
            logger.info(f"Move by position response: {resp.status_code} {resp.text}")

        # 3. Test DELETE
        # Delete the item we just moved (or the last one)
        # We will use the UID of the item we targeted first
        target_item = items[-1]
        logger.info(f"Attempting to delete item with UID: {target_item['uid']}")

        resp = await client.delete(f"{BASE_URL}/queue/{target_item['uid']}")
        logger.info(f"Delete response: {resp.status_code} {resp.text}")

        # Test DELETE by position
        # Delete item at position 1
        logger.info("Attempting to delete item at position 1...")
        resp = await client.delete(f"{BASE_URL}/queue/1")
        logger.info(f"Delete by position response: {resp.status_code} {resp.text}")

if __name__ == "__main__":
    asyncio.run(main())
