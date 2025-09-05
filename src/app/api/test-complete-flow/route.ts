import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== Testing Complete Event Storage Flow ===');
    
    const baseUrl = 'http://localhost:3000';
    const testPhone = "254712345678";
    
    // Step 1: Send initial message
    console.log('Step 1: Initial report');
    let response = await fetch(`${baseUrl}/api/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          id: "12345",
          changes: [{
            value: {
              messages: [{
                id: "msg1",
                from: testPhone,
                text: { body: "Someone was shot in Nairobi" },
                timestamp: "1640995200"
              }]
            }
          }]
        }]
      })
    });
    const data1 = await response.json();
    console.log('Response 1:', data1.reply);
    
    // Wait a moment between messages
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Provide details
    console.log('Step 2: Providing details');
    response = await fetch(`${baseUrl}/api/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          id: "12345",
          changes: [{
            value: {
              messages: [{
                id: "msg2", 
                from: testPhone,
                text: { body: "It happened at 6pm yesterday near Westlands mall. A man in a red shirt shot someone then ran away." },
                timestamp: "1640995201"
              }]
            }
          }]
        }]
      })
    });
    const data2 = await response.json();
    console.log('Response 2:', data2.reply);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Say "that's all"
    console.log('Step 3: Saying thats all');
    response = await fetch(`${baseUrl}/api/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          id: "12345",
          changes: [{
            value: {
              messages: [{
                id: "msg3",
                from: testPhone, 
                text: { body: "That's all, go ahead and make the report" },
                timestamp: "1640995202"
              }]
            }
          }]
        }]
      })
    });
    const data3 = await response.json();
    console.log('Response 3:', data3.reply);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Confirm with "yes"
    console.log('Step 4: Confirming with yes');
    response = await fetch(`${baseUrl}/api/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          id: "12345",
          changes: [{
            value: {
              messages: [{
                id: "msg4",
                from: testPhone,
                text: { body: "Yes" },
                timestamp: "1640995203"
              }]
            }
          }]
        }]
      })
    });
    const data4 = await response.json();
    console.log('Response 4:', data4.reply);
    console.log('Event stored:', data4.eventStored);
    console.log('Event ID:', data4.eventId);
    
    // Step 5: Check if events are now in the system
    console.log('Step 5: Checking stored events');
    response = await fetch(`${baseUrl}/api/reports`);
    const reportsData = await response.json();
    console.log('Number of events in system:', reportsData.events?.length || 0);
    
    return NextResponse.json({
      success: true,
      conversationFlow: [
        { step: 1, reply: data1.reply, eventStored: data1.eventStored },
        { step: 2, reply: data2.reply, eventStored: data2.eventStored },
        { step: 3, reply: data3.reply, eventStored: data3.eventStored },
        { step: 4, reply: data4.reply, eventStored: data4.eventStored, eventId: data4.eventId },
      ],
      totalEventsStored: reportsData.events?.length || 0,
      events: reportsData.events
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
