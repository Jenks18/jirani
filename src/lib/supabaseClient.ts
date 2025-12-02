import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Defensive: if env vars are missing, avoid calling createClient which would cause runtime fetch errors.
// Export a null client and a flag so callers can decide to fallback to file storage immediately.
export const supabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = supabaseEnabled
	? createClient(supabaseUrl as string, supabaseAnonKey as string)
	: null;

if (!supabaseEnabled) {
	// Log once during startup so deploy logs show the missing config.
	// Avoid throwing here; callers will fallback gracefully.
	// eslint-disable-next-line no-console
	console.warn('Supabase disabled: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Using file fallback.');
}

// Runtime availability check for reports table only
export let supabaseAvailable = Boolean(supabase && supabaseEnabled);
let supabaseDisabledAt = 0;
const SUPABASE_DISABLED_BACKOFF_MS = 60_000;

/**
 * Ensure the reports table is present and Supabase is usable.
 * Returns true if Supabase is available for reads/writes.
 */
export async function ensureSupabaseAvailable(): Promise<boolean> {
	if (!supabaseEnabled || !supabase) {
		supabaseAvailable = false;
		return false;
	}
	// If currently available, return true.
	if (supabaseAvailable && Date.now() - supabaseDisabledAt < SUPABASE_DISABLED_BACKOFF_MS) {
		return true;
	}
	// If we were disabled recently, ensure we wait until backoff expires before re-checking.
	if (!supabaseAvailable && Date.now() - supabaseDisabledAt < SUPABASE_DISABLED_BACKOFF_MS) {
		return false;
	}

	try {
		// Probe the reports table only
		const reportsProbe = await supabase!.from('reports').select('id').limit(1);
		if (reportsProbe?.error) {
			throw new Error(`reports table probe failed: ${reportsProbe.error.message}`);
		}
		supabaseAvailable = true;
		console.log('✅ Supabase reports table available');
		return true;
	} catch (err: unknown) {
		// Likely missing table or permissions; disable supabase until next backoff.
		supabaseAvailable = false;
		supabaseDisabledAt = Date.now();
		// eslint-disable-next-line no-console
		const msg = err instanceof Error ? err.message : String(err);
		console.warn(
			'Supabase probe failed (reports table inaccessible) - disabling Supabase integration temporarily. Error:',
			msg
		);
		return false;
	}
}