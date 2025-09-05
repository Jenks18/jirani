import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== LLM DEBUGGING TEST ===');
    
    // Test 1: Check environment variables
    const googleApiKey = process.env.GOOGLE_API_KEY;
    const hasKey = !!googleApiKey;
    console.log('Has Google API Key:', hasKey);
    console.log('Key starts with:', googleApiKey?.substring(0, 10));
    
    // Test 2: Direct Gemini API call with simple timeout
    const testPrompt = "Someone was shot in Nairobi";
    console.log('Testing Gemini API with prompt:', testPrompt);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Timeout reached, aborting request');
      controller.abort();
    }, 15000); // 15 second timeout for testing
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a safety reporting assistant. Analyze this message and respond with JSON: ${testPrompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Gemini API error response:', response.status, errorText);
        return NextResponse.json({
          success: false,
          error: `Gemini API error: ${response.status}`,
          details: errorText
        });
      }
      
      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      console.log('Gemini API success! Response:', resultText);
      
      return NextResponse.json({
        success: true,
        hasApiKey: hasKey,
        geminiResponse: resultText,
        fullData: data
      });
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.log('Fetch error:', fetchError.message);
      
      return NextResponse.json({
        success: false,
        error: 'Fetch failed',
        details: fetchError.message,
        hasApiKey: hasKey
      });
    }
    
  } catch (error: any) {
    console.log('General error:', error.message);
    
    return NextResponse.json({
      success: false,
      error: 'General error',
      details: error.message
    });
  }
}
