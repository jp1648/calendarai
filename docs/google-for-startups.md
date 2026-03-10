# Google for Startups Cloud Program — Application Plan

## What We Get

- **Up to $350k in Google Cloud credits** (AI startup tier, 2-year validity)
- Access to Google Cloud technical support & mentors
- Cloud Skills Boost training
- Invitations to Google startup events

## Eligibility

CalendarAI qualifies for the **AI startup track** because:
- We're an AI-first product (LLM-powered calendar agent)
- We use Google Cloud services (Gmail API, potential Vertex AI)
- Early-stage (pre-seed / seed)

### Requirements Checklist

- [ ] **Business email on company domain** — email domain must match company website domain and GCP billing account domain (e.g. jay@calendarai.dev, not a gmail.com address)
- [ ] **Company website live** — calendarai.dev (or whatever domain) needs to be up with a landing page
- [ ] **Google Cloud account** — create at cloud.google.com with the business email
- [ ] **Billing account** — set up a GCP billing account (linked to same business email domain)
- [ ] **Proof of funding** — one of:
  - SAFE agreement
  - Convertible note
  - Term sheet from accredited angel / VC / accelerator
  - If unfunded: still eligible for **Start tier** ($2k credits / 1 year)

### What's NOT Accepted

- Government grants, prize funding, crowdfunding, friends & family
- Consultancies, agencies, dev shops
- Companies that have IPO'd or been acquired

## Application Steps

### Step 1: Prerequisites (do these first)

1. **Register a domain** (e.g. calendarai.dev or calendarai.com)
2. **Set up business email** on that domain (e.g. jay@calendarai.dev) — Google Workspace or any email provider
3. **Deploy the landing page** to that domain (even a simple one explaining the product)
4. **Create a Google Cloud account** using the business email
5. **Create a GCP billing account** under the same email domain

### Step 2: Apply

1. Go to **https://cloud.google.com/startup/apply**
2. Fill in:
   - Company name: CalendarAI
   - Business email: (your @calendarai.dev email)
   - Company website: https://calendarai.dev
   - Description: AI calendar assistant that books appointments for users using browser automation and LLM agents
   - Funding status: (your current stage)
   - Funding proof: upload SAFE/term sheet if available
3. Select **AI startup** track if prompted (higher credit tier)
4. Submit

### Step 3: Wait for Approval

- Standard: **3-5 business days**
- New GCP accounts may take **7-10 additional days**

### Step 4: After Approval

1. Credits appear in your GCP billing account
2. Enable APIs we need:
   - Gmail API (already using)
   - Cloud Run (for backend deployment option)
   - Cloud Storage (if needed)
   - Vertex AI (optional — could use for embeddings or fallback LLM)
3. Update `.env` with any GCP-specific config

## How Credits Help CalendarAI

| Service | Use Case | Est. Monthly Cost |
|---------|----------|-------------------|
| Gmail API | Read verification emails for booking flow | Free (quota-based) |
| Cloud Run | Backend hosting (alternative to Fly.io) | ~$10-30/mo |
| Cloud Storage | User data, backups | ~$5/mo |
| Vertex AI | Gemini models (alternative to OpenRouter) | Variable |
| Cloud SQL | PostgreSQL (alternative to Supabase) | ~$30/mo |

With $350k in credits, infrastructure costs are effectively free for 2+ years.

## Timeline

| When | Action |
|------|--------|
| **Day 1** | Register domain, set up business email |
| **Day 1** | Deploy landing page to domain |
| **Day 1** | Create GCP account + billing account |
| **Day 2** | Submit application |
| **Day 5-7** | Expected approval |
| **Day 7+** | Start using credits for deployment |

## Links

- Apply: https://cloud.google.com/startup/apply
- AI program: https://cloud.google.com/startup/ai
- Eligibility: https://cloud.google.com/startup/benefits
- FAQ: https://cloud.google.com/startup/faq
