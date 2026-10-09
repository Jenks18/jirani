import 'server-only';
import { getEvents } from './eventStorage';
import { toSeverity, type Report } from './reports';

// Coordinates are rounded to 3 decimals (~110 m) so a public report never pinpoints a doorstep.
const round3 = (n: number) => Math.round(n * 1000) / 1000;

// Older records stored free text such as "6:00 am today" as the timestamp; only trust real ISO dates.
const isoOr = (value: string | undefined, fallback: string) =>
  value && !Number.isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}/.test(value) ? value : fallback;

/** The privacy-safe public view of reports. Never includes phone numbers or raw messages. */
export async function getPublicReports(): Promise<Report[]> {
  const events = await getEvents();
  return events.map((e) => {
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
}
