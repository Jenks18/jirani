import { NextResponse } from 'next/server';
import { ensureSupabaseAvailable, supabaseAvailable } from '@/lib/supabaseClient';

export async function GET(req: Request) {
  try {
    const groqConfigured = Boolean(process.env.GROQ_API_KEY);
    const whatsappConfigured = Boolean(
      process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_VERIFY_TOKEN &&
      process.env.WHATSAPP_APP_SECRET
    );
    const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    // Perform a lightweight supabase probe but don't block too long
    let supabaseReady = supabaseAvailable;
    try {
      // call probe but don't fail if it errors
      supabaseReady = await ensureSupabaseAvailable();
    } catch (e) {
      // ignore
    }

    // Admin token gating to avoid exposing raw envs. Provide minimal info otherwise.
    const adminToken = process.env.ADMIN_API_TOKEN || '';
    const provided = req.headers.get('x-admin-token') || '';

    const body: Record<string, unknown> = {
      groqConfigured,
      supabaseConfigured,
      supabaseReady,
      supabaseTable: 'reports'
    };

    if (adminToken && provided === adminToken) {
      body['whatsappConfigured'] = whatsappConfigured;
      body['groqKeyPresent'] = groqConfigured;
    }

    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json({ error: 'status check failed', details: String(err) }, { status: 500 });
  }
}
