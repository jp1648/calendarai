# CalendarAI — E2E Testing Plan

## Overview

End-to-end tests that validate the full user journey through the app. Each test covers frontend → API → agent/DB → response, testing the real system with real (or sandboxed) external services.

---

## Test Environment

| Service | Test Config |
|---------|-------------|
| **Supabase** | Same project, test user: `test@calendarai.dev` |
| **LLM (OpenRouter)** | Live — Gemini Flash Lite (fast agent) + Claude Sonnet (complex agent) |
| **Browserbase** | Live sandbox sessions |
| **Tavily** | Live web search |
| **Gmail** | Requires Google OAuth creds (blocked until creds configured) |
| **Mindbody** | Sandbox mode (site_id: -99) |

---

## Test Suites

### 1. Auth Flow

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1.1 | **Signup** | Open app → tap Sign Up → enter email/password → submit | Account created, redirected to calendar |
| 1.2 | **Login** | Open app → enter test creds → submit | Logged in, month view loads with events |
| 1.3 | **Invalid login** | Enter wrong password → submit | Error message shown, stays on login |
| 1.4 | **Sign out** | Settings → Sign out | Redirected to login screen |
| 1.5 | **Session persistence** | Login → close tab → reopen app | Still logged in (token in storage) |

### 2. Calendar Navigation

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 2.1 | **Month view renders** | Login → land on month view | All 7 day columns visible, today highlighted, event dots on correct days |
| 2.2 | **Month navigation** | Tap → arrow, then ← arrow | Month changes forward/back, correct grid layout |
| 2.3 | **Month picker** | Tap month title | Modal with month/year selector, can jump to any month |
| 2.4 | **Day view from month** | Tap a date with events | Navigates to day view, events shown at correct times |
| 2.5 | **Day view empty** | Tap a date with no events | Day view with empty timeline, no crashes |
| 2.6 | **Back navigation** | Day view → tap ← | Returns to month view on same month |

### 3. Manual Event CRUD

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 3.1 | **Create event** | Day view → + New → fill title/time → save | Event appears on day view, purple dot on month view |
| 3.2 | **Edit event** | Tap event → edit title → save | Updated title shown |
| 3.3 | **Delete event** | Tap event → delete | Event removed from day view and month dot |
| 3.4 | **All-day event** | Create with all-day toggle on | Shows at top of day view, not in timeline |
| 3.5 | **Event with location** | Create event with location field | Location shown on event detail |

### 4. Agent — Simple Scheduling (Fast Path)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.1 | **Create event via chat** | Type "lunch tomorrow at noon" → send | Agent creates event, chat shows confirmation, event appears on calendar |
| 4.2 | **Conflict detection** | Create event at occupied time | Agent warns about conflict, suggests alternative |
| 4.3 | **Relative dates** | "Meeting next Friday at 3pm" | Agent resolves date correctly, creates event |
| 4.4 | **Streaming response** | Send any message | SSE stream shows text appearing word-by-word, no truncation |
| 4.5 | **First words not truncated** | Send message, watch response | First words visible (PartStartEvent handled correctly) |

### 5. Agent — Complex Scheduling (Full Path)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 5.1 | **Web search** | "Find Italian restaurants near me" | Agent searches web, presents 2-3 options with details |
| 5.2 | **Semantic routing** | Simple vs complex queries | Simple → fast response (Gemini), complex → slower (Sonnet) with tool calls |
| 5.3 | **Tool call visibility** | Complex query that triggers tools | Chat shows tool_call and tool_result events in stream |
| 5.4 | **Multi-turn conversation** | Ask question → follow up → follow up | Agent maintains context via thread_id, references prior messages |
| 5.5 | **New chat** | Tap "New chat" after conversation | Clears thread, fresh conversation |

### 6. Agent — Browser Booking Flow

> **This is the core product test. Most critical suite.**

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 6.1 | **Booking search** | "Book a haircut near Midtown Manhattan" | Agent searches, presents 2-3 salon options |
| 6.2 | **Booking execution** | Pick an option from 6.1 | Agent uses browser_navigate → browser_observe → browser_act to book |
| 6.3 | **Form auto-fill** | During booking, site asks for name/phone | Agent uses profile data to fill forms (not asks user) |
| 6.4 | **Guest checkout** | Site offers guest vs account | Agent chooses guest checkout |
| 6.5 | **Booking confirmation** | After booking completes | Agent extracts confirmation, creates calendar event with booking metadata |
| 6.6 | **Browser retry** | Simulate a failed browser action | Agent retries (up to 3x) before giving up |
| 6.7 | **No link sharing** | Any booking scenario | Agent NEVER shares a link and tells user to book themselves |

### 7. Agent — Account Login Flow

> **Depends on Gmail OAuth being configured (Task #1)**

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 7.1 | **Passwordless login** | Book on platform requiring sign-in | Agent enters user email, platform sends verification email |
| 7.2 | **Gmail search for code** | After 7.1 | Agent calls search_gmail to find verification email |
| 7.3 | **Extract verification code** | After 7.2 | Agent calls get_email_content, extracts code/link |
| 7.4 | **Complete login** | After 7.3 | Agent enters code via browser_act or navigates magic link |
| 7.5 | **Password prompt** | Platform asks for password (not code) | Agent asks user for help — never guesses |
| 7.6 | **SMS/CAPTCHA** | Platform requires SMS OTP or CAPTCHA | Agent asks user to complete that step |

### 8. Profile & Settings

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 8.1 | **Load profile** | Open Settings | Profile fields populated from DB |
| 8.2 | **Edit profile** | Change name → Save Changes | Success alert, profile updated |
| 8.3 | **Save button visibility** | No changes made | Save button hidden. Make change → button appears |
| 8.4 | **Gmail connect** | Tap Connect Gmail | Opens Google OAuth URL in browser |
| 8.5 | **iCal feed copy** | Tap Copy Feed URL | URL copied with UUID token (not email) |
| 8.6 | **iCal feed works** | Open copied URL in browser | Valid .ics file with user's events |

### 9. iCal Feed

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 9.1 | **Feed returns valid iCal** | GET /api/ical/feed/{token} | Content-Type: text/calendar, valid VCALENDAR |
| 9.2 | **Feed contains events** | Create event → fetch feed | New event in feed as VEVENT |
| 9.3 | **Invalid token** | GET /api/ical/feed/bad-uuid | 404 or empty calendar |
| 9.4 | **Google Calendar import** | Add feed URL to Google Calendar | Events sync within ~12 hours |

### 10. Responsive UI

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 10.1 | **iPhone SE (375px)** | Resize to 375px width | All content fits, no horizontal scroll, text readable |
| 10.2 | **iPhone 14 (390px)** | Resize to 390px (base) | Pixel-perfect layout |
| 10.3 | **iPhone 14 Pro Max (430px)** | Resize to 430px | Scales up proportionally |
| 10.4 | **Saturday column** | Any width | All 7 day columns visible, Saturday not cut off |
| 10.5 | **Chat panel** | Open chat at various widths | Chat bubbles wrap correctly, input bar usable |

---

## Priority Order

Execute in this order (highest value first):

1. **Suite 4** (Simple scheduling) — validates core agent + streaming
2. **Suite 6** (Browser booking) — validates the core product differentiator
3. **Suite 2** (Calendar nav) — validates basic UX
4. **Suite 3** (Event CRUD) — validates data flow
5. **Suite 8** (Settings/Profile) — validates profile system
6. **Suite 5** (Complex scheduling) — validates semantic routing + multi-turn
7. **Suite 1** (Auth) — validates auth flow
8. **Suite 10** (Responsive) — validates mobile layout
9. **Suite 9** (iCal) — validates feed export
10. **Suite 7** (Account login) — blocked on Gmail OAuth creds

---

## Running Tests

### Manual (Browser)
```bash
# Start backend
cd backend && uv run uvicorn app.main:app --reload --port 8000

# Start frontend
cd frontend && npx expo start --web --port 8081

# Open Chrome at mobile viewport
# Use Claude Code browser tools or Chrome DevTools device emulation
```

### Automated (Future)
- **Backend:** pytest + httpx TestClient (existing tests in backend/tests/)
- **Frontend:** Playwright for browser automation
- **Agent:** Record expected tool call sequences, assert against actual

---

## Exit Criteria

A test suite passes when:
- All steps complete without errors
- Agent responses are coherent and non-truncated
- Events appear on calendar after agent creates them
- No console errors in frontend
- No 500s in backend logs
- Browser automation completes booking (suite 6) without sharing a link
