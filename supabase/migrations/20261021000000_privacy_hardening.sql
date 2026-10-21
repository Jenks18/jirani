-- Privacy hardening: unlink map reports from people. No rows are deleted and no report content changes.
--
-- DEPLOY ORDER
--   1. Deploy the application code that no longer reads or writes reports.from_phone.
--   2. Run this file in the Supabase SQL editor (safe to run more than once).
--   3. Set DATA_ENCRYPTION_KEY in Vercel, redeploy, then run
--      `npx tsx scripts/seal-existing-data.ts --apply` to encrypt rows that already exist.
--
-- Existing reports keep their stored coordinates and times; the public feed blurs them when serving.

-- 1. Reports carry no reporter. Only the phone number is removed from each report; the column stays so nothing else breaks.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reports' and column_name = 'from_phone') then
    execute 'update public.reports set from_phone = null where from_phone is not null';
  end if;
end $$;

-- 2. Sign-out revokes every session for the account.
alter table public.members add column if not exists session_epoch integer not null default 0;

-- 3. Any table created from now on is closed to the public API unless a policy is added on purpose.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- 4. Check. This should return no rows. Any row names a table without row level security,
--    or a table the public API key can still reach.
select 'row level security is off' as problem, tablename::text as detail
from pg_tables
where schemaname = 'public' and not rowsecurity
union all
select 'reachable with the public key', table_name::text || ' (' || grantee::text || ': ' || privilege_type::text || ')'
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated');
