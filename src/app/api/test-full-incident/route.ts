import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== Testing Full Incident Report Flow ===');
    
    const baseUrl = 'http://localhost:3000';
    
    // Test with more complete information
    const fullPrompt = `CONVERSATION HISTORY:
user: Someone was shot in Nairobi
assistant: Oh no, that's terrible! Pole sana. I'm so sorry to hear that. Where in Nairobi did this happen, and when?

CURRENT MESSAGE: It happened at 6pm yesterday near Westlands mall. A man in a red shirt shot someone then ran away.`;
    
    const response = await fetch(`${baseUrl}/api/process-llm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        provider: 'gemini'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Process LLM error:', response.status, errorText);
      return NextResponse.json({
        success: false,
        error: `Process LLM error: ${response.status}`,
        details: errorText
      });
    }
    
    const data = await response.json();
    console.log('Full incident LLM response:', JSON.stringify(data, null, 2));
    
    return NextResponse.json({
      success: true,
      fullIncidentResponse: data
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('Test error:', errorMessage);
    
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: errorMessage
    });
  }
}
