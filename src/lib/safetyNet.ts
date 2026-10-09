import 'server-only';
import { db, safely, type Member } from './platform';
import { mapsUrl, normalizePhone } from './geo';
import { notify } from './whatsappCloud';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const MAX_CONTACTS = 5;

/** WhatsApp template parameters may not contain newlines. */
const flat = (s: string) => s.replace(/\s+/g, ' ').trim();

const who = (m: Member) => m.display_name?.trim() || `a Jirani user (…${m.phone.slice(-3)})`;

export interface Profile {
  member_id: string;
  grace_minutes: number;
  share_location: boolean;
  default_checkin_minutes: number;
  sos_message: string | null;
}

export async function getProfile(memberId: string): Promise<Profile> {
  const { data } = await db().from('safety_profiles').select('*').eq('member_id', memberId).maybeSingle();
  if (data) return data as Profile;
  const fresh = { member_id: memberId, grace_minutes: 10, share_location: true, default_checkin_minutes: 60, sos_message: null };
  await db().from('safety_profiles').upsert(fresh, { onConflict: 'member_id' });
  return fresh;
}

export async function updateProfile(memberId: string, patch: Partial<Omit<Profile, 'member_id'>>) {
  await getProfile(memberId);
  await db().from('safety_profiles').update({ ...patch, updated_at: new Date().toISOString() }).eq('member_id', memberId);
}

export async function setName(memberId: string, name: string) {
  await db().from('members').update({ display_name: name.slice(0, 60) }).eq('id', memberId);
}

// ── Contacts ─────────────────────────────────────────────────────────────────────────────────

export async function listContacts(memberId: string) {
  return safely<any[]>(
    () =>
      db()
        .from('trusted_contacts')
        .select('*')
        .eq('member_id', memberId)
        .neq('status', 'removed')
        .order('invited_at'),
    []
  );
}

export async function addContact(
  member: Member,
  name: string,
  rawPhone: string
): Promise<{ ok: true; invited: boolean } | { ok: false; reason: string }> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, reason: "That doesn't look like a valid phone number. Include the country code, e.g. +254712345678." };
  if (phone === member.phone) return { ok: false, reason: "You can't add yourself as a contact." };

  const existing = await listContacts(member.id);
  const already = existing.find((c) => c.contact_phone === phone);
  if (already?.status === 'accepted') return { ok: false, reason: `${already.contact_name} is already one of your trusted contacts.` };
  if (!already && existing.length >= MAX_CONTACTS) return { ok: false, reason: `You can have up to ${MAX_CONTACTS} trusted contacts. Remove one first (REMOVE <number>).` };

  const { error } = await db().from('trusted_contacts').upsert(
    {
      member_id: member.id,
      contact_phone: phone,
      contact_name: name.slice(0, 60),
      status: 'pending',
      invited_at: new Date().toISOString(),
      responded_at: null,
    },
    { onConflict: 'member_id,contact_phone' }
  );
  if (error) {
    console.error('[safety] addContact failed', error.message);
    return { ok: false, reason: 'Something went wrong saving that contact. Please try again.' };
  }

  const requester = who(member);
  const invited = await notify(
    phone,
    `Hi, ${requester} added you as a trusted contact on Jirani Safety Net. If they are ever in danger or miss a safety check-in, we will message you. Reply YES to accept or NO to decline. Reply STOP at any time to stop all messages.`,
    { name: 'jirani_safety_invite', params: [flat(requester)] }
  );
  return { ok: true, invited };
}

export async function removeContact(memberId: string, index: number): Promise<string | null> {
  const contacts = await listContacts(memberId);
  const c = contacts[index - 1];
  if (!c) return null;
  await db().from('trusted_contacts').update({ status: 'removed', responded_at: new Date().toISOString() }).eq('id', c.id);
  return c.contact_name as string;
}

/** A contact answers YES/NO to an invite. `index` picks among several pending invites. */
export async function respondToInvite(
  contactPhone: string,
  accept: boolean,
  index?: number
): Promise<{ handled: boolean; reply: string }> {
  const pending = await safely<any[]>(
    () =>
      db()
        .from('trusted_contacts')
        .select('*, members(display_name, phone)')
        .eq('contact_phone', contactPhone)
        .eq('status', 'pending')
        .order('invited_at'),
    []
  );
  if (pending.length === 0) return { handled: false, reply: '' };
  if (pending.length > 1 && index == null) {
    const lines = pending.map((p, i) => `${i + 1}. ${p.members?.display_name || `a Jirani user (…${String(p.members?.phone).slice(-3)})`}`);
    return { handled: true, reply: `You have ${pending.length} pending requests:\n${lines.join('\n')}\nReply ${accept ? 'YES' : 'NO'} <number>, e.g. ${accept ? 'YES' : 'NO'} 1.` };
  }
  const target = pending[(index ?? 1) - 1];
  if (!target) return { handled: true, reply: "I couldn't find that request. Reply YES or NO again." };
  await db()
    .from('trusted_contacts')
    .update({ status: accept ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
    .eq('id', target.id);

  const requesterPhone = target.members?.phone as string | undefined;
  if (requesterPhone) {
    void notify(requesterPhone, accept ? `${target.contact_name} accepted and is now one of your trusted contacts.` : `${target.contact_name} declined to be a trusted contact.`);
  }
  return {
    handled: true,
    reply: accept
      ? 'Thank you. You are now a trusted contact. You will only hear from us if they are in danger or miss a safety check-in. Reply STOP at any time to leave.'
      : 'No problem. You will not receive any further messages about this request.',
  };
}

/** A contact (or anyone) replies STOP: remove them from every safety net. */
export async function stopAllForContact(contactPhone: string): Promise<number> {
  const { data } = await db()
    .from('trusted_contacts')
    .update({ status: 'removed', responded_at: new Date().toISOString() })
    .eq('contact_phone', contactPhone)
    .in('status', ['pending', 'accepted'])
    .select('id');
  return data?.length ?? 0;
}

async function acceptedContacts(memberId: string, kind: 'sos' | 'checkin') {
  const col = kind === 'sos' ? 'notify_sos' : 'notify_checkin';
  return safely<any[]>(
    () => db().from('trusted_contacts').select('*').eq('member_id', memberId).eq('status', 'accepted').eq(col, true),
    []
  );
}

// ── SOS ──────────────────────────────────────────────────────────────────────────────────────

export async function triggerSos(member: Member, loc: { lat: number; lng: number } | null): Promise<{ contacts: number; delivered: number }> {
  const profile = await getProfile(member.id);
  const contacts = await acceptedContacts(member.id, 'sos');
  const where = profile.share_location && loc ? `Last known location: ${mapsUrl(loc.lat, loc.lng)}` : 'No location was shared.';
  const custom = profile.sos_message ? ` They said: "${profile.sos_message}".` : '';
  const name = who(member);

  let delivered = 0;
  for (const c of contacts) {
    const ok = await notify(
      c.contact_phone,
      `🚨 SOS from ${name}. They have asked for help.${custom} ${where} Please try to reach them now, and call 999 or 112 if you think they are in danger.`,
      { name: 'jirani_sos_alert', params: [flat(name), flat(where)] }
    );
    if (ok) delivered++;
  }
  await db().from('sos_events').update({ active: false, ended_at: new Date().toISOString() }).eq('member_id', member.id).eq('active', true);
  await db().from('sos_events').insert({
    member_id: member.id,
    lat: loc?.lat ?? null,
    lng: loc?.lng ?? null,
    contacts_notified: delivered,
  });
  return { contacts: contacts.length, delivered };
}

export async function activeSos(memberId: string) {
  const { data } = await db()
    .from('sos_events')
    .select('*')
    .eq('member_id', memberId)
    .eq('active', true)
    .gte('created_at', new Date(Date.now() - 2 * 3600_000).toISOString())
    .maybeSingle();
  return data as { id: string } | null;
}

/** Forward a fresh pin to contacts while an SOS is active. */
export async function sosLocationUpdate(member: Member, loc: { lat: number; lng: number }): Promise<number> {
  const profile = await getProfile(member.id);
  if (!profile.share_location) return 0;
  const contacts = await acceptedContacts(member.id, 'sos');
  let n = 0;
  for (const c of contacts) {
    if (await notify(c.contact_phone, `📍 Update from ${who(member)}: ${mapsUrl(loc.lat, loc.lng)}`)) n++;
  }
  await db().from('sos_events').update({ lat: loc.lat, lng: loc.lng }).eq('member_id', member.id).eq('active', true);
  return n;
}

// ── Check-ins ────────────────────────────────────────────────────────────────────────────────

export async function startCheckin(member: Member, minutes: number, note?: string) {
  await db().from('checkins').update({ status: 'cancelled', resolved_at: new Date().toISOString() }).eq('member_id', member.id).in('status', ['active', 'nudged']);
  const due = new Date(Date.now() + minutes * 60_000);
  const loc = member.last_location;
  await db().from('checkins').insert({
    member_id: member.id,
    due_at: due.toISOString(),
    note: note?.slice(0, 140) ?? null,
    lat: loc?.lat ?? null,
    lng: loc?.lng ?? null,
  });
  return due;
}

/** User says they're safe: closes check-ins and any active SOS, telling contacts. */
export async function markSafe(member: Member): Promise<{ checkins: number; sosEnded: boolean }> {
  const now = new Date().toISOString();
  const { data } = await db()
    .from('checkins')
    .update({ status: 'safe', resolved_at: now })
    .eq('member_id', member.id)
    .in('status', ['active', 'nudged', 'missed'])
    .select('id, status');
  const sos = await activeSos(member.id);
  if (sos) {
    await db().from('sos_events').update({ active: false, ended_at: now }).eq('id', sos.id);
    for (const c of await acceptedContacts(member.id, 'sos')) {
      void notify(c.contact_phone, `✅ ${who(member)} says they are safe now. Thank you for being there.`);
    }
  }
  return { checkins: data?.length ?? 0, sosEnded: Boolean(sos) };
}

export async function activeCheckin(memberId: string) {
  const { data } = await db().from('checkins').select('*').eq('member_id', memberId).in('status', ['active', 'nudged']).order('due_at').limit(1).maybeSingle();
  return data as { id: string; due_at: string; status: string } | null;
}

/** Called by the scheduler (every few minutes). Nudges at the due time, alerts contacts after the grace period. */
export async function processDueCheckins(): Promise<{ nudged: number; escalated: number }> {
  const now = Date.now();
  const rows = await safely<any[]>(
    () => db().from('checkins').select('*, members(id, phone, display_name, last_location)').in('status', ['active', 'nudged']).lte('due_at', new Date(now).toISOString()),
    []
  );
  let nudged = 0;
  let escalated = 0;
  for (const row of rows) {
    const member = row.members as Member | null;
    if (!member) continue;
    const profile = await getProfile(member.id);
    const dueMs = new Date(row.due_at).getTime();

    if (row.status === 'active') {
      await db().from('checkins').update({ status: 'nudged' }).eq('id', row.id);
      await notify(member.phone, `Safety check: are you OK? Reply SAFE to confirm. If we don't hear from you in ${profile.grace_minutes} minutes we'll alert your trusted contacts.`, {
        name: 'jirani_safety_nudge',
        params: [String(profile.grace_minutes)],
      });
      nudged++;
      continue;
    }

    if (now >= dueMs + profile.grace_minutes * 60_000) {
      await db().from('checkins').update({ status: 'missed', resolved_at: new Date().toISOString() }).eq('id', row.id);
      const loc = member.last_location ?? (row.lat != null ? { lat: row.lat, lng: row.lng } : null);
      const where = profile.share_location && loc ? `Last known location: ${mapsUrl(loc.lat, loc.lng)}` : 'No location was shared.';
      const name = who(member);
      const contacts = await acceptedContacts(member.id, 'checkin');
      for (const c of contacts) {
        await notify(
          c.contact_phone,
          `⚠️ ${name} missed a safety check-in on Jirani and hasn't replied. ${where} Please try to reach them, and call 999 or 112 if you are worried.`,
          { name: 'jirani_checkin_missed', params: [flat(name), flat(where)] }
        );
      }
      await notify(member.phone, contacts.length ? `We couldn't reach you, so we alerted ${contacts.length} trusted ${contacts.length === 1 ? 'contact' : 'contacts'}. Reply SAFE when you can.` : `We couldn't reach you for your check-in. You have no trusted contacts yet. Reply ADD <name> <number> to add one.`);
      escalated++;
    }
  }
  return { nudged, escalated };
}
