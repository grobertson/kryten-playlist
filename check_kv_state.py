import asyncio
import json
import logging
from nats.aio.client import Client as NATS
from nats.js import api

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kv_check")

async def check_kv():
    nc = NATS()
    try:
        await nc.connect("nats://localhost:4222")
        js = nc.jetstream()
        
        # Access the playlist bucket (case sensitive!)
        bucket_name = "kryten_AKWHR89327M_playlist"
        try:
            kv = await js.key_value(bucket_name)
        except Exception as e:
            logger.error(f"Could not bind to bucket {bucket_name}: {e}")
            return

        # Get items
        try:
            entry = await kv.get("items")
            items = json.loads(entry.value.decode())
            logger.info(f"Playlist has {len(items)} items")
            for i, item in enumerate(items[:5]):
                logger.info(f"  {i}: UID={item.get('uid')} Title={item.get('media', {}).get('title', 'Unknown')}")
        except Exception as e:
            logger.error(f"Could not get items: {e}")

    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        await nc.close()

if __name__ == "__main__":
    asyncio.run(check_kv())
