import 'server-only';
import { getEvents } from './eventStorage';
import { toSeverity, type Report } from './reports';

const round3 = (n: number) => Math.round(n * 1000) / 1000;

const isoOr = (value: string | undefined, fallback: string) =>
  value && !Number.isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}/.test(value) ? value : fallback;

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
