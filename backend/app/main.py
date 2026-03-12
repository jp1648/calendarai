from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import events, agents, gmail, ical, sharing, profile, resy

app = FastAPI(title="CalendarAI", version="0.1.0")

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router)
app.include_router(agents.router)
app.include_router(gmail.router)
app.include_router(ical.router)
app.include_router(sharing.router)
app.include_router(profile.router)
app.include_router(resy.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
