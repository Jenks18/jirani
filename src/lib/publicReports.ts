import 'server-only';
import { getEvents } from './eventStorage';
import { toSeverity, type Report } from './reports';
import { coarsenPoint, floorToHour, publicPlace, publicType, scrubText } from './anonymize';
import { areaForPoint, listAreas } from './platform';

const hourOr = (value: string | undefined, fallback: string) =>
  value && /^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(Date.parse(value)) ? floorToHour(value) : fallback;

export async function getPublicReports(): Promise<Report[]> {
  const [events, areas] = await Promise.all([getEvents(), listAreas()]);
  const resolveArea = (lat: number, lng: number) => areaForPoint(areas, lat, lng)?.name ?? null;
  return events.map((e) => {
    const createdAt = hourOr(e.createdAt, new Date(0).toISOString());
    const type = publicType(e.type);
    const point = e.coordinates ? coarsenPoint(e.coordinates) : null;
    const location = publicPlace(e.location || 'Unknown location', e.coordinates ? { lat: e.coordinates[1], lng: e.coordinates[0] } : null, resolveArea);
    return {
      id: String(e.id),
      type,
      severity: toSeverity(e.severity),
      location,
      summary: scrubText(e.summary ?? '', 400) || `${type} reported near ${location}.`,
      timestamp: hourOr(e.timestamp, createdAt),
      createdAt,
      latitude: point ? point[1] : null,
      longitude: point ? point[0] : null,
    };
  });
}
