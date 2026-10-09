import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { db } from '@/lib/platform';

/* eslint-disable @typescript-eslint/no-explicit-any */

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function authorized(req: NextRequest): boolean {
  const expected = process.env.ADMIN_API_TOKEN;
  const given = req.headers.get('x-admin-token') ?? '';
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number.parseFloat(String(v)));

type Handler = (body: any) => Promise<{ table: string; row: Record<string, unknown> } | { error: string }>;

const creators: Record<string, Handler> = {
  async areas(b) {
    const name = str(b.name, 80), level = str(b.level, 20);
    const lat = num(b.center_lat), lng = num(b.center_lng), radius = Math.round(num(b.radius_m));
    if (!name || !['country', 'county', 'subcounty', 'neighborhood'].includes(level)) return { error: 'name and a valid level are required' };
    if (!(lat >= -5 && lat <= 6 && lng >= 33 && lng <= 42.5)) return { error: 'center must be inside Kenya' };
    let parent_id: string | null = null;
    if (b.parent_slug) {
      const { data } = await db().from('areas').select('id').eq('slug', str(b.parent_slug, 80)).maybeSingle();
      if (!data) return { error: 'parent area not found' };
      parent_id = data.id;
    }
    return { table: 'areas', row: { name, slug: slugify(str(b.slug, 80) || name), level, center_lat: lat, center_lng: lng, radius_m: radius > 0 ? radius : 3000, parent_id } };
  },
  async communities(b) {
    const name = str(b.name, 80);
    if (!name) return { error: 'name is required' };
    let area_id: string | null = null;
    if (b.area_slug) {
      const { data } = await db().from('areas').select('id').eq('slug', str(b.area_slug, 80)).maybeSingle();
      if (!data) return { error: 'area not found' };
      area_id = data.id;
    }
    return { table: 'communities', row: { name, slug: slugify(str(b.slug, 80) || name), description: str(b.description, 500) || null, area_id } };
  },
  async news(b) {
    const title = str(b.title, 140), body = str(b.body, 2000);
    if (!title || !body) return { error: 'title and body are required' };
    let area_id: string | null = null;
    if (b.area_slug) {
      const { data } = await db().from('areas').select('id').eq('slug', str(b.area_slug, 80)).maybeSingle();
      if (!data) return { error: 'area not found' };
      area_id = data.id;
    }
    return { table: 'news_posts', row: { title, body, author: str(b.author, 80) || 'The 6.25 Movement', pinned: Boolean(b.pinned), area_id } };
  },
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { resource } = await params;
  const make = creators[resource];
  if (!make) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }
  const built = await make(body);
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: 400 });
  const { data, error } = await db().from(built.table).insert(built.row).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ created: data }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { resource } = await params;
  const id = req.nextUrl.searchParams.get('id');
  if (!creators[resource] || !id) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const table = resource === 'news' ? 'news_posts' : resource;
  const { error } = await db().from(table).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ deleted: id });
}
