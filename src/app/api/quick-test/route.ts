import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== Quick Test with Updated WhatsApp Route ===');
    
    const baseUrl = 'http://localhost:3000';
    
    // Test just the confirmation step
    console.log('Testing confirmation handling...');
    const response = await fetch(`${baseUrl}/api/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          id: "12345",
          changes: [{
            value: {
              messages: [{
                id: "msg1",
                from: "254712345678",
                text: { body: "Yes" },
                timestamp: "1640995200"
              }]
            }
          }]
        }]
      })
    });
    
    const data = await response.json();
    console.log('Quick test result:', data);
    
    return NextResponse.json({
      success: true,
      quickTestResult: data
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
