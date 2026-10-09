import { NextResponse } from 'next/server';
import { getPublicReports } from '@/lib/publicReports';

export async function GET() {
  try {
    const reports = await getPublicReports();
    return NextResponse.json(
      { reports, total: reports.length, generatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } }
    );
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
