import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== Testing Confirmation Creation ===');
    
    const baseUrl = 'http://localhost:3000';
    
    // Test when user says "That's all" after being asked
    const confirmationPrompt = `CONVERSATION HISTORY:
user: Someone was shot in Nairobi
assistant: Oh no, that's terrible! Pole sana. I'm so sorry to hear that. Where in Nairobi did this happen, and when?
user: It happened at 6pm yesterday near Westlands mall. A man in a red shirt shot someone then ran away.
assistant: Is there anything else you'd like to add to the report, or should I go ahead and record this incident?

CURRENT MESSAGE: That's all, go ahead and make the report`;
    
    const response = await fetch(`${baseUrl}/api/process-llm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: confirmationPrompt,
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
    console.log('Confirmation creation response:', JSON.stringify(data, null, 2));
    
    return NextResponse.json({
      success: true,
      confirmationResponse: data
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
