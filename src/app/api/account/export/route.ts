import { NextRequest, NextResponse } from 'next/server';
import { authed } from '@/lib/accountApi';
import { db, safely } from '@/lib/platform';
import { openContact } from '@/lib/safetyNet';
import { openText } from '@/lib/vault';

export async function GET(req: NextRequest) {
  const a = await authed(req, false);
  if ('res' in a) return a.res;
  const id = a.member.id;
  const [profile, contacts, subscriptions, memberships, checkins, sosEvents] = await Promise.all([
    safely(() => db().from('safety_profiles').select('*').eq('member_id', id), []),
    safely<{ contact_name: string; contact_phone: string }[]>(
      () => db().from('trusted_contacts').select('contact_name, contact_phone, status, invited_at, responded_at').eq('member_id', id),
      []
    ),
    safely(() => db().from('alert_subscriptions').select('*').eq('member_id', id), []),
    safely(() => db().from('memberships').select('role, joined_at, communities(name, slug)').eq('member_id', id), []),
    safely<{ note: string | null }[]>(() => db().from('checkins').select('due_at, status, note, created_at, resolved_at').eq('member_id', id), []),
    safely(() => db().from('sos_events').select('created_at, ended_at, contacts_notified').eq('member_id', id), []),
  ]);
  const data = {
    exportedAt: new Date().toISOString(),
    account: { phone: a.member.phone, displayName: a.member.display_name, createdAt: (a.member as unknown as { created_at?: string }).created_at ?? null },
    safetyProfile: profile,
    trustedContacts: contacts.map(openContact),
    alertSubscriptions: subscriptions,
    communityMemberships: memberships,
    checkins: checkins.map((c) => ({ ...c, note: openText(c.note, 'note') })),
    sosEvents,
    reports: 'Reports you send are published without any link to your phone number or account, so none can be listed here.',
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="jirani-my-data.json"', 'Cache-Control': 'no-store' },
  });
}
