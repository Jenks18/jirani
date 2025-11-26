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
		// Light probe: attempt to select a single id from events.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		// Light probe: attempt to select a single id from 'events'. If 'events' doesn't exist,
		// try to probe for 'reports' (legacy schema). This allows deploying against older
		// databases that still have the previous table.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let result: any;
		try {
			result = await (supabase as any).from('events').select('id').limit(1);
		} catch (e) {
			result = { error: e };
		}
		if (!result?.error) {
			supabaseAvailable = true;
			supabaseTable = 'events';
			return true;
		}

		// If 'events' probe failed with PGRST205 (missing table), try 'reports'.
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const reportsProbe = await (supabase as any).from('reports').select('id').limit(1);
			if (!reportsProbe?.error) {
				supabaseAvailable = true;
				supabaseTable = 'reports';
				console.warn('Supabase table `events` missing; using `reports` table for compatibility.');
				return true;
			}
		} catch (e) {
			// ignore
		}
		throw result?.error || new Error('supabase events probe failed');
	} catch (err) {
		// Likely missing table or permissions; disable supabase until next backoff.
		supabaseAvailable = false;
		supabaseDisabledAt = Date.now();
		// eslint-disable-next-line no-console
		console.warn('Supabase probe failed (events table inaccessible) - disabling Supabase integration temporarily. Error:', err?.message || err);
		return false;
	}
}