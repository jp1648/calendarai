# Restaurant Reservation APIs (Reverse-Engineered)

## Resy

**Auth headers:**
```
Authorization: ResyAPI api_key="<key>"
x-resy-auth-token: <token>
x-resy-universal-auth: <token>
```

**Token source:** Browser DevTools on resy.com → Network tab → copy from any API request headers.

**Endpoints:**

| Method | URL | Purpose |
|--------|-----|---------|
| GET | `api.resy.com/4/find` | Search available slots |
| POST | `api.resy.com/3/details` | Get `book_token` from a `config_id` |
| POST | `api.resy.com/3/book` | Book using `book_token` + `payment_method_id` |

- `find` params: `venue_id`, `day` (YYYY-MM-DD), `party_size`
- POST bodies are **`application/x-www-form-urlencoded`**, not JSON
- Booking flow: find → pick slot → get `config_id` → details → get `book_token` → book

## OpenTable

**Auth header:**
```
Authorization: Bearer <token>
```

**Token source:** Proxy the OpenTable mobile app (Charles/mitmproxy).

**Endpoints:**

| Method | URL | Purpose |
|--------|-----|---------|
| PUT | `mobile-api.opentable.com/api/v3/restaurant/availability` | Check available slots |
| POST | `mobile-api.opentable.com/api/v1/reservation/{id}/lock` | Lock a slot (~5 min hold) |
| POST | `mobile-api.opentable.com/api/v1/reservation/{id}` | Confirm locked reservation |

- Availability body (JSON): `restaurantId`, `date`, `partySize`
- Two-step booking: lock the slot first, then confirm immediately
