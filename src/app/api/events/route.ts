import { NextResponse } from 'next/server';
import { getEvents } from '../../../lib/eventStorage';

export async function GET() {
  try {
    const events = await getEvents();
    const mapEvents = events.map(event => ({
      id: event.id,
      type: event.type,
      severity: event.severity,
      location: event.location,
      description: event.description,
      timestamp: event.timestamp,
      coordinates: event.coordinates,
      createdAt: event.createdAt,
      hasImages: (event.images?.length || 0) > 0
    }));
    return NextResponse.json({
      events: mapEvents,
      total: events.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
