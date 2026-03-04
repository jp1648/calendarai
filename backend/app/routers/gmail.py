import base64
import json
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from app.auth.middleware import AuthUser, get_current_user
from app.agents.core import AgentRequest, AgentRunner
from app.agents.core.schemas import TriggerMode
from app.config import get_settings
from app.services.gmail import (
    get_gmail_credentials,
    get_history,
    get_oauth_flow,
    setup_gmail_watch,
)
from app.services.supabase import get_supabase_admin

router = APIRouter(prefix="/api/gmail", tags=["gmail"])
runner = AgentRunner()


@router.get("/auth-url")
async def get_auth_url(user: AuthUser = Depends(get_current_user)):
    flow = get_oauth_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        state=user.id,
    )
    return {"url": auth_url}


@router.get("/callback")
async def oauth_callback(code: str, state: str):
    settings = get_settings()
    sb = get_supabase_admin()

    flow = get_oauth_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials

    sb.table("profiles").update(
        {"gmail_connected": True, "gmail_refresh_token": creds.refresh_token}
    ).eq("id", state).execute()

    watch_result = setup_gmail_watch(creds, settings.google_pubsub_topic)

    sb.table("gmail_watch_state").upsert(
        {
            "user_id": state,
            "history_id": watch_result["historyId"],
            "watch_expiry": datetime.fromtimestamp(
                int(watch_result["expiration"]) / 1000, tz=timezone.utc
            ).isoformat(),
        }
    ).execute()

    return {"status": "connected", "redirect": settings.frontend_url + "/settings"}


class PubSubMessage(BaseModel):
    message: dict
    subscription: str


@router.post("/webhook")
async def gmail_webhook(body: PubSubMessage, background_tasks: BackgroundTasks):
    """Receives Gmail push notifications via Google Pub/Sub."""
    data = json.loads(base64.b64decode(body.message["data"]).decode("utf-8"))
    email_address = data.get("emailAddress")
    history_id = data.get("historyId")

    if not email_address or not history_id:
        return {"status": "ignored"}

    background_tasks.add_task(process_gmail_push, email_address, history_id)
    return {"status": "processing"}


async def process_gmail_push(email_address: str, new_history_id: str):
    sb = get_supabase_admin()

    profile = (
        sb.table("profiles")
        .select("id, timezone, gmail_refresh_token")
        .eq("email", email_address)
        .eq("gmail_connected", True)
        .single()
        .execute()
    )
    if not profile.data or not profile.data["gmail_refresh_token"]:
        return

    user_id = profile.data["id"]
    refresh_token = profile.data["gmail_refresh_token"]

    watch_state = (
        sb.table("gmail_watch_state")
        .select("history_id")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not watch_state.data:
        return

    old_history_id = watch_state.data["history_id"]
    creds = get_gmail_credentials(refresh_token)
    message_ids = get_history(creds, old_history_id)

    sb.table("gmail_watch_state").update({"history_id": new_history_id}).eq(
        "user_id", user_id
    ).execute()

    for msg_id in message_ids:
        # Dedup
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

        request = AgentRequest(
            agent_name="email_parser",
            input=f"Process Gmail message ID: {msg_id}",
            trigger_mode=TriggerMode.PUSH,
        )

        response = await runner.run(
            request,
            user_id=user_id,
            user_email=email_address,
            gmail_credentials=creds,
        )

        # Mark as processed regardless of outcome
        sb.table("processed_items").insert(
            {
                "user_id": user_id,
                "item_type": "gmail",
                "item_id": msg_id,
                "agent": "email_parser",
                "result": response.message[:500],
            }
        ).execute()
