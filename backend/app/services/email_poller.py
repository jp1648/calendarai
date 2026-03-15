"""
Periodic Gmail poller — checks for new emails and runs the email_parser agent.

Replaces the need for Google Pub/Sub push notifications during early development.
Runs as a background task on a configurable interval (default: 5 minutes).
"""

import asyncio
import logging

from googleapiclient.discovery import build

from app.agents.core import AgentRequest
from app.agents.core.schemas import TriggerMode
from app.config import get_settings
from app.services.encryption import decrypt
from app.services.gmail import get_gmail_credentials
from app.services.supabase import get_supabase_admin

logger = logging.getLogger(__name__)

_runner = None
_poll_task: asyncio.Task | None = None


def _get_runner():
    """Lazy-initialize AgentRunner to avoid heavy imports at module load."""
    global _runner
    if _runner is None:
        from app.agents.core import AgentRunner
        _runner = AgentRunner()
    return _runner


def _check_processed(sb, user_id: str, msg_id: str) -> bool:
    """Check if a message has already been processed (sync, runs in thread)."""
    existing = (
        sb.table("processed_items")
        .select("id")
        .eq("user_id", user_id)
        .eq("item_type", "gmail")
        .eq("item_id", msg_id)
        .execute()
    )
    return bool(existing.data)


def _mark_processed(sb, user_id: str, msg_id: str, result: str):
    """Mark a message as processed (sync, runs in thread)."""
    sb.table("processed_items").insert(
        {
            "user_id": user_id,
            "item_type": "gmail",
            "item_id": msg_id,
            "agent": "email_parser",
            "result": result,
        }
    ).execute()


def _fetch_gmail_connected_users(sb):
    """Fetch all users with connected Gmail accounts (sync, runs in thread)."""
    return (
        sb.table("profiles")
        .select("id, email, gmail_refresh_token")
        .eq("gmail_connected", True)
        .not_.is_("gmail_refresh_token", "null")
        .execute()
    )


def _list_recent_messages(service):
    """List recent inbox messages from Gmail API (sync, runs in thread)."""
    return (
        service.users()
        .messages()
        .list(userId="me", labelIds=["INBOX"], maxResults=10, q="newer_than:1d")
        .execute()
    )


async def poll_gmail_for_user(user_id: str, email: str, refresh_token: str):
    """Check one user's Gmail for new messages and process them."""
    sb = get_supabase_admin()
    creds = get_gmail_credentials(refresh_token)
    service = build("gmail", "v1", credentials=creds, cache_discovery=True)

    try:
        results = await asyncio.to_thread(_list_recent_messages, service)
    except Exception as e:
        logger.warning(f"Gmail API error for {email}: {e}")
        return

    messages = results.get("messages", [])
    if not messages:
        return

    runner = _get_runner()
    processed_count = 0
    for msg in messages:
        msg_id = msg["id"]

        # Dedup — skip already-processed messages
        already_done = await asyncio.to_thread(_check_processed, sb, user_id, msg_id)
        if already_done:
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

            result_text = response.message[:500] if response.message else "processed"
            await asyncio.to_thread(_mark_processed, sb, user_id, msg_id, result_text)
            processed_count += 1
        except Exception as e:
            logger.error(f"Email parser failed for msg {msg_id}: {e}")
            await asyncio.to_thread(
                _mark_processed, sb, user_id, msg_id, f"error: {str(e)[:200]}"
            )

    if processed_count > 0:
        logger.info(f"Processed {processed_count} new emails for {email}")


async def poll_all_users():
    """Poll Gmail for all users with connected Gmail accounts."""
    sb = get_supabase_admin()

    try:
        result = await asyncio.to_thread(_fetch_gmail_connected_users, sb)
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
        # Brief pause between users to avoid Gmail API rate limits
        await asyncio.sleep(1)


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
