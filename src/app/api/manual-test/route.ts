import { NextResponse } from 'next/server';
import { storeEvent, getEvents } from '../../../lib/eventStorage';

export async function POST() {
  try {
    console.log('🔵 Creating manual test event...');
    
    // Create a test event directly in storage
    const testEvent = {
      type: 'Phone theft',
      severity: 4,
      location: 'Westlands Shopping Centre, Nairobi',
      description: 'MANUAL TEST: A woman had her phone snatched by two men on a motorbike near the main entrance of Westlands Shopping Centre at around 2:30 PM. The suspects fled towards Parklands Road.',
      timestamp: new Date().toLocaleString(),
      coordinates: [-1.2655, 36.8055] as [number, number] // Westlands coordinates [lat, lng]
    };
    
    console.log('📍 Storing event with coordinates:', testEvent.coordinates);
    
    // Store the event
    const storedEvent = await storeEvent(testEvent, '+254700123456', []);
    
    console.log('✅ Event stored successfully!');
    console.log('📊 Stored event details:', storedEvent);
    
    // Get all events to verify
    const allEvents = await getEvents();
    console.log('📋 Total events in storage:', allEvents.length);
    
    return NextResponse.json({
      success: true,
      message: 'Manual test event created successfully!',
      event: storedEvent,
      totalEvents: allEvents.length,
      allEvents: allEvents
    });

  } catch (error) {
    console.error('❌ Error creating manual test event:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  // Simple endpoint to check current events
  const allEvents = await getEvents();
  return NextResponse.json({
    success: true,
    totalEvents: allEvents.length,
    events: allEvents
  });
}
