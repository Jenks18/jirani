import { NextResponse } from 'next/server';
import { ensureSupabaseAvailable } from '@/lib/supabaseClient';
import { adminAuthorized } from '@/lib/adminAuth';
import { vaultEnabled } from '@/lib/vault';

const noStore = { 'Cache-Control': 'no-store' };

export async function GET(req: Request) {
  let databaseReady = false;
  try {
    databaseReady = await ensureSupabaseAvailable();
  } catch {
    databaseReady = false;
  }

  if (!adminAuthorized(req)) {
    return NextResponse.json({ ok: databaseReady }, { headers: noStore });
  }

  let encryptionKeyValid = true;
  try {
    vaultEnabled();
  } catch {
    encryptionKeyValid = false;
  }

  return NextResponse.json(
    {
      ok: databaseReady,
      database: databaseReady,
      ai: Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY),
      whatsapp: Boolean(
        process.env.WHATSAPP_ACCESS_TOKEN &&
          process.env.WHATSAPP_PHONE_NUMBER_ID &&
          process.env.WHATSAPP_VERIFY_TOKEN &&
          process.env.WHATSAPP_APP_SECRET
      ),
      serviceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      sessionSecret: (process.env.SESSION_SECRET?.length ?? 0) >= 32 ? 'strong' : process.env.SESSION_SECRET ? 'too-short' : 'missing',
      fieldEncryption: encryptionKeyValid ? (process.env.DATA_ENCRYPTION_KEY ? 'on' : 'off') : 'invalid-key',
    },
    { headers: noStore }
  );
}
