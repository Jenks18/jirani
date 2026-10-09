import 'server-only';
import { supabase } from './supabaseClient';
import { haversineM } from './geo';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function db(): any {
  if (!supabase) throw new Error('Database not configured');
  return supabase;
}

/** Run a query that may fail if the platform migration hasn't been applied; returns fallback instead of throwing. */
export async function safely<T>(run: () => Promise<{ data: T | null; error: any }>, fallback: T): Promise<T> {
  try {
    const { data, error } = await run();
    if (error) {
      console.error('[platform] query failed:', error.code, error.message);
      return fallback;
    }
    return data ?? fallback;
  } catch (err) {
    console.error('[platform] query error', err);
    return fallback;
  }
}

export interface Area {
  id: string;
  parent_id: string | null;
  level: 'country' | 'county' | 'subcounty' | 'neighborhood';
  name: string;
  slug: string;
  center_lat: number;
  center_lng: number;
  radius_m: number;
}
export interface Community {
  id: string;
  area_id: string | null;
  name: string;
  slug: string;
  description: string | null;
}
export interface Member {
  id: string;
  phone: string;
  display_name: string | null;
  pending: { action: string; at: string; [k: string]: unknown } | null;
  last_location: { lat: number; lng: number; at: string } | null;
}

export const listAreas = () => safely<Area[]>(() => db().from('areas').select('*').order('level').order('name'), []);

export async function findArea(slugOrName: string): Promise<Area | null> {
  const q = slugOrName.trim().toLowerCase();
  const areas = await listAreas();
  return areas.find((a) => a.slug === q || a.name.toLowerCase() === q) ?? null;
}

/** Narrowest area whose circle contains the point. */
export function areaForPoint(areas: Area[], lat: number, lng: number): Area | null {
  const rank = { neighborhood: 0, subcounty: 1, county: 2, country: 3 } as const;
  return (
    areas
      .filter((a) => haversineM(lat, lng, a.center_lat, a.center_lng) <= a.radius_m)
      .sort((a, b) => rank[a.level] - rank[b.level])[0] ?? null
  );
}

export async function upsertMember(phone: string): Promise<Member> {
  const { data, error } = await db()
    .from('members')
    .upsert({ phone, last_seen: new Date().toISOString() }, { onConflict: 'phone' })
    .select('*')
    .single();
  if (error) throw error;
  return data as Member;
}

export async function setPending(memberId: string, pending: Member['pending']): Promise<void> {
  await db().from('members').update({ pending }).eq('id', memberId);
}

export async function saveLocation(memberId: string, lat: number, lng: number): Promise<void> {
  await db()
    .from('members')
    .update({ last_location: { lat, lng, at: new Date().toISOString() } })
    .eq('id', memberId);
}

/** Last shared pin if it is recent enough to be trusted. */
export function recentLocation(member: Member, maxAgeMin = 60): { lat: number; lng: number } | null {
  const l = member.last_location;
  if (!l) return null;
  return Date.now() - new Date(l.at).getTime() <= maxAgeMin * 60_000 ? { lat: l.lat, lng: l.lng } : null;
}

export const listCommunities = () =>
  safely<Community[]>(() => db().from('communities').select('*').order('name'), []);

export async function communityMemberCounts(): Promise<Record<string, number>> {
  const rows = await safely<{ community_id: string }[]>(() => db().from('memberships').select('community_id'), []);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.community_id] = (out[r.community_id] ?? 0) + 1;
  return out;
}

export async function joinCommunity(memberId: string, slug: string): Promise<Community | null> {
  const { data: c } = await db().from('communities').select('*').eq('slug', slug.toLowerCase()).maybeSingle();
  if (!c) return null;
  await db()
    .from('memberships')
    .upsert({ member_id: memberId, community_id: c.id, role: 'member' }, { onConflict: 'member_id,community_id', ignoreDuplicates: true });
  return c as Community;
}

export async function leaveCommunity(memberId: string, slug: string): Promise<boolean> {
  const { data: c } = await db().from('communities').select('id').eq('slug', slug.toLowerCase()).maybeSingle();
  if (!c) return false;
  await db().from('memberships').delete().eq('member_id', memberId).eq('community_id', c.id);
  return true;
}

export async function myCommunities(memberId: string): Promise<(Community & { role: string })[]> {
  const rows = await safely<any[]>(
    () => db().from('memberships').select('role, communities(*)').eq('member_id', memberId),
    []
  );
  return rows.filter((r) => r.communities).map((r) => ({ ...r.communities, role: r.role }));
}

export async function subscribe(memberId: string, opts: { lat?: number; lng?: number; areaId?: string; radiusM?: number; minSeverity?: number }) {
  const { error } = await db().from('alert_subscriptions').insert({
    member_id: memberId,
    area_id: opts.areaId ?? null,
    lat: opts.lat ?? null,
    lng: opts.lng ?? null,
    radius_m: opts.radiusM ?? 1000,
    min_severity: opts.minSeverity ?? 3,
  });
  if (error) throw error;
}

export async function unsubscribeAll(memberId: string): Promise<number> {
  const { data } = await db().from('alert_subscriptions').update({ active: false }).eq('member_id', memberId).eq('active', true).select('id');
  return data?.length ?? 0;
}

export async function mySubscriptions(memberId: string) {
  return safely<any[]>(
    () => db().from('alert_subscriptions').select('*, areas(name)').eq('member_id', memberId).eq('active', true),
    []
  );
}

/** Phones that should hear about a new report, excluding the reporter. */
export async function subscribersFor(event: { severity: number; lat: number; lng: number }, excludePhone?: string): Promise<string[]> {
  const subs = await safely<any[]>(
    () => db().from('alert_subscriptions').select('*, members(phone), areas(center_lat, center_lng, radius_m)').eq('active', true).lte('min_severity', event.severity),
    []
  );
  const phones = new Set<string>();
  for (const s of subs) {
    const phone = s.members?.phone as string | undefined;
    if (!phone || phone === excludePhone) continue;
    const cLat = s.areas?.center_lat ?? s.lat;
    const cLng = s.areas?.center_lng ?? s.lng;
    const radius = s.areas?.radius_m ?? s.radius_m;
    if (cLat == null || cLng == null) continue;
    if (haversineM(event.lat, event.lng, cLat, cLng) <= radius) phones.add(phone);
  }
  return [...phones];
}
