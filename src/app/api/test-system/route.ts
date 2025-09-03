import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const config = {
    hasWhatsAppVerifyToken: !!process.env.WHATSAPP_VERIFY_TOKEN,
    hasWhatsAppAccessToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
    hasPhoneNumberId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    llmProvider: process.env.LLM_PROVIDER || 'not_set',
    openaiModel: process.env.OPENAI_MODEL || 'not_set',
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'not_set'
  };

  return NextResponse.json({
    status: 'System Configuration Check',
    config,
    ready: config.hasWhatsAppVerifyToken && config.hasOpenAIKey,
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Test the LLM processing
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/process-llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: message,
        provider: 'openai'
      })
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const result = await response.json();
    
    return NextResponse.json({
      status: 'Test successful',
      input: message,
      llmResponse: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
