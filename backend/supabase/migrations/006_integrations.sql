-- Migration 006: Add integration columns for Square, Calendly, Eventbrite,
-- and expand the events.source CHECK constraint for new integration sources.

-- ============================================================================
-- 1. Square Appointments
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS square_connected BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS square_access_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS square_refresh_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS square_merchant_id TEXT;

-- ============================================================================
-- 2. Calendly
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS calendly_connected BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS calendly_access_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS calendly_refresh_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS calendly_user_uri TEXT;

-- ============================================================================
-- 3. Eventbrite
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS eventbrite_connected BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS eventbrite_access_token TEXT;

-- ============================================================================
-- 4. Expand events.source CHECK constraint
--    Old: ('manual', 'email_agent', 'schedule_agent')
--    New: adds 'google_calendar', 'eventbrite', 'resy', 'square', 'calendly'
-- ============================================================================
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_source_check;
ALTER TABLE public.events ADD CONSTRAINT events_source_check
    CHECK (source IN (
        'manual',
        'email_agent',
        'schedule_agent',
        'google_calendar',
        'eventbrite',
        'resy',
        'square',
        'calendly'
    ));

-- ============================================================================
-- 5. Index for source_ref lookups (used by Google Calendar sync dedup)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_events_source_ref
    ON public.events(user_id, source, source_ref)
    WHERE source_ref IS NOT NULL;

-- ============================================================================
-- 6. Update profile GET query in backend
--    The profile router SELECT needs to include new columns.
--    RLS already covers this — profiles have row-level policies scoped to auth.uid().
--    No new RLS policies needed since existing UPDATE/SELECT policies apply.
-- ============================================================================
