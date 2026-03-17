from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from app.config import get_settings


def get_oauth_flow() -> Flow:
    settings = get_settings()
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=[
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/calendar",
        ],
        redirect_uri=settings.google_redirect_uri,
    )
    return flow


def get_gmail_credentials(refresh_token: str) -> Credentials:
    settings = get_settings()
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        token_uri="https://oauth2.googleapis.com/token",
    )
    return creds


def setup_gmail_watch(credentials: Credentials, topic: str) -> dict:
    service = build("gmail", "v1", credentials=credentials)
    result = (
        service.users()
        .watch(userId="me", body={"topicName": topic, "labelIds": ["INBOX"]})
        .execute()
    )
    return result


def get_history(credentials: Credentials, history_id: str) -> list[str]:
    """Fetch new message IDs since the given historyId."""
    service = build("gmail", "v1", credentials=credentials)
    try:
        response = (
            service.users()
            .history()
            .list(userId="me", startHistoryId=history_id, historyTypes=["messageAdded"])
            .execute()
        )
    except Exception:
        return []

    message_ids = []
    for record in response.get("history", []):
        for msg in record.get("messagesAdded", []):
            message_ids.append(msg["message"]["id"])
    return message_ids
