-- Create conversations table to persist WhatsApp conversation state
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  messages JSONB DEFAULT '[]'::jsonb,
  current_incident JSONB,
  awaiting_confirmation BOOLEAN DEFAULT false,
  conversation_phase TEXT DEFAULT 'greeting',
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_last_activity ON public.conversations(last_activity DESC);

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations for service role" ON public.conversations
  FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON public.conversations TO service_role;
GRANT ALL ON public.conversations TO authenticated;

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversations_updated_at();

SELECT '✅ Conversations table created successfully!' as status;
