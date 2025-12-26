import asyncio
import logging
import nats
from nats.js.api import StreamConfig, StorageType

async def list_buckets():
    nc = await nats.connect("nats://localhost:4222")
    js = nc.jetstream()
    
    print("Listing streams (KV buckets are streams starting with KV_)...")
    try:
        streams = await js.streams_info()
        for stream in streams:
            if stream.config.name.startswith("KV_"):
                print(f"Bucket found: {stream.config.name} (Stream Name)")
                # The actual bucket name is the stream name without KV_ prefix usually, 
                # but let's just see what's there.
                print(f"  - Subject: {stream.config.subjects}")
    except Exception as e:
        print(f"Error listing streams: {e}")
        
    await nc.close()

if __name__ == "__main__":
    asyncio.run(list_buckets())
