from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import events, agents, gmail, google_calendar, ical, sharing, profile, resy, square, calendly
from app.services.supabase import get_supabase_client

app = FastAPI(title="CalendarAI", version="0.1.0")

settings = get_settings()

# Parse CORS origins from settings; fall back to localhost defaults in dev
if settings.cors_origins:
    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
else:
    origins = [
        "http://localhost:8081",
        "http://localhost:19006",
        "http://localhost:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router)
app.include_router(agents.router)
app.include_router(gmail.router)
app.include_router(google_calendar.router)
app.include_router(ical.router)
app.include_router(sharing.router)
app.include_router(profile.router)
app.include_router(resy.router)
app.include_router(square.router)
app.include_router(calendly.router)


@app.get("/api/health")
async def health():
    """Health check — pings Supabase to verify DB connectivity."""
    try:
        sb = get_supabase_client()
        sb.table("events").select("id", count="exact").limit(0).execute()
        db_status = "connected"
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "db": "disconnected", "environment": settings.environment},
        )

    return {"status": "ok", "db": db_status, "environment": settings.environment}
