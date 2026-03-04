# CalendarAI

AI calendar app — agents work in the background to fill and manage your calendar.

## Stack
- **Backend:** FastAPI, Pydantic AI, OpenRouter (Haiku + Sonnet), Supabase
- **Frontend:** Expo/React Native (web-first), expo-router, Zustand, Supabase Realtime

## Project Structure
```
backend/         FastAPI app
  app/main.py    Entry point
  app/routers/   API routes (events, agents, gmail, ical)
  app/agents/    Pydantic AI agents (smart_scheduler, email_parser)
  app/services/  Supabase, Gmail, iCal service layers
frontend/        Expo app
  app/           expo-router screens
  components/    Calendar views, NaturalLanguageBar
  hooks/         useAuth, useEvents, useAgent
  stores/        Zustand event store
```

## Commands
- Backend: `cd backend && uv run uvicorn app.main:app --reload`
- Frontend: `cd frontend && npx expo start --web`
- Both: `make dev` (from repo root)
- Install all deps: `make install`

## Rules
- Never commit `.env` files or credentials
- Agent events use `source` field: 'manual' | 'email_agent' | 'schedule_agent'
- All tables have RLS scoped to auth.uid()
- iCal feed is public but secured by unguessable UUID token
