-- Calendar permissions: controls who can see availability / book on your calendar
CREATE TABLE public.calendar_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    grantee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    level TEXT NOT NULL DEFAULT 'free_busy'
        CHECK (level IN ('free_busy', 'view', 'book', 'book_confirm')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    UNIQUE (owner_id, grantee_id)
);

CREATE INDEX idx_calendar_permissions_owner ON public.calendar_permissions(owner_id);
CREATE INDEX idx_calendar_permissions_grantee ON public.calendar_permissions(grantee_id);

ALTER TABLE public.calendar_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners_manage" ON public.calendar_permissions
    FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "grantees_read" ON public.calendar_permissions
    FOR SELECT USING (auth.uid() = grantee_id);

-- Booking invites: pending event proposals between users
CREATE TABLE public.booking_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_title TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined')),
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ
);

CREATE INDEX idx_booking_invites_to ON public.booking_invites(to_user_id, status);

ALTER TABLE public.booking_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sender_manage" ON public.booking_invites
    FOR ALL USING (auth.uid() = from_user_id);
CREATE POLICY "recipient_read_update" ON public.booking_invites
    FOR SELECT USING (auth.uid() = to_user_id);
CREATE POLICY "recipient_respond" ON public.booking_invites
    FOR UPDATE USING (auth.uid() = to_user_id)
    WITH CHECK (auth.uid() = to_user_id);

-- Enable realtime on invites so recipients get instant notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_invites;
