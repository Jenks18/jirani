import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { normalizePhone } from '../src/lib/geo';
import { phoneKeys, vaultEnabled } from '../src/lib/vault';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const apply = process.argv.includes('--apply');
const phone = normalizePhone(process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!phone) {
  console.error('Usage: npx tsx scripts/erase-phone.ts <phone number> [--apply]');
  process.exit(1);
}
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (run `vercel env pull .env.local`).');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const keys = phoneKeys(phone);

async function erase(table: string, column: string): Promise<void> {
  const query = apply
    ? db.from(table).delete({ count: 'exact' }).in(column, keys)
    : db.from(table).select('id', { count: 'exact', head: true }).in(column, keys);
  const { count, error } = await query;
  if (error) {
    console.error(`${table}: failed (${error.code} ${error.message})`);
    process.exitCode = 1;
    return;
  }
  console.log(`${table}: ${count ?? 0} ${apply ? 'deleted' : 'found'}`);
}

async function run(target: string): Promise<void> {
  console.log(`${apply ? 'Erasing' : 'Dry run for'} the person behind ${target.slice(0, 3)}…${target.slice(-2)} (encryption ${vaultEnabled() ? 'on' : 'off'})`);
  await erase('conversations', 'user_id');
  await erase('trusted_contacts', 'contact_phone');
  await erase('members', 'phone');
  if (!apply) console.log('\nNothing was changed. Re-run with --apply to delete.');
}

run(phone);
