-- Create extensions
create extension if not exists "uuid-ossp";

-- Create tables
create table if not exists reports (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    description text,
    latitude double precision not null,
    longitude double precision not null,
    severity text not null,
    status text not null default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    reported_by uuid,
    location_name text,
    tags text[]
);

-- Create indexes
create index if not exists reports_location_idx on reports using gist (
    ll_to_earth(latitude, longitude)
);

-- Create RLS policies
alter table reports enable row level security;

create policy "Reports are viewable by everyone"
    on reports for select
    using (true);

create policy "Reports can be inserted by authenticated users"
    on reports for insert
    with check (auth.role() = 'authenticated');

-- Create functions
create or replace function nearby_reports(
    lat double precision,
    lng double precision,
    radius_meters double precision
) returns setof reports
language sql
stable
as $$
    select *
    from reports
    where earth_box(ll_to_earth(lat, lng), radius_meters) @> ll_to_earth(latitude, longitude)
    order by earth_distance(ll_to_earth(lat, lng), ll_to_earth(latitude, longitude))
$$;
