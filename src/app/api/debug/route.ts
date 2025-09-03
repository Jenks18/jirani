import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Webhook debug endpoint',
    hasVerifyToken: !!process.env.WHATSAPP_VERIFY_TOKEN,
    verifyTokenLength: process.env.WHATSAPP_VERIFY_TOKEN?.length || 0,
    hasAccessToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
    hasPhoneNumberId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
    llmProvider: process.env.LLM_PROVIDER,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
    timestamp: new Date().toISOString()
  });
}
