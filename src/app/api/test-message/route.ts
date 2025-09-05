import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message, location } = await req.json();
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log('Test message received:', message);
    
    // Simulate a WhatsApp message by calling our webhook
    const whatsappPayload = {
      object: "whatsapp_business_account",
      entry: [{
        id: "test-entry",
        changes: [{
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "254700000000",
              phone_number_id: "test-phone-id"
            },
            messages: [{
              from: "254700000001", // Test sender
              id: "test-message-id",
              timestamp: Math.floor(Date.now() / 1000).toString(),
              text: {
                body: message
              },
              type: "text"
            }]
          },
          field: "messages"
        }]
      }]
    };

    // Add location context if provided
    if (location) {
      whatsappPayload.entry[0].changes[0].value.messages[0].text.body += ` in ${location}`;
    }

    // Call our WhatsApp webhook
    const webhookUrl = new URL('/api/whatsapp', req.url);
    const webhookResponse = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(whatsappPayload)
    });

    const webhookResult = await webhookResponse.json();
    
    return NextResponse.json({
      success: true,
      message: 'Test message processed',
      originalMessage: message,
      location: location || 'not specified',
      webhookResponse: webhookResult
    });

  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json(
      { error: 'Failed to process test message' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test API is working',
    examples: [
      'There was a robbery at Westlands mall today',
      'I saw an accident near University of Nairobi',
      'Someone broke into a house in Karen yesterday',
      'There is a fire emergency in Kibera right now'
    ]
  });
}
