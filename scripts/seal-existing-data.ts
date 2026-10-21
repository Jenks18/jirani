import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { isSealed, openJson, openText, sealJson, sealPhone, sealText, vaultEnabled } from '../src/lib/vault';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const apply = process.argv.includes('--apply');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (run `vercel env pull .env.local`).');
  process.exit(1);
}
if (!vaultEnabled()) {
  console.error('Set DATA_ENCRYPTION_KEY first (32 random bytes as 64 hex characters: openssl rand -hex 32).');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

type Row = Record<string, unknown>;
type Field = { column: string; context: string; kind: 'stable' | 'text' | 'json' };

const plan: { table: string; fields: Field[] }[] = [
  {
    table: 'members',
    fields: [
      { column: 'phone', context: 'phone', kind: 'stable' },
      { column: 'display_name', context: 'name', kind: 'text' },
      { column: 'last_location', context: 'location', kind: 'json' },
    ],
  },
  {
    table: 'trusted_contacts',
    fields: [
      { column: 'contact_phone', context: 'phone', kind: 'stable' },
      { column: 'contact_name', context: 'name', kind: 'text' },
    ],
  },
  {
    table: 'conversations',
    fields: [
      { column: 'user_id', context: 'phone', kind: 'stable' },
      { column: 'messages', context: 'conversation', kind: 'json' },
      { column: 'current_incident', context: 'conversation', kind: 'json' },
    ],
  },
  { table: 'checkins', fields: [{ column: 'note', context: 'note', kind: 'text' }] },
];

function seal(field: Field, value: unknown): unknown {
  const sealed =
    field.kind === 'stable' ? sealPhone(String(value)) : field.kind === 'text' ? sealText(String(value), field.context) : sealJson(value, field.context);
  const back = field.kind === 'json' ? openJson(sealed, field.context) : openText(sealed as string, field.context);
  const same = field.kind === 'json' ? JSON.stringify(back) === JSON.stringify(value) : back === String(value);
  if (!same) throw new Error(`${field.column} did not decrypt back to the original; nothing was written`);
  return sealed;
}

async function run(): Promise<void> {
  let failures = 0;
  for (const { table, fields } of plan) {
    let scanned = 0;
    let changed = 0;
    for (let from = 0; ; from += 500) {
      const { data, error } = await db
        .from(table)
        .select(['id', ...fields.map((f) => f.column)].join(', '))
        .order('id')
        .range(from, from + 499);
      if (error) {
        console.error(`${table}: read failed (${error.code} ${error.message})`);
        failures++;
        break;
      }
      const rows = (data ?? []) as unknown as Row[];
      for (const row of rows) {
        scanned++;
        const patch: Row = {};
        for (const f of fields) {
          const value = row[f.column];
          if (value == null || isSealed(value)) continue;
          patch[f.column] = seal(f, value);
        }
        if (!Object.keys(patch).length) continue;
        changed++;
        if (!apply) continue;
        const { error: updateError } = await db.from(table).update(patch).eq('id', row.id as string);
        if (updateError) {
          failures++;
          console.error(`${table} ${row.id}: update failed (${updateError.code} ${updateError.message})`);
        }
      }
      if (rows.length < 500) break;
    }
    console.log(`${table}: ${scanned} rows, ${changed} ${apply ? 'encrypted' : 'would be encrypted'}`);
  }
  console.log(apply ? (failures ? `\nFinished with ${failures} failure(s). Re-run to retry them.` : '\nDone.') : '\nDry run only. Re-run with --apply to write.');
  if (failures) process.exit(1);
}

run();
