alter table public.trips
  add column if not exists creator_token_hash text;

create table if not exists public.trip_notes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 90),
  body text check (char_length(body) <= 500),
  url text check (char_length(url) <= 2048),
  created_at timestamptz not null default now()
);

create index if not exists trip_notes_trip_id_idx on public.trip_notes(trip_id);

alter table public.trip_notes enable row level security;

create policy "MVP notes are readable"
  on public.trip_notes for select to anon using (true);

create policy "MVP notes are creatable"
  on public.trip_notes for insert to anon with check (true);

alter publication supabase_realtime add table public.trips;
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
