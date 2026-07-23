-- Palsplan MVP schema
-- Run this in the Supabase SQL editor, then add the project URL and anon key
-- as VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.

create extension if not exists "pgcrypto";

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) = 6),
  name text not null check (char_length(name) between 1 and 60),
  destinations text[] not null default '{}'
    check (cardinality(destinations) <= 8),
  creator_token_hash text,
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

create table if not exists public.trip_notes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 90),
  body text check (char_length(body) <= 500),
  url text check (char_length(url) <= 2048 and (url is null or url ~* '^https?://')),
  created_at timestamptz not null default now()
);

create index if not exists members_trip_id_idx on public.members(trip_id);
create index if not exists availability_trip_id_idx on public.availability(trip_id);
create index if not exists trip_notes_trip_id_idx on public.trip_notes(trip_id);

alter table public.trips enable row level security;
alter table public.members enable row level security;
alter table public.availability enable row level security;
alter table public.trip_notes enable row level security;

-- MVP access model: the unguessable trip code acts as the invitation.
-- These policies allow the static GitHub Pages client to collaborate anonymously.
-- Before adding sensitive trip details, replace this with Supabase Auth or
-- code-scoped database functions.
create policy "MVP trips are readable" on public.trips for select to anon using (true);
create policy "MVP trips are creatable" on public.trips for insert to anon with check (true);
create policy "MVP members are readable" on public.members for select to anon using (true);
create policy "MVP members are creatable" on public.members for insert to anon with check (true);
create policy "MVP availability is readable" on public.availability for select to anon using (true);
create policy "MVP availability is creatable" on public.availability for insert to anon with check (true);
create policy "MVP availability is removable" on public.availability for delete to anon using (true);
create policy "MVP notes are readable" on public.trip_notes for select to anon using (true);
create policy "MVP notes are creatable" on public.trip_notes for insert to anon with check (true);

alter publication supabase_realtime add table public.trips;
alter publication supabase_realtime add table public.members;
alter publication supabase_realtime add table public.availability;
alter publication supabase_realtime add table public.trip_notes;

create or replace function public.rename_trip(
  target_trip_id uuid,
  new_name text,
  creator_token text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(trim(new_name)) not between 1 and 60 then
    return false;
  end if;

  update public.trips
  set name = trim(new_name)
  where id = target_trip_id
    and creator_token_hash = encode(extensions.digest(creator_token, 'sha256'), 'hex');
  return found;
end;
$$;

create or replace function public.cancel_trip(
  target_trip_id uuid,
  creator_token text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.trips
  where id = target_trip_id
    and creator_token_hash = encode(extensions.digest(creator_token, 'sha256'), 'hex');
  return found;
end;
$$;

revoke all on function public.rename_trip(uuid, text, text) from public;
revoke all on function public.cancel_trip(uuid, text) from public;
grant execute on function public.rename_trip(uuid, text, text) to anon;
grant execute on function public.cancel_trip(uuid, text) to anon;
