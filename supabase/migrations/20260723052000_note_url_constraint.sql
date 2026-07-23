alter table public.trip_notes
  add constraint trip_notes_safe_url
  check (url is null or url ~* '^https?://');
