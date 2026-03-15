"""
Periodic Gmail poller — checks for new emails and runs the email_parser agent.

Replaces the need for Google Pub/Sub push notifications during early development.
Runs as a background task on a configurable interval (default: 5 minutes).
"""

import asyncio
import logging
from datetime import datetime, timezone

from app.agents.core import AgentRequest, AgentRunner
from app.agents.core.schemas import TriggerMode
from app.config import get_settings
from app.services.encryption import decrypt
from app.services.gmail import get_gmail_credentials
from app.services.supabase import get_supabase_admin

logger = logging.getLogger(__name__)

runner = AgentRunner()
_poll_task: asyncio.Task | None = None


async def poll_gmail_for_user(user_id: str, email: str, refresh_token: str):
    """Check one user's Gmail for new messages and process them."""
    sb = get_supabase_admin()
    creds = get_gmail_credentials(refresh_token)

    # Get the last processed message timestamp, or default to recent messages
    from googleapiclient.discovery import build

    service = build("gmail", "v1", credentials=creds)

    # Search for recent unprocessed messages (last 24 hours, inbox only)
    try:
        results = (
            service.users()
            .messages()
            .list(userId="me", labelIds=["INBOX"], maxResults=10, q="newer_than:1d")
            .execute()
        )
    except Exception as e:
        logger.warning(f"Gmail API error for {email}: {e}")
        return

    messages = results.get("messages", [])
    if not messages:
        return

    processed_count = 0
    for msg in messages:
        msg_id = msg["id"]

        # Dedup — skip already-processed messages
        existing = (
            sb.table("processed_items")
            .select("id")
            .eq("user_id", user_id)
            .eq("item_type", "gmail")
            .eq("item_id", msg_id)
            .execute()
        )
        if existing.data:
            continue

        # Run email parser agent
        try:
            request = AgentRequest(
                agent_name="email_parser",
                input=f"Process Gmail message ID: {msg_id}",
                trigger_mode=TriggerMode.PUSH,
            )
            response = await runner.run(
                request,
                user_id=user_id,
                user_email=email,
                gmail_credentials=creds,
            )

            # Mark as processed
            sb.table("processed_items").insert(
                {
                    "user_id": user_id,
                    "item_type": "gmail",
                    "item_id": msg_id,
                    "agent": "email_parser",
                    "result": response.message[:500] if response.message else "processed",
                }
            ).execute()
            processed_count += 1
        except Exception as e:
            logger.error(f"Email parser failed for msg {msg_id}: {e}")
            # Mark as processed to avoid retrying broken messages
            sb.table("processed_items").insert(
                {
                    "user_id": user_id,
                    "item_type": "gmail",
                    "item_id": msg_id,
                    "agent": "email_parser",
                    "result": f"error: {str(e)[:200]}",
                }
            ).execute()

    if processed_count > 0:
        logger.info(f"Processed {processed_count} new emails for {email}")


async def poll_all_users():
    """Poll Gmail for all users with connected Gmail accounts."""
    sb = get_supabase_admin()

    try:
        result = (
            sb.table("profiles")
            .select("id, email, gmail_refresh_token")
            .eq("gmail_connected", True)
            .not_.is_("gmail_refresh_token", "null")
            .execute()
        )
    except Exception as e:
        logger.error(f"Failed to fetch Gmail-connected users: {e}")
        return

    for profile in result.data or []:
        try:
            refresh_token = decrypt(profile["gmail_refresh_token"])
            await poll_gmail_for_user(
                user_id=profile["id"],
                email=profile["email"],
                refresh_token=refresh_token,
            )
        except Exception as e:
            logger.warning(f"Gmail poll failed for user {profile['email']}: {e}")


async def _poll_loop():
    """Background loop that polls Gmail at a fixed interval."""
    settings = get_settings()
    interval = settings.gmail_poll_interval_seconds
    logger.info(f"Gmail poller started (interval: {interval}s)")

    while True:
        try:
            await poll_all_users()
        except Exception as e:
            logger.error(f"Gmail poll cycle error: {e}")
        await asyncio.sleep(interval)


def start_poller():
    """Start the Gmail polling background task."""
    global _poll_task
    settings = get_settings()

    if not settings.gmail_poll_enabled:
        logger.info("Gmail poller disabled (GMAIL_POLL_ENABLED=false)")
        return

    if _poll_task is not None and not _poll_task.done():
        logger.warning("Gmail poller already running")
        return

    _poll_task = asyncio.create_task(_poll_loop())
    logger.info("Gmail poller task created")


def stop_poller():
    """Stop the Gmail polling background task."""
    global _poll_task
    if _poll_task is not None and not _poll_task.done():
        _poll_task.cancel()
        logger.info("Gmail poller stopped")
    _poll_task = None
