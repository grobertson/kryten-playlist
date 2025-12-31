
import asyncio
import logging

import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "https://www.420grindhouse.com"
USERNAME = "admin"
PASSWORD = "i9gg07yra3"

async def test_auth():
    async with httpx.AsyncClient() as client:
        # 1. Login
        login_url = f"{BASE_URL}/api/v1/login"
        data = {"username": USERNAME, "password": PASSWORD}

        logger.info("Logging in...")
        resp = await client.post(login_url, data=data)
        if resp.status_code != 200:
            logger.error(f"Login failed: {resp.text}")
            return

        token = resp.json().get("token")
        logger.info(f"Got Token: {token}")

        # 2. Test Token formats
        test_headers = [
            {"Authorization": f"Token {token}"},
            {"Authorization": f"Bearer {token}"},
            {"X-API-KEY": token}, # Some systems use this
        ]

        # Try a simple GET endpoint - media list
        url = f"{BASE_URL}/api/v1/media"
        # Also try users/current again with logging
        url_users = f"{BASE_URL}/api/v1/users/current"

        for headers in test_headers:
            logger.info(f"Testing headers: {headers}")

            # Test media list
            try:
                r = await client.get(url, headers=headers, params={"limit": 1})
                logger.info(f"GET /media status: {r.status_code}")
                if r.status_code != 200:
                    logger.info(f"Response: {r.text[:200]}")
            except Exception as e:
                logger.error(f"GET /media failed: {e}")

            # Test users/current
            try:
                r = await client.get(url_users, headers=headers)
                logger.info(f"GET /users/current status: {r.status_code}")
                if r.status_code != 200:
                    logger.info(f"Response: {r.text[:200]}")
            except Exception as e:
                logger.error(f"GET /users/current failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_auth())
