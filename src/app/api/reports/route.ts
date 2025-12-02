import { NextResponse } from 'next/server';
import { getEvents } from '@/lib/eventStorage';

export async function GET() {
  try {
    // Get reports from Supabase events table (or file fallback)
    const events = await getEvents();

    const response = {
      events: events.map(event => ({
        id: event.id,
        type: event.type,
        severity: event.severity,
        location: event.location,
        summary: event.summary,
        timestamp: event.timestamp,
        coordinates: event.coordinates ? [event.coordinates[1], event.coordinates[0]] : null, // [lat, lng]
        latitude: event.coordinates?.[1] || null,
        longitude: event.coordinates?.[0] || null,
        createdAt: event.createdAt,
        hasImages: event.images && event.images.length > 0
      })),
      reports: events.map(event => ({
        id: event.id,
        title: `${event.type} Report`,
        summary: event.summary,
        category: 'Security',
        location: event.location,
        coordinates: event.coordinates ? [event.coordinates[1], event.coordinates[0]] : null,
        latitude: event.coordinates?.[1] || null,
        longitude: event.coordinates?.[0] || null,
        priority: event.severity >= 4 ? 'High' : 'Medium',
        severity: event.severity >= 4 ? 'High' : 'Medium',
        status: 'Reported',
        dateTime: event.timestamp,
        created_at: event.createdAt,
        reporter: `WhatsApp User`,
        type: event.type
      })),
      reportCount: events.length,
      areaCount: 0,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      source: 'supabase'
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
}
