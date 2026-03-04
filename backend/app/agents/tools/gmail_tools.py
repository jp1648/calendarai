import base64

from pydantic_ai import RunContext

from app.agents.deps import AgentDeps
from app.agents.core.registry import tool_registry


@tool_registry.register("get_email_content")
async def get_email_content(
    ctx: RunContext[AgentDeps],
    message_id: str,
) -> dict:
    """Get the content of a Gmail message.

    Args:
        message_id: The Gmail message ID
    """
    from googleapiclient.discovery import build

    creds = ctx.deps.gmail_credentials
    if not creds:
        return {"error": "Gmail not connected"}

    service = build("gmail", "v1", credentials=creds)
    msg = service.users().messages().get(userId="me", id=message_id, format="full").execute()

    headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}

    body = ""
    if "parts" in msg["payload"]:
        for part in msg["payload"]["parts"]:
            if part["mimeType"] == "text/plain" and "data" in part.get("body", {}):
                body = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8")
                break
    elif "data" in msg["payload"].get("body", {}):
        body = base64.urlsafe_b64decode(msg["payload"]["body"]["data"]).decode("utf-8")

    return {
        "message_id": message_id,
        "from": headers.get("From", ""),
        "subject": headers.get("Subject", ""),
        "date": headers.get("Date", ""),
        "body": body[:3000],
    }
