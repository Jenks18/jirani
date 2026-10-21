import { NextRequest, NextResponse } from 'next/server';
import { storeEvent } from '@/lib/eventStorage';
import { adminAuthorized } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  if (!adminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  let longitude: number | undefined;
  let latitude: number | undefined;
  const maybeCoords = body.coordinates;
  if (Array.isArray(maybeCoords) && maybeCoords.length === 2 && typeof maybeCoords[0] === 'number' && typeof maybeCoords[1] === 'number') {
    const [first, second] = maybeCoords;
    if (Math.abs(first) <= 2 && Math.abs(second) > 2) {
      latitude = first;
      longitude = second;
    } else {
      longitude = first;
      latitude = second;
    }
  } else if (typeof body.longitude === 'number' && typeof body.latitude === 'number') {
    longitude = body.longitude;
    latitude = body.latitude;
  }

  const text = (value: unknown) => (typeof value === 'string' ? value : undefined);

  try {
    const stored = await storeEvent({
      type: text(body.type) || text(body.title) || 'Other',
      severity: typeof body.severity === 'number' ? body.severity : 1,
      location: text(body.location) || 'Unknown location',
      description: text(body.description) || text(body.summary),
      timestamp: text(body.timestamp) || text(body.dateTime),
      coordinates: longitude != null && latitude != null ? [longitude, latitude] : undefined,
    });
    return NextResponse.json({ status: 'stored', event: stored });
  } catch (err) {
    console.error('Store report failed:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Failed to store report' }, { status: 500 });
  }
}
