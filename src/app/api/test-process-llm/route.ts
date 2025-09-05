import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== Testing Process LLM Endpoint ===');
    
    const baseUrl = 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/process-llm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'Someone was shot in Nairobi',
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
    console.log('Process LLM success:', JSON.stringify(data, null, 2));
    
    return NextResponse.json({
      success: true,
      processLLMResponse: data
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
