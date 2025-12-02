-- Clean Database and Create Reports Table
-- Copy and paste this into Supabase SQL Editor

-- 1. Drop old tables
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;

-- 2. Create reports table with proper schema (using longitude/latitude columns)
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity INTEGER NOT NULL DEFAULT 1,
  summary TEXT NOT NULL,
  location TEXT NOT NULL,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  from_phone TEXT,
  images TEXT[],
  source TEXT DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX idx_reports_event_timestamp ON public.reports(event_timestamp DESC);
CREATE INDEX idx_reports_location ON public.reports(location);
CREATE INDEX idx_reports_type ON public.reports(type);
CREATE INDEX idx_reports_coordinates ON public.reports(longitude, latitude);

-- 4. Enable Row Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 5. Create policies for access
CREATE POLICY "Allow public read access" ON public.reports
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for all" ON public.reports
  FOR INSERT WITH CHECK (true);

-- 6. Grant permissions
GRANT SELECT ON public.reports TO anon;
GRANT ALL ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

-- 7. Verify table was created
SELECT 
  table_name, 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'reports'
ORDER BY ordinal_position;

SELECT '✅ Reports table created successfully!' as status;
