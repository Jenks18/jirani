import { NextRequest, NextResponse } from 'next/server';
import { storeEvent } from '../../../lib/eventStorage';
import { extractCoordinates } from '../../../lib/locationUtils';

export async function POST(req: NextRequest) {
  try {
    console.log('🔵 Creating test incident...');
    console.log('📥 Request received');
    
    // Create a test incident with Westlands coordinates
    const testEvent = {
      type: 'Phone theft',
      severity: 4,
      location: 'Westlands Shopping Centre, Nairobi',
      description: 'A woman had her phone snatched by two men on a motorbike near the main entrance of Westlands Shopping Centre at around 2:30 PM. The suspects fled towards Parklands Road.',
      timestamp: '2:30 PM today',
      coordinates: extractCoordinates('Westlands Shopping Centre, Nairobi')
    };
    
    console.log('📍 Event coordinates:', testEvent.coordinates);
    
    // Store the event
    const storedEvent = await storeEvent(testEvent, '+254700123456', []);
    
    console.log('✅ Event stored with ID:', storedEvent.id);
    console.log('📊 Full stored event:', storedEvent);
    
    // Fetch current events to verify
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    const eventsResponse = await fetch(`${baseUrl}/api/reports`);
    const eventsData = await eventsResponse.json();
    
    return NextResponse.json({
      success: true,
      message: 'Test incident created successfully!',
      storedEvent: storedEvent,
      coordinates: testEvent.coordinates,
      allEvents: eventsData.events || [],
      totalEvents: eventsData.events?.length || 0
    });

  } catch (error) {
    console.error('❌ Error creating test incident:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
