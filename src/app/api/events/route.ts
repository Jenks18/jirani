import { NextResponse } from 'next/server';
import { getEvents } from '@/lib/eventStorage';
import { toSeverity, type Report } from '@/lib/reports';

// Coordinates are rounded to 3 decimals (~110 m) so a public report never pinpoints a doorstep.
const round3 = (n: number) => Math.round(n * 1000) / 1000;

// Older records stored free text such as "6:00 am today" as the timestamp; only trust real ISO dates.
const isoOr = (value: string | undefined, fallback: string) =>
  value && !Number.isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}/.test(value) ? value : fallback;

/** Public, privacy-safe list of reports. Never includes phone numbers or raw messages. */
export async function GET() {
  try {
    const events = await getEvents();
    const reports: Report[] = events.map((e) => {
      const createdAt = isoOr(e.createdAt, new Date(0).toISOString());
      const type = e.type || 'Incident';
      const location = e.location || 'Unknown location';
      return {
      id: String(e.id),
      type,
      severity: toSeverity(e.severity),
      location,
      summary: e.summary?.trim() || `${type} reported near ${location}.`,
      timestamp: isoOr(e.timestamp, createdAt),
      createdAt,
      latitude: e.coordinates ? round3(e.coordinates[1]) : null,
      longitude: e.coordinates ? round3(e.coordinates[0]) : null,
      };
    });

    return NextResponse.json(
      { reports, total: reports.length, generatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } }
    );
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
