import { NextRequest } from 'next/server';
import { authed, body, json, maskPhone } from '@/lib/accountApi';
import { db, listAreas, listCommunities, myCommunities, mySubscriptions, safely } from '@/lib/platform';
import { activeCheckin, activeSos, getProfile, listContacts, setName, updateProfile } from '@/lib/safetyNet';
import { clearSessionCookie } from '@/lib/session';

export async function GET(req: NextRequest) {
  const a = await authed(req, false);
  if ('res' in a) return a.res;
  const { member } = a;
  const [profile, contacts, subscriptions, mine, all, areas, checkin, sos] = await Promise.all([
    getProfile(member.id),
    listContacts(member.id),
    mySubscriptions(member.id),
    myCommunities(member.id),
    listCommunities(),
    listAreas(),
    activeCheckin(member.id),
    activeSos(member.id),
  ]);
  return json({
    member: { id: member.id, phone: maskPhone(member.phone), displayName: member.display_name },
    profile: {
      graceMinutes: profile.grace_minutes,
      shareLocation: profile.share_location,
      defaultCheckinMinutes: profile.default_checkin_minutes,
      sosMessage: profile.sos_message,
    },
    contacts: contacts.map((c) => ({ id: c.id, name: c.contact_name, phone: maskPhone(c.contact_phone), status: c.status })),
    subscriptions: subscriptions.map((s: { id: string; areas?: { name: string } | null; radius_m: number; min_severity: number }) => ({
      id: s.id,
      label: s.areas?.name ?? `Within ${s.radius_m} m of a pin`,
      minSeverity: s.min_severity,
    })),
    communities: { mine: mine.map((c) => ({ slug: c.slug, name: c.name, role: c.role })), all: all.map((c) => ({ slug: c.slug, name: c.name, description: c.description })) },
    areas: areas.filter((x) => x.level !== 'country').map((x) => ({ slug: x.slug, name: x.name })),
    checkin: checkin ? { dueAt: checkin.due_at, status: checkin.status } : null,
    sosActive: Boolean(sos),
  });
}

export async function PATCH(req: NextRequest) {
  const a = await authed(req, true);
  if ('res' in a) return a.res;
  const b = await body<{ displayName?: string; graceMinutes?: number; shareLocation?: boolean; defaultCheckinMinutes?: number; sosMessage?: string | null }>(req);
  if (typeof b.displayName === 'string') await setName(a.member.id, b.displayName.trim());
  const patch: Record<string, unknown> = {};
  if (typeof b.graceMinutes === 'number') patch.grace_minutes = Math.min(Math.max(Math.round(b.graceMinutes), 1), 120);
  if (typeof b.shareLocation === 'boolean') patch.share_location = b.shareLocation;
  if (typeof b.defaultCheckinMinutes === 'number') patch.default_checkin_minutes = Math.min(Math.max(Math.round(b.defaultCheckinMinutes), 5), 1440);
  if (b.sosMessage !== undefined) patch.sos_message = b.sosMessage ? String(b.sosMessage).slice(0, 140) : null;
  if (Object.keys(patch).length) await updateProfile(a.member.id, patch);
  return json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const a = await authed(req, true);
  if ('res' in a) return a.res;
  const b = await body<{ confirm?: boolean }>(req);
  if (b.confirm !== true) return json({ error: 'Confirmation required' }, 400);
  const { member } = a;
  await safely(() => db().from('reports').update({ from_phone: null }).eq('from_phone', member.phone).select('id'), []);
  await safely(() => db().from('conversations').delete().eq('user_id', member.phone).select('id'), []);
  await safely(() => db().from('trusted_contacts').update({ status: 'removed' }).eq('contact_phone', member.phone).select('id'), []);
  const { error } = await db().from('members').delete().eq('id', member.id);
  if (error) return json({ error: 'Could not delete account' }, 500);
  await clearSessionCookie();
  return json({ ok: true });
}
