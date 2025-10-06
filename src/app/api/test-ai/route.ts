import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🧪 Testing Gemini AI directly...');
    
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    console.log('🔑 API Key exists:', !!GOOGLE_API_KEY);
    
    if (!GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'GOOGLE_API_KEY not found' }, { status: 500 });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "You are Jirani. Someone asks: who are you? Respond warmly in 2 sentences."
          }]
        }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 300
        }
      })
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error:', errorText);
      return NextResponse.json({ 
        error: `Gemini API error: ${response.status}`,
        details: errorText 
      }, { status: 500 });
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return NextResponse.json({ 
      success: true,
      response: aiText,
      fullData: data 
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
