-- Drop old tables and create clean reports table
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;

-- Create reports table with correct schema
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity INTEGER NOT NULL DEFAULT 1,
  summary TEXT NOT NULL,
  location TEXT NOT NULL,
  coordinates POINT,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  from_phone TEXT,
  images TEXT[],
  source TEXT DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX idx_reports_event_timestamp ON public.reports(event_timestamp DESC);
CREATE INDEX idx_reports_location ON public.reports(location);
CREATE INDEX idx_reports_type ON public.reports(type);

-- Enable Row Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON public.reports
  FOR SELECT USING (true);

-- Create policy to allow inserts (for the service role or authenticated users)
CREATE POLICY "Allow insert for service role" ON public.reports
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.reports TO anon;
GRANT ALL ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
