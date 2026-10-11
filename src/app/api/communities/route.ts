import { NextResponse } from 'next/server';
import { communityMemberCounts, listAreas, listCommunities } from '@/lib/platform';

export async function GET() {
  const [communities, counts, areas] = await Promise.all([listCommunities(), communityMemberCounts(), listAreas()]);
  const areaById = new Map(areas.map((a) => [a.id, a]));
  return NextResponse.json(
    {
      communities: communities.map((c) => ({
        ...c,
        members: counts[c.id] ?? 0,
        area: c.area_id ? { name: areaById.get(c.area_id)?.name, slug: areaById.get(c.area_id)?.slug } : null,
      })),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
}
