import base64
import logging

from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry

logger = logging.getLogger("calendarai.tools.gmail")


@tool_registry.register("search_gmail")
async def search_gmail(
    ctx: RunContext[AgentDeps],
    query: str,
    max_results: int = 5,
) -> dict:
    """Search the user's Gmail inbox. Use to find verification emails, booking confirmations, etc.

    Args:
        query: Gmail search query (e.g. 'from:fresha.com subject:verify newer_than:1h',
               'from:noreply@opentable.com newer_than:30m')
        max_results: Maximum number of results to return (default 5)
    """
    from googleapiclient.discovery import build

    creds = ctx.deps.gmail_credentials
    if not creds:
        return {"error": "Gmail not connected. Ask the user to check their email manually."}

    try:
        service = build("gmail", "v1", credentials=creds)
        result = service.users().messages().list(
            userId="me", q=query, maxResults=max_results
        ).execute()

        messages = result.get("messages", [])
        if not messages:
            return {"results": [], "message": "No emails found matching the query."}

        summaries = []
        for msg_info in messages:
            msg = service.users().messages().get(
                userId="me", id=msg_info["id"], format="metadata",
                metadataHeaders=["From", "Subject", "Date"],
            ).execute()
            headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
            summaries.append({
                "message_id": msg_info["id"],
                "from": headers.get("From", ""),
                "subject": headers.get("Subject", ""),
                "date": headers.get("Date", ""),
                "snippet": msg.get("snippet", ""),
            })

        return {"results": summaries}
    except Exception as e:
        logger.error("search_gmail failed: %s", e)
        return {"error": f"Gmail search failed: {e}"}


@tool_registry.register("get_email_content")
async def get_email_content(
    ctx: RunContext[AgentDeps],
    message_id: str,
) -> dict:
    """Get the full content of a Gmail message. Use after search_gmail to read verification codes, magic links, etc.

    Args:
        message_id: The Gmail message ID from search_gmail results
    """
    from googleapiclient.discovery import build

    creds = ctx.deps.gmail_credentials
    if not creds:
        return {"error": "Gmail not connected"}

    try:
        service = build("gmail", "v1", credentials=creds)
        msg = service.users().messages().get(userId="me", id=message_id, format="full").execute()

        headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}

        body = ""
        if "parts" in msg["payload"]:
            for part in msg["payload"]["parts"]:
                if part["mimeType"] == "text/plain" and "data" in part.get("body", {}):
                    body = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8")
                    break
            # Fallback to HTML if no plain text
            if not body:
                for part in msg["payload"]["parts"]:
                    if part["mimeType"] == "text/html" and "data" in part.get("body", {}):
                        body = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8")
                        break
        elif "data" in msg["payload"].get("body", {}):
            body = base64.urlsafe_b64decode(msg["payload"]["body"]["data"]).decode("utf-8")

        return {
            "message_id": message_id,
            "from": headers.get("From", ""),
            "subject": headers.get("Subject", ""),
            "date": headers.get("Date", ""),
            "body": body[:5000],
        }
    except Exception as e:
        logger.error("get_email_content failed: %s", e)
        return {"error": f"Failed to read email: {e}"}
