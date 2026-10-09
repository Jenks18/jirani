-- Lock down personal data tables.
--
-- DEPLOY ORDER: set SUPABASE_SERVICE_ROLE_KEY in Vercel and redeploy BEFORE applying this migration.
-- The app reads/writes through the service role, which bypasses RLS. After this migration the
-- public anon key can no longer read phone numbers or conversation history.

-- reports: previously world-readable (including from_phone)
DROP POLICY IF EXISTS "Allow public read access" ON public.reports;
DROP POLICY IF EXISTS "Allow insert for service role" ON public.reports;
REVOKE ALL ON public.reports FROM anon, authenticated;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- conversations: previously USING (true) for every role
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.conversations;
REVOKE ALL ON public.conversations FROM anon, authenticated;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Erasure helper used for data-deletion requests (see /data-deletion):
--   select public.erase_phone('254700000000');
CREATE OR REPLACE FUNCTION public.erase_phone(p_phone text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.conversations WHERE user_id = p_phone;
  UPDATE public.reports SET from_phone = NULL WHERE from_phone = p_phone;
$$;
REVOKE ALL ON FUNCTION public.erase_phone(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.erase_phone(text) TO service_role;
