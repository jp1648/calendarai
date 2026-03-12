from fastapi import APIRouter, Depends, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse

from app.auth.middleware import AuthUser, get_current_user, validate_token
from app.config import get_settings
from app.services.encryption import encrypt
from app.services.resy import ResyClient
from app.services.supabase import get_supabase_admin

router = APIRouter(prefix="/api/resy", tags=["resy"])


def _render_form(token: str, error: str = "", email: str = "") -> str:
    """Render the Resy login HTML page."""
    error_html = ""
    if error:
        error_html = f"""
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;
                    padding:12px 16px;margin-bottom:20px;color:#991B1B;font-size:14px;">
            {error}
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <title>Connect Resy — CalendarAI</title>
    <style>
        * {{ margin:0; padding:0; box-sizing:border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #FAFAFA;
            color: #1A1A1A;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }}
        .card {{
            background: #FFFFFF;
            border: 1px solid #E5E7EB;
            border-radius: 16px;
            padding: 32px 24px;
            width: 100%;
            max-width: 400px;
        }}
        .logo {{
            text-align: center;
            margin-bottom: 24px;
        }}
        .logo-text {{
            font-size: 22px;
            font-weight: 700;
            letter-spacing: -0.3px;
        }}
        .logo-text span {{
            color: #DA3743;
        }}
        .subtitle {{
            text-align: center;
            font-size: 14px;
            color: #6B7280;
            margin-bottom: 24px;
            line-height: 1.5;
        }}
        .trust {{
            text-align: center;
            font-size: 12px;
            color: #9CA3AF;
            margin-bottom: 20px;
            line-height: 1.5;
        }}
        .trust svg {{
            vertical-align: middle;
            margin-right: 4px;
        }}
        label {{
            display: block;
            font-size: 12px;
            font-weight: 500;
            color: #9CA3AF;
            margin-bottom: 4px;
            margin-top: 16px;
        }}
        label:first-of-type {{
            margin-top: 0;
        }}
        input[type="email"],
        input[type="password"] {{
            width: 100%;
            border: 1px solid #E5E7EB;
            border-radius: 10px;
            padding: 12px 14px;
            font-size: 15px;
            background: #FAFAFA;
            color: #1A1A1A;
            outline: none;
            transition: border-color 0.15s;
        }}
        input:focus {{
            border-color: #DA3743;
            box-shadow: 0 0 0 3px rgba(218,55,67,0.1);
        }}
        button {{
            width: 100%;
            margin-top: 24px;
            padding: 14px;
            background: #DA3743;
            color: #fff;
            border: none;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.15s;
        }}
        button:hover {{
            background: #C53030;
        }}
        button:active {{
            transform: scale(0.98);
        }}
        button:disabled {{
            opacity: 0.6;
            cursor: not-allowed;
        }}
        .footer {{
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #9CA3AF;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">
            <div class="logo-text">Connect <span>Resy</span></div>
        </div>
        <p class="subtitle">
            Link your Resy account so CalendarAI can search restaurants
            and book reservations for you.
        </p>
        <p class="trust">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            Your credentials are sent securely to Resy. CalendarAI only stores an authentication token.
        </p>
        {error_html}
        <form method="POST" action="/api/resy/link" id="resyForm">
            <input type="hidden" name="token" value="{token}">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" value="{email}"
                   placeholder="your@email.com" required autocomplete="email">
            <label for="password">Password</label>
            <input type="password" id="password" name="password"
                   placeholder="Resy password" required autocomplete="current-password">
            <button type="submit" id="submitBtn">Connect Resy Account</button>
        </form>
        <div class="footer">
            CalendarAI &middot; Secure connection
        </div>
    </div>
    <script>
        document.getElementById('resyForm').addEventListener('submit', function() {{
            var btn = document.getElementById('submitBtn');
            btn.disabled = true;
            btn.textContent = 'Connecting...';
        }});
    </script>
</body>
</html>"""


@router.get("/link", response_class=HTMLResponse)
async def resy_link_form(token: str):
    """Serve the Resy login form. Token is the user's JWT."""
    await validate_token(token)
    return HTMLResponse(_render_form(token=token))


@router.post("/link")
async def resy_link_submit(
    email: str = Form(...),
    password: str = Form(...),
    token: str = Form(...),
):
    """Process Resy login, store encrypted tokens, redirect to settings."""
    user = await validate_token(token)
    settings = get_settings()

    try:
        client = ResyClient()
        result = await client.login(email, password)
    except ValueError as e:
        return HTMLResponse(
            _render_form(token=token, error=str(e), email=email),
            status_code=200,
        )
    except Exception:
        return HTMLResponse(
            _render_form(token=token, error="Could not connect to Resy. Please try again.", email=email),
            status_code=200,
        )

    sb = get_supabase_admin()
    sb.table("profiles").update({
        "resy_connected": True,
        "resy_auth_token": encrypt(result["auth_token"]),
        "resy_payment_method_id": encrypt(result["payment_method_id"]) if result["payment_method_id"] else None,
    }).eq("id", user.id).execute()

    return RedirectResponse(url=settings.frontend_url + "/settings", status_code=303)


@router.post("/connect")
async def resy_connect_json(
    data: dict,
    user: AuthUser = Depends(get_current_user),
):
    """JSON endpoint for in-app Resy connection."""
    email = data.get("email", "")
    password = data.get("password", "")
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    try:
        client = ResyClient()
        result = await client.login(email, password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception:
        raise HTTPException(status_code=502, detail="Could not connect to Resy. Please try again.")

    sb = get_supabase_admin()
    sb.table("profiles").update({
        "resy_connected": True,
        "resy_auth_token": encrypt(result["auth_token"]),
        "resy_payment_method_id": encrypt(result["payment_method_id"]) if result["payment_method_id"] else None,
    }).eq("id", user.id).execute()

    return {"status": "connected"}


@router.post("/unlink")
async def resy_unlink(user: AuthUser = Depends(get_current_user)):
    """Disconnect Resy account."""
    sb = get_supabase_admin()
    sb.table("profiles").update({
        "resy_connected": False,
        "resy_auth_token": None,
        "resy_payment_method_id": None,
    }).eq("id", user.id).execute()
    return {"status": "unlinked"}
