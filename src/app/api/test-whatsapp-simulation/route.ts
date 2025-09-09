import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    
    // Simulate a WhatsApp crime report message
    const simulatedMessage = {
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: '+254712345678',
              text: {
                body: 'My phone was stolen at 3pm today near Westlands Shopping Mall. A guy on a motorbike grabbed it and rode off towards Sarit Centre. He was wearing a red shirt and the bike had no number plate.'
              }
            }]
          }
        }]
      }]
    };

    console.log('🔵 Simulating WhatsApp message:', simulatedMessage.entry[0].changes[0].value.messages[0].text.body);

    // Send to WhatsApp route
    const whatsappResponse = await fetch(`${baseUrl}/api/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(simulatedMessage)
    });

    const whatsappResult = await whatsappResponse.json();
    console.log('📱 WhatsApp route response:', whatsappResult);

    // Get the stored events to verify
    const eventsResponse = await fetch(`${baseUrl}/api/reports`);
    const eventsData = await eventsResponse.json();
    
    console.log('📊 Current events in system:', eventsData.events);

    return NextResponse.json({
      success: true,
      simulation: {
        message: simulatedMessage.entry[0].changes[0].value.messages[0].text.body,
        from: simulatedMessage.entry[0].changes[0].value.messages[0].from,
        whatsappResponse: whatsappResult,
        currentEvents: eventsData.events,
        eventsCount: eventsData.events?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Simulation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Check console for more information'
    });
  }
}
