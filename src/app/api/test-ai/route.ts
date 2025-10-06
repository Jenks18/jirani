import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🧪 Testing OpenAI directly...');
    
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    console.log('🔑 API Key exists:', !!OPENAI_API_KEY);
    console.log('🔑 API Key length:', OPENAI_API_KEY?.length || 0);
    
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not found' }, { status: 500 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are Jirani, a friendly assistant.' },
          { role: 'user', content: 'Who are you? Answer in one sentence.' }
        ],
        temperature: 0.8,
        max_tokens: 100
      })
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error:', errorText);
      return NextResponse.json({ 
        error: `OpenAI API error: ${response.status}`,
        details: errorText 
      }, { status: 500 });
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content;

    return NextResponse.json({ 
      success: true,
      response: aiText,
      model: 'gpt-4o-mini',
      keyLength: OPENAI_API_KEY.length
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
