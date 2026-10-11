import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = supabaseEnabled
	? createClient(supabaseUrl as string, supabaseAnonKey as string, {
			auth: { persistSession: false, autoRefreshToken: false },
		})
	: null;

if (!supabaseEnabled) {
	// eslint-disable-next-line no-console
	console.warn('Supabase disabled: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. Using file fallback.');
}

export let supabaseAvailable = Boolean(supabase && supabaseEnabled);
let supabaseDisabledAt = 0;
const SUPABASE_DISABLED_BACKOFF_MS = 60_000;

export async function ensureSupabaseAvailable(): Promise<boolean> {
	if (!supabaseEnabled || !supabase) {
		supabaseAvailable = false;
		return false;
	}
	if (supabaseAvailable && Date.now() - supabaseDisabledAt < SUPABASE_DISABLED_BACKOFF_MS) {
		return true;
	}
	if (!supabaseAvailable && Date.now() - supabaseDisabledAt < SUPABASE_DISABLED_BACKOFF_MS) {
		return false;
	}

	try {
		const reportsProbe = await supabase!.from('reports').select('id').limit(1);
		if (reportsProbe?.error) {
			throw new Error(`reports table probe failed: ${reportsProbe.error.message}`);
		}
		supabaseAvailable = true;
		console.log('✅ Supabase reports table available');
		return true;
	} catch (err: unknown) {
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