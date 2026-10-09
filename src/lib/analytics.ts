import type { Report } from './reports';
import { haversineM } from './geo';

export interface Analytics {
  total: number;
  last24h: number;
  last7d: number;
  prev7d: number;
  last30d: number;
  bySeverity: Record<1 | 2 | 3 | 4 | 5, number>;
  byType: { type: string; count: number }[];
  byDay: { date: string; count: number }[];
  byHour: number[];
  hotspots: { name: string; slug: string; count: number }[];
}

const DAY = 86_400_000;
const nairobiDate = (t: number) => new Date(t + 3 * 3600_000).toISOString().slice(0, 10);
const nairobiHour = (t: number) => new Date(t + 3 * 3600_000).getUTCHours();

export function buildAnalytics(
  reports: Report[],
  areas: { name: string; slug: string; level: string; center_lat: number; center_lng: number; radius_m: number }[],
  now = Date.now()
): Analytics {
  const inLast = (r: Report, ms: number) => now - new Date(r.createdAt).getTime() <= ms;
  const bySeverity = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Analytics['bySeverity'];
  const types = new Map<string, number>();
  const days = new Map<string, number>();
  const byHour = new Array(24).fill(0) as number[];

  for (let i = 29; i >= 0; i--) days.set(nairobiDate(now - i * DAY), 0);

  let last24h = 0, last7d = 0, prev7d = 0, last30d = 0;
  for (const r of reports) {
    const t = new Date(r.createdAt).getTime();
    bySeverity[r.severity]++;
    types.set(r.type, (types.get(r.type) ?? 0) + 1);
    if (inLast(r, DAY)) last24h++;
    if (inLast(r, 7 * DAY)) last7d++;
    else if (now - t <= 14 * DAY) prev7d++;
    if (inLast(r, 30 * DAY)) {
      last30d++;
      const d = nairobiDate(t);
      if (days.has(d)) days.set(d, (days.get(d) ?? 0) + 1);
      byHour[nairobiHour(t)]++;
    }
  }

  const hotspots = areas
    .filter((a) => a.level === 'neighborhood' || a.level === 'subcounty')
    .map((a) => ({
      name: a.name,
      slug: a.slug,
      count: reports.filter(
        (r) => inLast(r, 30 * DAY) && r.latitude != null && r.longitude != null && haversineM(r.latitude, r.longitude, a.center_lat, a.center_lng) <= a.radius_m
      ).length,
    }))
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    total: reports.length,
    last24h, last7d, prev7d, last30d,
    bySeverity,
    byType: [...types].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    byDay: [...days].map(([date, count]) => ({ date, count })),
    byHour,
    hotspots,
  };
}
