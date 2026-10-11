import { NextResponse } from 'next/server';
import { getPublicReports } from '@/lib/publicReports';
import { listAreas } from '@/lib/platform';
import { haversineM } from '@/lib/geo';

export async function GET() {
  try {
    const [reports, areas] = await Promise.all([getPublicReports(), listAreas()]);
    const cutoff = Date.now() - 30 * 86_400_000;
    const located = reports.filter((r) => r.latitude != null && r.longitude != null);
    const out = areas.map((a) => {
      const inside = located.filter((r) => haversineM(r.latitude as number, r.longitude as number, a.center_lat, a.center_lng) <= a.radius_m);
      return {
        ...a,
        reports30d: inside.filter((r) => new Date(r.createdAt).getTime() >= cutoff).length,
        reportsTotal: inside.length,
      };
    });
    return NextResponse.json({ areas: out }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch (err) {
    console.error('areas failed', err);
    return NextResponse.json({ error: 'Failed to load areas' }, { status: 500 });
  }
}
