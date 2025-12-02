import { NextRequest, NextResponse } from 'next/server';
import { storeEvent } from '@/lib/eventStorage';
import type { Database } from '@/lib/database.types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Normalize payload -> events Insert shape
    const maybeCoords: unknown = body.coordinates;
    let longitude: number | undefined; let latitude: number | undefined;
    if (Array.isArray(maybeCoords) && maybeCoords.length === 2 &&
        typeof maybeCoords[0] === 'number' && typeof maybeCoords[1] === 'number') {
      // Heuristic: if absolute latitude value (< 2) then treat [lat,lng]; else assume [lng,lat]
      const first = maybeCoords[0]; const second = maybeCoords[1];
      if (Math.abs(first) <= 2 && Math.abs(second) > 2) {
        latitude = first; longitude = second; // [lat,lng]
      } else { longitude = first; latitude = second; } // [lng,lat]
    } else if (typeof body.longitude === 'number' && typeof body.latitude === 'number') {
      longitude = body.longitude; latitude = body.latitude;
    }

    const insertPayload: Database['public']['Tables']['events']['Insert'] = {
      type: body.type || body.title || 'Unknown',
      severity: typeof body.severity === 'number' ? body.severity : 1,
      location: body.location || 'Unknown location',
      description: body.description || body.summary || 'No description provided',
      event_timestamp: body.timestamp || body.dateTime || new Date().toISOString(),
      longitude: longitude ?? null,
      latitude: latitude ?? null,
      from_phone: body.from || null,
      images: Array.isArray(body.images) && body.images.length ? body.images : null,
      source: body.source || 'api'
    };

    // Temporary any cast to bypass Supabase typing mismatch - TODO: update Database types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // Use storeEvent's robust storage which falls back to file if Supabase is unavailable.
    try {
      const stored = await storeEvent({
        type: insertPayload.type,
        severity: insertPayload.severity,
        location: insertPayload.location,
        description: insertPayload.description,
        timestamp: insertPayload.event_timestamp,
        coordinates: insertPayload.longitude != null && insertPayload.latitude != null ? [insertPayload.longitude, insertPayload.latitude] : undefined
      }, insertPayload.from_phone || 'api', insertPayload.images || undefined);
      return NextResponse.json({ status: 'stored', event: stored });
    } catch (err) {
      console.error('Store via storeEvent failed:', err);
      return NextResponse.json({ error: 'Failed to store report' }, { status: 500 });
    }
  } catch (err) {
    console.error('Store report error:', err);
    const e = err as Error;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Store Report API is working',
    note: 'Use POST to store a report'
  });
}
