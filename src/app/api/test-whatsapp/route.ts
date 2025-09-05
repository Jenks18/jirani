import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== Testing Complete WhatsApp Flow ===');
    
    const baseUrl = 'http://localhost:3000';
    
    // Simulate the WhatsApp webhook payload
    const whatsappPayload = {
      entry: [{
        id: "12345",
        changes: [{
          value: {
            messages: [{
              id: "msg123",
              from: "254712345678",
              text: {
                body: "Someone was shot in Nairobi"
              },
              timestamp: "1640995200"
            }]
          }
        }]
      }]
    };
    
    console.log('Sending WhatsApp message:', whatsappPayload.entry[0].changes[0].value.messages[0].text.body);
    
    const response = await fetch(`${baseUrl}/api/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(whatsappPayload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('WhatsApp API error:', response.status, errorText);
      return NextResponse.json({
        success: false,
        error: `WhatsApp API error: ${response.status}`,
        details: errorText
      });
    }
    
    const data = await response.json();
    console.log('WhatsApp response:', JSON.stringify(data, null, 2));
    
    return NextResponse.json({
      success: true,
      whatsappResponse: data
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
