import { NextResponse } from 'next/server';
import { ensureSupabaseAvailable, supabaseTable, supabaseAvailable } from '@/lib/supabaseClient';

export async function GET(req: Request) {
  try {
    const groqConfigured = Boolean(process.env.GROQ_API_KEY);
    const twilioConfigured = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID));
    const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    // Perform a lightweight supabase probe but don't block too long
    let table: string | null = supabaseTable;
    let supabaseReady = supabaseAvailable;
    try {
      // call probe but don't fail if it errors
      supabaseReady = await ensureSupabaseAvailable();
      table = supabaseTable;
    } catch (e) {
      // ignore
    }

    // Admin token gating to avoid exposing raw envs. Provide minimal info otherwise.
    const adminToken = process.env.ADMIN_STATUS_TOKEN || '';
    const provided = req.headers.get('x-admin-token') || '';

    const body: Record<string, unknown> = {
      groqConfigured,
      supabaseConfigured,
      supabaseReady,
      supabaseTable: table
    };

    if (adminToken && provided === adminToken) {
      // reveal Twilio configured flag and masked values
      body['twilioConfigured'] = twilioConfigured;
      body['twilioFrom'] = process.env.TWILIO_WHATSAPP_NUMBER ? process.env.TWILIO_WHATSAPP_NUMBER.replace(/(.+).(.{4})$/, '***$2') : null;
      body['groqKeyPresent'] = groqConfigured;
    }

    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json({ error: 'status check failed', details: String(err) }, { status: 500 });
  }
}
