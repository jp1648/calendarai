-- Profiles: extends auth.users
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    timezone text not null default 'America/New_York',
    gmail_connected boolean not null default false,
    gmail_refresh_token text,
    ical_feed_token uuid not null default gen_random_uuid(),
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email)
    values (new.id, new.email);
    return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Events: core calendar data
create table public.events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    description text not null default '',
    location text not null default '',
    start_time timestamptz not null,
    end_time timestamptz not null,
    all_day boolean not null default false,
    source text not null default 'manual' check (source in ('manual', 'email_agent', 'schedule_agent')),
    source_ref text,
    confidence float not null default 1.0,
    undo_available boolean not null default false,
    undo_expires_at timestamptz,
    metadata jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_events_user_start on public.events(user_id, start_time);

alter table public.events enable row level security;
create policy "Users can read own events" on public.events for select using (auth.uid() = user_id);
create policy "Users can insert own events" on public.events for insert with check (auth.uid() = user_id);
create policy "Users can update own events" on public.events for update using (auth.uid() = user_id);
create policy "Users can delete own events" on public.events for delete using (auth.uid() = user_id);

-- Enable realtime on events
alter publication supabase_realtime add table public.events;

-- Processed items: dedup log for email agent
create table public.processed_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    item_type text not null,
    item_id text not null,
    agent text not null,
    result text,
    created_at timestamptz not null default now(),
    unique(user_id, item_type, item_id)
);

alter table public.processed_items enable row level security;
create policy "Users can read own processed items" on public.processed_items for select using (auth.uid() = user_id);

-- Agent runs: observability
create table public.agent_runs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    agent_name text not null,
    trigger_mode text not null,
    input_summary text,
    output_summary text,
    events_created integer not null default 0,
    model_used text,
    tokens_used integer,
    status text not null default 'running',
    created_at timestamptz not null default now(),
    completed_at timestamptz
);

alter table public.agent_runs enable row level security;
create policy "Users can read own agent runs" on public.agent_runs for select using (auth.uid() = user_id);

-- Gmail watch state
create table public.gmail_watch_state (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    history_id text not null,
    watch_expiry timestamptz not null
);

alter table public.gmail_watch_state enable row level security;
create policy "Users can read own watch state" on public.gmail_watch_state for select using (auth.uid() = user_id);
