-- Check the actual reports table schema in your Supabase
-- Run this in Supabase SQL Editor to see what columns exist

SELECT 
  column_name, 
  data_type, 
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'reports'
ORDER BY ordinal_position;
