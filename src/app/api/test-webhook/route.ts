import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  
  // Get all the parameters
  const mode = searchParams.get('hub.mode');
  const challenge = searchParams.get('hub.challenge');
  const token = searchParams.get('hub.verify_token');
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  
  // Simple verification logic
  if (mode === 'subscribe' && token === verifyToken) {
    return new Response(challenge || 'verified', { status: 200 });
  }
  
  // Return debug info if verification fails
  return new Response(JSON.stringify({
    error: 'Verification failed',
    received: { mode, token, challenge },
    expected: { verifyToken },
    env: {
      hasVerifyToken: !!verifyToken,
      verifyTokenLength: verifyToken?.length || 0
    }
  }, null, 2), { 
    status: 403,
    headers: { 'Content-Type': 'application/json' }
  });
}
