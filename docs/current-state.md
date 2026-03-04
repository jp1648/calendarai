# CalendarAI — Current State

## Backend Endpoints (FastAPI)

### Events (`/api/events`)
- `GET /` — List events with date range filters (`start`, `end` query params)
- `GET /{event_id}` — Get single event
- `POST /` — Create event (title, dates, source tracking)
- `PATCH /{event_id}` — Update event
- `DELETE /{event_id}` — Delete event

### Agents (`/api/agents`)
- `POST /run` — Generic endpoint to run any registered agent by name
- `POST /schedule` — Smart router that picks fast (Haiku) or complex (Sonnet) scheduler
- `GET /available` — List all registered agents with configs

### Gmail (`/api/gmail`)
- `GET /auth-url` — Get OAuth authorization URL
- `GET /callback` — OAuth callback handler
- `POST /webhook` — Google Pub/Sub webhook for Gmail push notifications

### iCal (`/api/ical`)
- `GET /feed/{token}` — Public iCal feed endpoint (secured by UUID token)

### Health
- `GET /api/health` — Basic health check

---

## Registered Agents

| Agent | Model | Trigger | Purpose |
|-------|-------|---------|---------|
| `smart_scheduler_fast` | Haiku | PULL | Fast scheduling for straightforward requests |
| `smart_scheduler` | Sonnet | PULL | Complex scheduling with advanced reasoning |
| `email_parser` | Haiku | PUSH | Parse Gmail for flights, reservations, events |

### Agent Tools
- `create_event` — Insert event into Supabase
- `check_conflicts` — Query overlapping events in a time range
- `list_events_for_date` — List all events for a given date
- `get_current_time` — Current time in user's timezone
- `parse_datetime` — Natural language date/time to ISO 8601
- `get_email_content` — Fetch Gmail message body/headers

---

## Agent Infrastructure

### Core Registry (`app/agents/core/`)
- **registry.py** — ToolRegistry and AgentRegistry. Central management, lazy instantiation.
- **runner.py** — AgentRunner with observability (logging, cost tracking, event fetch).
- **router.py** — SemanticRouter using sentence-transformers (all-MiniLM-L6-v2) for model selection. ~7ms per classification.
- **schemas.py** — AgentRequest, AgentResponse, TriggerMode, RunStatus.

### Observability
- Agent runs logged to `agent_runs` table: status, tokens_used, model_used, elapsed time, output_summary, events_created count.
- Processed items tracked in `processed_items` for email dedup.

### Event Source Tracking
- `source`: `'manual'` | `'email_agent'` | `'schedule_agent'`
- `source_ref`: e.g. Gmail message ID
- `confidence`: 0–1 float for AI-generated events
- `undo_available`: flag for agent-created events

---

## Frontend Screens

### Auth
- `(auth)/login.tsx` — Email/password login
- `(auth)/signup.tsx` — Account creation

### App
- `(app)/index.tsx` — Month view with navigation + NaturalLanguageBar
- `(app)/day/[date].tsx` — Day view with timeline for selected date
- `(app)/event/new.tsx` — Manual event creation form
- `(app)/settings.tsx` — Account info, Gmail connect, iCal feed URL, sign out

### Components
- `MonthView` — Calendar grid with event dots, blue dots for AI events
- `DayView` — Vertical timeline with positioned event cards
- `EventCard` — Event display with source-colored left border
- `AgentBadge` — "AI" or "Email" badge on agent-created events
- `NaturalLanguageBar` — Text input → agent scheduling with undo alert

### Hooks & State
- `useAuth()` — Session management, signUp/signIn/signOut
- `useEvents(currentMonth)` — Fetch events + Supabase Realtime subscription
- `useAgent()` — schedule() and run() for agent invocation
- `eventStore` (Zustand) — Centralized event state

---

## Infrastructure

### Database (Supabase)
- **profiles** — Extends auth.users (timezone, gmail_connected, ical_feed_token)
- **events** — Core calendar data with source tracking, indexed on (user_id, start_time)
- **processed_items** — Dedup log for email agent
- **agent_runs** — Observability table
- **gmail_watch_state** — Tracks Gmail push notification state
- RLS on all tables scoped to `auth.uid()`
- Realtime enabled on `events`

### Makefile
- `make dev` — Run both backend + frontend
- `make install` — Install all deps (uv sync + npm install)

---

## What Needs Work Next

### Quick Wins
1. Event refresh after agent creates — may need better fetch/render timing
2. Undo flow polish — toast instead of Alert for web
3. Event editing/deletion UI — API exists, no frontend buttons yet

### Medium Effort
4. Gmail integration — Code ready, needs GCP project setup (Gmail API, OAuth, Pub/Sub)
5. Better date/time picker — currently plain text inputs
6. Mobile styling polish — gestures, animations

### Bigger Items
7. Deploy — Backend to Railway, frontend to Vercel
8. Additional agents — registry pattern makes this trivial
9. Native app — Expo build for iOS/Android after web validation
