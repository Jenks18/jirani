-- Add last_stored_at column to prevent re-detection of recently stored incidents
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS last_stored_at TIMESTAMPTZ;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_conversations_last_stored_at 
ON public.conversations(last_stored_at DESC);

SELECT '✅ Added last_stored_at column to conversations table!' as status;
