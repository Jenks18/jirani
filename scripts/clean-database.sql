-- Clean Database Script
-- Copy and paste this into Supabase SQL Editor

-- 1. Delete all data from both tables
DELETE FROM public.events;
DELETE FROM public.reports;

-- 2. Verify tables are empty
SELECT 'events' as table_name, COUNT(*) as record_count FROM public.events
UNION ALL
SELECT 'reports' as table_name, COUNT(*) as record_count FROM public.reports;

-- 3. Optional: Drop events table if you only want to use reports
-- DROP TABLE IF EXISTS public.events CASCADE;

SELECT '✅ Database cleaned successfully' as status;
