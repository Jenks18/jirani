import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('🔵 Starting complete WhatsApp simulation...');
    
    // Step 1: Send initial crime report
    console.log('📱 Step 1: Sending initial crime report message');
    const step1Response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '+254700987654',
                text: {
                  body: 'I just witnessed a robbery at Westlands Shopping Mall. Three armed men on motorcycles stole from people in the parking lot and fled towards Parklands. This happened around 3:30 PM today. Very dangerous situation!'
                }
              }]
            }
          }]
        }]
      })
    });
    
    const step1Data = await step1Response.json();
    console.log('✅ Step 1 response:', step1Data);
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Send confirmation response
    console.log('📱 Step 2: Sending confirmation "yes"');
    const step2Response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '+254700987654',
                text: {
                  body: 'yes'
                }
              }]
            }
          }]
        }]
      })
    });
    
    const step2Data = await step2Response.json();
    console.log('✅ Step 2 response:', step2Data);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Check if event was created
    console.log('📊 Step 3: Checking stored events');
    const eventsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/reports`);
    const eventsData = await eventsResponse.json();
    
    console.log('📋 Final events data:', eventsData);
    
    return NextResponse.json({
      success: true,
      message: 'Complete WhatsApp conversation simulation completed!',
      step1: step1Data,
      step2: step2Data,
      finalEvents: eventsData.events || [],
      totalEvents: eventsData.events?.length || 0,
      conversation: [
        {
          step: 1,
          message: 'I just witnessed a robbery at Westlands Shopping Mall. Three armed men on motorcycles stole from people in the parking lot and fled towards Parklands. This happened around 3:30 PM today. Very dangerous situation!',
          type: 'user'
        },
        {
          step: 2,
          message: 'yes',
          type: 'user'
        }
      ]
    });

  } catch (error) {
    console.error('❌ Error in WhatsApp simulation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
