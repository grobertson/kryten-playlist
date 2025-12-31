import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

from nats.aio.client import Client as NATS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("simulate_event")

async def send_move_event():
    nc = NATS()
    try:
        await nc.connect("nats://localhost:4222")

        # Event subject (lowercase)
        subject = "kryten.events.cytube.akwhr89327m.movevideo"

        # Payload matching RawEvent structure
        payload = {
            "event_name": "moveVideo",
            "payload": {
                "from": 84,
                "after": 44
            },
            "channel": "AKWHR89327M",
            "domain": "cytu.be",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "correlation_id": str(uuid.uuid4())
        }

        logger.info(f"Publishing event to {subject}: {json.dumps(payload, indent=2)}")
        await nc.publish(subject, json.dumps(payload).encode())

        logger.info("Event published.")

    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        await nc.close()

if __name__ == "__main__":
    asyncio.run(send_move_event())
