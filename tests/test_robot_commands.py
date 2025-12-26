import asyncio
import json
import logging
import uuid
import sys
from nats.aio.client import Client as NATS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_robot_commands")

async def send_command(command, payload):
    nc = NATS()
    try:
        await nc.connect("nats://localhost:4222")
        
        subject = "kryten.robot.command"
        
        request = {
            "command": command,
            "service": "robot",
            "payload": payload,
            "correlation_id": str(uuid.uuid4())
        }
        
        logger.info(f"Sending command '{command}' to {subject}")
        
        try:
            response = await nc.request(subject, json.dumps(request).encode(), timeout=5)
            data = json.loads(response.data.decode())
            logger.info(f"Response: {json.dumps(data, indent=2)}")
        except asyncio.TimeoutError:
            logger.error("Timeout waiting for response. Is kryten-robot running?")
        except Exception as e:
            logger.error(f"Error requesting: {e}")
            
    except Exception as e:
        logger.error(f"Error connecting: {e}")
    finally:
        await nc.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_robot_commands.py <move|queue|delete>")
        sys.exit(1)
        
    action = sys.argv[1]
    
    if action == "move":
        # Modify these UIDs to match actual items in playlist if testing for real
        # Example values from previous context
        asyncio.run(send_command("playlist.move", {
            "from_uid": 84,
            "after_uid": 44 
        }))
    elif action == "queue":
        asyncio.run(send_command("playlist.queue", {
            "item": {
                "id": "dQw4w9WgXcQ",
                "type": "yt",
                "title": "Rick Astley - Never Gonna Give You Up"
            }
        }))
    elif action == "delete":
        asyncio.run(send_command("playlist.delete", {
            "uid": 123
        }))
    else:
        print(f"Unknown action: {action}")
