-- Events table for incident reports
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'Unknown',
  severity int not null default 1 check (severity between 1 and 5),
  location text not null default 'Unknown location',
  description text not null default 'No description provided',
  event_timestamp timestamptz not null default now(),
  longitude double precision,
  latitude double precision,
  from_phone text,
  images text[] default '{}',
  source text default 'whatsapp',
  created_at timestamptz not null default now()
);

create index if not exists events_created_at_idx on public.events (created_at desc);
create index if not exists events_event_timestamp_idx on public.events (event_timestamp desc);
create index if not exists events_location_idx on public.events (location);
