-- Areas, communities, alerts, news and the WhatsApp safety net.
-- Run in the Supabase SQL editor. All tables are service-role only (RLS on, no anon/authenticated access).

-- ── Areas: a hierarchy (country > county > sub-county > neighborhood) ─────────────────────────
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.areas(id) on delete set null,
  level text not null check (level in ('country','county','subcounty','neighborhood')),
  name text not null,
  slug text not null unique,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_m integer not null default 5000,
  created_at timestamptz not null default now()
);
create index if not exists areas_parent_idx on public.areas(parent_id);

-- ── Members: an "account" is a verified WhatsApp number. No passwords, no email. ───────────────
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  display_name text,
  pending jsonb,                      -- short-lived conversational state, e.g. {"action":"subscribe","at":"..."}
  last_location jsonb,                -- {"lat":..,"lng":..,"at":".."} most recent shared pin
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

-- ── Communities: groups tied to an area, with a role hierarchy ────────────────────────────────
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  area_id uuid references public.areas(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);
create table if not exists public.memberships (
  member_id uuid not null references public.members(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  role text not null default 'member' check (role in ('member','moderator','admin')),
  joined_at timestamptz not null default now(),
  primary key (member_id, community_id)
);

-- ── Alert subscriptions ──────────────────────────────────────────────────────────────────────
create table if not exists public.alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  area_id uuid references public.areas(id) on delete cascade,
  lat double precision,
  lng double precision,
  radius_m integer not null default 1000,
  min_severity integer not null default 3 check (min_severity between 1 and 5),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (area_id is not null or (lat is not null and lng is not null))
);
create index if not exists alert_subs_active_idx on public.alert_subscriptions(active);

-- ── News / safety updates posted by the team ─────────────────────────────────────────────────
create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  area_id uuid references public.areas(id) on delete set null,
  community_id uuid references public.communities(id) on delete set null,
  title text not null,
  body text not null,
  author text,
  pinned boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists news_published_idx on public.news_posts(published_at desc);

-- ── Safety net ───────────────────────────────────────────────────────────────────────────────
create table if not exists public.safety_profiles (
  member_id uuid primary key references public.members(id) on delete cascade,
  grace_minutes integer not null default 10 check (grace_minutes between 1 and 120),   -- wait this long after a missed check-in before alerting contacts
  share_location boolean not null default true,
  default_checkin_minutes integer not null default 60 check (default_checkin_minutes between 5 and 1440),
  sos_message text,
  updated_at timestamptz not null default now()
);
create table if not exists public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  contact_phone text not null,
  contact_name text not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','removed')),
  notify_sos boolean not null default true,
  notify_checkin boolean not null default true,
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (member_id, contact_phone)
);
create index if not exists trusted_contacts_phone_idx on public.trusted_contacts(contact_phone, status);
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  due_at timestamptz not null,
  status text not null default 'active' check (status in ('active','nudged','safe','missed','cancelled')),
  note text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists checkins_due_idx on public.checkins(status, due_at);
create table if not exists public.sos_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  lat double precision,
  lng double precision,
  contacts_notified integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

-- ── Lock everything down ─────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['areas','members','communities','memberships','alert_subscriptions','news_posts',
                           'safety_profiles','trusted_contacts','checkins','sos_events']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

-- Public read-only views would be safer than service-role-only API reads, but the app reads through
-- server routes, so nothing here is exposed to the browser directly.

-- Seed: Kenya and its major hubs
insert into public.areas (level, name, slug, center_lat, center_lng, radius_m) values
  ('country','Kenya','kenya',-0.0236,37.9062,700000)
on conflict (slug) do nothing;
insert into public.areas (parent_id, level, name, slug, center_lat, center_lng, radius_m)
select (select id from public.areas where slug='kenya'), v.level, v.name, v.slug, v.lat, v.lng, v.r
from (values
  ('county','Nairobi','nairobi',-1.2921,36.8219,22000),
  ('county','Mombasa','mombasa',-4.0435,39.6682,15000),
  ('county','Kisumu','kisumu',-0.0917,34.7680,12000),
  ('county','Nakuru','nakuru',-0.3031,36.0800,15000),
  ('county','Kiambu','kiambu',-1.1714,36.8356,20000),
  ('county','Uasin Gishu','uasin-gishu',0.5143,35.2698,20000)
) as v(level,name,slug,lat,lng,r)
on conflict (slug) do nothing;
insert into public.areas (parent_id, level, name, slug, center_lat, center_lng, radius_m)
select (select id from public.areas where slug='nairobi'), 'neighborhood', v.name, v.slug, v.lat, v.lng, v.r
from (values
  ('Westlands','westlands',-1.2676,36.8108,3500),
  ('Kilimani','kilimani',-1.2896,36.7870,2500),
  ('Kasarani','kasarani',-1.2210,36.8990,4500),
  ('Embakasi','embakasi',-1.3190,36.9040,6000),
  ('Kibera','kibera',-1.3133,36.7876,2500),
  ('Eastleigh','eastleigh',-1.2760,36.8500,2500),
  ('CBD','nairobi-cbd',-1.2864,36.8172,1800)
) as v(name,slug,lat,lng,r)
on conflict (slug) do nothing;
