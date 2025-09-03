import { NextRequest } from 'next/server';

// Root webhook endpoint (alternative path for testing)
export async function GET(req: NextRequest) {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  const searchParams = req.nextUrl.searchParams;
  
  const mode = searchParams.get('hub.mode');
  const challenge = searchParams.get('hub.challenge');
  const token = searchParams.get('hub.verify_token');
  
  console.log('Root webhook verification:', { mode, challenge, token, expectedToken: VERIFY_TOKEN });
  
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK VERIFIED');
    return new Response(challenge, { status: 200 });
  } else {
    return new Response('Forbidden', { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Root webhook received:', JSON.stringify(body, null, 2));
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Root webhook error:', error);
    return new Response('Error', { status: 500 });
  }
}
