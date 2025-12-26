import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from nats.aio.client import Client as NATS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("simulate_move")

async def send_move():
    nc = NATS()
    try:
        await nc.connect("nats://localhost:4222")
        
        # Command subject
        channel = "akwhr89327m"
        domain = "420grindhouse.com" # or whatever the domain is
        # Actually, let's look at what the user logs said: 
        # kryten.commands.cytube.akwhr89327m.move
        
        subject = f"kryten.commands.cytube.{channel}.move"
        
        # Move UID 84 after UID 44
        payload = {
            "action": "move",
            "data": {
                "from": 84,
                "after": 44
            },
            "correlation_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"Sending move command to {subject}: {payload}")
        await nc.publish(subject, json.dumps(payload).encode())
        
        logger.info("Command sent.")
        
    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        await nc.close()

if __name__ == "__main__":
    asyncio.run(send_move())
