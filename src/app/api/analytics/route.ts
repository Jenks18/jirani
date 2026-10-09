import { NextResponse } from 'next/server';
import { getPublicReports } from '@/lib/publicReports';
import { buildAnalytics } from '@/lib/analytics';
import { listAreas } from '@/lib/platform';

export async function GET() {
  try {
    const [reports, areas] = await Promise.all([getPublicReports(), listAreas()]);
    return NextResponse.json(buildAnalytics(reports, areas), {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    console.error('analytics failed', err);
    return NextResponse.json({ error: 'Failed to build analytics' }, { status: 500 });
  }
}
