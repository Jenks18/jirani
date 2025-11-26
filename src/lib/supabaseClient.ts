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

// Runtime availability and schema check for specific tables.
// Some deployed Supabase instances may exist but not have been migrated with `events`.
// We'll offer a utility to perform a lightweight probe and avoid repeated failures.
export let supabaseAvailable = Boolean(supabase && supabaseEnabled);
let supabaseDisabledAt = 0;
const SUPABASE_DISABLED_BACKOFF_MS = 60_000;

export let supabaseTable: string | null = null; // Exposed selected table name (events or reports)
/**
 * Ensure the events table is present and Supabase is usable.
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
		// Try probing the `events` table first. If it succeeds (no error), select it.
		try {
			const probe = await supabase!.from('events').select('id').limit(1);
			if (!probe?.error) {
				supabaseAvailable = true;
				supabaseTable = 'events';
				return true;
			}
		} catch (e) {
			// ignore and try legacy `reports` table
		}

		// If 'events' probe failed, try 'reports' (legacy schema).
		try {
			const reportsProbe = await supabase!.from('reports').select('id').limit(1);
			if (!reportsProbe?.error) {
				supabaseAvailable = true;
				supabaseTable = 'reports';
				console.warn('Supabase table `events` missing; using `reports` table for compatibility.');
				return true;
			}
		} catch (e) {
			// ignore
		}

		throw new Error('supabase events probe failed');
	} catch (err: unknown) {
		// Likely missing table or permissions; disable supabase until next backoff.
		supabaseAvailable = false;
		supabaseDisabledAt = Date.now();
				// eslint-disable-next-line no-console
								const msg = err instanceof Error ? err.message : String(err);
								console.warn(
									'Supabase probe failed (events table inaccessible) - disabling Supabase integration temporarily. Error:',
									msg
								);
		return false;
	}
}