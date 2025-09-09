import { NextResponse } from 'next/server';

// Simple test to create a single incident for the map
export async function POST() {
  try {
    console.log('🔵 Creating simple test incident for map...');
    
    // For now, let's just return a simple response that the map can use
    // We'll bypass the complex storage system and create a direct map test
    
    const testIncident = {
      _id: 'test-' + Date.now(),
      dateTime: new Date().toISOString(),
      coordinates: { 
        type: "Point", 
        coordinates: [36.8055, -1.2655] // [lng, lat] for GeoJSON - Westlands
      },
      type: 'Phone theft',
      severity: 4,
      summary: 'SIMPLE TEST: Phone theft at Westlands Shopping Centre - guy on motorbike',
      sourceType: "TEST"
    };
    
    return NextResponse.json({
      success: true,
      message: 'Simple test incident created!',
      incident: testIncident
    });

  } catch (error) {
    console.error('❌ Error creating simple test:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
