-- Palsplan MVP schema
create extension if not exists "pgcrypto";

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) = 6),
  name text not null check (char_length(name) between 1 and 60),
  destinations text[] not null default '{}'
    check (cardinality(destinations) <= 8),
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 32),
  color text not null default '#4f8f7b',
  created_at timestamptz not null default now()
);

create table if not exists public.availability (
  trip_id uuid not null references public.trips(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  primary key (member_id, date)
);

create index if not exists members_trip_id_idx on public.members(trip_id);
create index if not exists availability_trip_id_idx on public.availability(trip_id);

alter table public.trips enable row level security;
alter table public.members enable row level security;
alter table public.availability enable row level security;

-- MVP access model: the unguessable trip code acts as the invitation.
-- Tighten this with authenticated ownership before storing sensitive details.
create policy "MVP trips are readable" on public.trips for select to anon using (true);
create policy "MVP trips are creatable" on public.trips for insert to anon with check (true);
create policy "MVP members are readable" on public.members for select to anon using (true);
create policy "MVP members are creatable" on public.members for insert to anon with check (true);
create policy "MVP availability is readable" on public.availability for select to anon using (true);
create policy "MVP availability is creatable" on public.availability for insert to anon with check (true);
create policy "MVP availability is removable" on public.availability for delete to anon using (true);

alter publication supabase_realtime add table public.members;
alter publication supabase_realtime add table public.availability;
