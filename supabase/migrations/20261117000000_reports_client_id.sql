-- Idempotency key for reports that arrive from the Jirani Mesh phone app.
--
-- Several phones can carry the same report to the server, and a phone retries after a dropped connection.
-- The app gives every report a random UUID; storing it under a unique index makes the second insert a no-op.
--
-- DEPLOY ORDER: safe in either order. The application inserts client_id when the column exists and falls
-- back to inserting without it when it does not (Postgres error 42703), so this can be applied after the
-- code is live.
--
-- The value is a random identifier generated on the phone. It is not linked to any phone number, account
-- or device key. The reports table is not readable by the public anon key (see 20261009000000).

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS client_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS reports_client_id_key
  ON public.reports (client_id)
  WHERE client_id IS NOT NULL;
