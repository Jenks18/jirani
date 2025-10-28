import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Defensive: if env vars are missing, avoid calling createClient which would cause runtime fetch errors.
// Export a null client and a flag so callers can decide to fallback to file storage immediately.
export const supabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseEnabled
	? createClient(supabaseUrl as string, supabaseAnonKey as string)
	: null;

if (!supabaseEnabled) {
	// Log once during startup so deploy logs show the missing config.
	// Avoid throwing here; callers will fallback gracefully.
	// eslint-disable-next-line no-console
	console.warn('Supabase disabled: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Using file fallback.');
}