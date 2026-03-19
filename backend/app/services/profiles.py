from app.services.supabase import get_supabase_admin


def get_user_tz(user_id: str) -> str:
    sb = get_supabase_admin()
    result = sb.table("profiles").select("timezone").eq("id", user_id).single().execute()
    return (result.data or {}).get("timezone", "America/New_York")


def get_user_credentials(user_id: str):
    """Fetch and decrypt Google credentials for a user. Returns (Credentials, profile_data) or raises."""
    from app.services.encryption import decrypt
    from app.services.gmail import get_gmail_credentials
    sb = get_supabase_admin()
    profile = (
        sb.table("profiles")
        .select("gmail_connected, gmail_refresh_token")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not profile.data or not profile.data.get("gmail_connected"):
        return None
    refresh_token = decrypt(profile.data["gmail_refresh_token"])
    return get_gmail_credentials(refresh_token)
