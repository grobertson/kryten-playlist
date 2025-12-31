import asyncio
import json
import logging

from nats.aio.client import Client as NATS

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("nats_monitor")

async def run(loop):
    nc = NATS()

    # Connect to NATS
    try:
        await nc.connect("nats://localhost:4222")
        logger.info("Connected to NATS")
    except Exception as e:
        logger.error(f"Failed to connect to NATS: {e}")
        return

    # Callback for received messages
    async def message_handler(msg):
        subject = msg.subject
        data = msg.data.decode()
        try:
            json_data = json.loads(data)
            logger.info(f"Received on [{subject}]:\n{json.dumps(json_data, indent=2)}")
        except Exception:
            logger.info(f"Received on [{subject}]: {data}")

    # Subscribe to moveVideo events
    subject = "kryten.events.cytube.akwhr89327m.movevideo"
    await nc.subscribe(subject, cb=message_handler)
    logger.info(f"Subscribed to {subject}")

    # Keep running
    while True:
        await asyncio.sleep(1)

if __name__ == '__main__':
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(run(loop))
    except KeyboardInterrupt:
        pass
