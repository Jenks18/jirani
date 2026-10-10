import 'server-only';
import {
  areaForPoint, findArea, joinCommunity, leaveCommunity, listAreas, listCommunities, myCommunities, mySubscriptions,
  recentLocation, safely, db, saveLocation, setPending, subscribe, unsubscribeAll, upsertMember, type Member,
} from './platform';
import {
  activeCheckin, activeSos, addContact, getProfile, listContacts, markSafe, MAX_CONTACTS, removeContact,
  respondToInvite, setName, sosLocationUpdate, startCheckin, stopAllForContact, triggerSos, updateProfile,
} from './safetyNet';
import { timeAgo } from './reports';
import { issueLoginCode } from './session';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const HELP_TEXT = `Jirani — what I can do:

REPORT: just tell me what happened and where.

SAFETY NET
• ADD <name> <number> — add a trusted contact
• CONTACTS / REMOVE <n>
• CHECKIN <minutes> — I'll check on you, and alert your contacts if you don't reply
• SAFE — I'm OK
• SOS — alert your contacts now
• SETTINGS — change grace time, location sharing

ALERTS & COMMUNITY
• SUBSCRIBE <area> (or send a pin) — get alerts near you
• ALERTS / STOP
• COMMUNITIES / JOIN <name> / LEAVE <name>
• NEWS
• LOGIN — get a code to manage your account on the web

In an emergency call 999 or 112 first.`;

const SOS_RE = /^(sos|panic)(\s+.*)?$/i;

export interface InboundCtx {
  phone: string;
  text?: string;
  location?: { lat: number; lng: number };
}

/**
 * Handle explicit commands. Returns the reply text, or null when the message is not a command and
 * should go to the conversational AI.
 */
export async function handleCommand(ctx: InboundCtx): Promise<string | null> {
  const member = await upsertMember(ctx.phone);
  const text = (ctx.text ?? '').trim();

  // ── Pins ───────────────────────────────────────────────────────────────────────────────────
  if (ctx.location) {
    const { lat, lng } = ctx.location;
    await saveLocation(member.id, lat, lng);
    const sos = await activeSos(member.id);
    if (sos) {
      const n = await sosLocationUpdate(member, ctx.location);
      return n > 0 ? `📍 Location sent to ${n} trusted ${n === 1 ? 'contact' : 'contacts'}. Reply SAFE when you are safe.` : 'Location received. Reply SAFE when you are safe.';
    }
    if (member.pending?.action === 'subscribe') {
      await setPending(member.id, null);
      return finishSubscribe(member, lat, lng);
    }
    return null; // a pin on its own is part of a report; let the AI handle it
  }

  if (!text) return null;
  const upper = text.toUpperCase();
  const [cmd, ...rest] = text.split(/\s+/);
  const arg = rest.join(' ').trim();
  const c = cmd.toUpperCase();

  // ── Contact replies (YES/NO to an invite) ──────────────────────────────────────────────────
  if (c === 'YES' || c === 'NO') {
    const idx = /^\d+$/.test(arg) ? parseInt(arg, 10) : undefined;
    const r = await respondToInvite(ctx.phone, c === 'YES', idx);
    return r.handled ? r.reply : null;
  }

  if (c === 'STOP' || c === 'UNSUBSCRIBE') {
    const [removed, subs] = await Promise.all([stopAllForContact(ctx.phone), unsubscribeAll(member.id)]);
    await setPending(member.id, null);
    return removed || subs
      ? 'Done. You will not receive further alerts or safety-net messages from Jirani. Message MENU any time to come back.'
      : 'You are not subscribed to anything, so there is nothing to stop. Message MENU any time.';
  }

  if (upper === 'MENU' || upper === 'COMMANDS') return HELP_TEXT;

  if (c === 'LOGIN' || upper === 'SIGN IN' || upper === 'SIGNIN') {
    const code = await issueLoginCode(member);
    return `Your Jirani sign-in code is *${code}*. It works for 10 minutes. Enter it with your phone number at maps.the625movement.com/account. Never share this code with anyone.`;
  }

  // ── SOS ────────────────────────────────────────────────────────────────────────────────────
  if (SOS_RE.test(text)) {
    const loc = recentLocation(member, 30);
    const contacts = (await listContacts(member.id)).filter((x) => x.status === 'accepted');
    if (contacts.length === 0) {
      return `🚨 If you are in danger call 999 or 112 now.\n\nYou have no trusted contacts yet, so I can't alert anyone. Add one with: ADD <name> <number>`;
    }
    const r = await triggerSos(member, loc);
    return `🚨 I've alerted ${r.delivered} of ${r.contacts} trusted ${r.contacts === 1 ? 'contact' : 'contacts'}.\n\nIf you are in danger call 999 or 112 now. Share your location pin to keep them updated, and reply SAFE when you are OK.${loc ? '' : '\n(I had no recent location to send.)'}`;
  }

  // ── Safe / check-in ────────────────────────────────────────────────────────────────────────
  if (/^(safe|i('?m| am) safe|ok|i('?m| am) ok)$/i.test(text)) {
    const [ci, sos] = await Promise.all([activeCheckin(member.id), activeSos(member.id)]);
    if (!ci && !sos) return /^safe$/i.test(text) ? 'Glad you are safe. 💚' : null;
    await markSafe(member);
    return 'Glad you are safe. 💚 I have closed your check-in' + (sos ? ' and told your contacts you are OK.' : '.');
  }
  if (c === 'CHECKIN' || upper.startsWith('CHECK IN') || upper.startsWith('CHECK-IN')) {
    const body = text.replace(/^check[\s-]?in/i, '').trim();
    const m = /^(\d{1,4})\s*(m|min|mins|minutes|h|hr|hrs|hours)?\b\s*(.*)$/i.exec(body);
    const profile = await getProfile(member.id);
    let minutes = profile.default_checkin_minutes;
    let note = body;
    if (m) {
      minutes = parseInt(m[1], 10) * (m[2] && m[2].toLowerCase().startsWith('h') ? 60 : 1);
      note = m[3] ?? '';
    }
    minutes = Math.min(Math.max(minutes, 5), 1440);
    const contacts = (await listContacts(member.id)).filter((x) => x.status === 'accepted');
    const due = await startCheckin(member, minutes, note || undefined);
    const when = due.toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit' });
    return `⏱️ Check-in set for ${when} (in ${minutes} min). Reply SAFE when you're OK. If I don't hear from you I'll nudge you, and ${profile.grace_minutes} minutes later alert ${contacts.length ? `your ${contacts.length} trusted ${contacts.length === 1 ? 'contact' : 'contacts'}` : 'your trusted contacts (you have none yet — ADD <name> <number>)'}.`;
  }

  // ── Contacts & settings ────────────────────────────────────────────────────────────────────
  if (c === 'NAME' && arg) {
    await setName(member.id, arg);
    return `Thanks, ${arg}. That's the name your trusted contacts will see.`;
  }
  if (c === 'ADD') {
    const m = /^(?:contact\s+)?(.+?)\s+(\+?[\d][\d\s-]{7,})$/i.exec(arg);
    if (!m) {
      // "add that it happened near…" is a sentence in a report, not a command
      return /\d/.test(arg) || arg.split(/\s+/).filter(Boolean).length <= 2
        ? 'To add a trusted contact send: ADD <name> <number>\nExample: ADD Mum +254712345678'
        : null;
    }
    const res = await addContact(member, m[1], m[2]);
    if (!res.ok) return res.reason;
    return `📨 I've asked ${m[1]} to accept. They only become a trusted contact once they reply YES, and I'll tell you when they do.${member.display_name ? '' : '\nTip: send NAME <your name> so they know who is asking.'}`;
  }
  if (c === 'CONTACTS') {
    const list = await listContacts(member.id);
    if (!list.length) return `You have no trusted contacts yet. Add up to ${MAX_CONTACTS}: ADD <name> <number>`;
    return `Your trusted contacts:\n${list.map((x, i) => `${i + 1}. ${x.contact_name} — ${x.status === 'accepted' ? '✅ accepted' : x.status === 'pending' ? '⏳ waiting for reply' : '✖ declined'}`).join('\n')}\n\nREMOVE <number> to remove one.`;
  }
  if (c === 'REMOVE' && /^\d+$/.test(arg)) {
    const name = await removeContact(member.id, parseInt(arg, 10));
    return name ? `Removed ${name}.` : "I couldn't find that number. Send CONTACTS to see your list.";
  }
  if (c === 'SETTINGS' || c === 'SETTING') return handleSettings(member, arg);

  // ── Alerts ─────────────────────────────────────────────────────────────────────────────────
  if (c === 'SUBSCRIBE') {
    if (arg) {
      const area = await findArea(arg);
      if (!area) {
        const names = (await listAreas()).filter((a) => a.level !== 'country').map((a) => a.name).slice(0, 12).join(', ');
        return `I don't know "${arg}". Try one of: ${names}. Or send SUBSCRIBE and then share a location pin.`;
      }
      await subscribe(member.id, { areaId: area.id });
      return `🔔 Done. You'll get a WhatsApp alert for high-severity reports in ${area.name}. Send ALERTS to review or STOP to turn them off.`;
    }
    const loc = recentLocation(member, 10);
    if (loc) return finishSubscribe(member, loc.lat, loc.lng);
    await setPending(member.id, { action: 'subscribe', at: new Date().toISOString() });
    return 'Send me a location pin (📎 → Location) for the place you want alerts about, or reply SUBSCRIBE <area name>, e.g. SUBSCRIBE Westlands.';
  }
  if (c === 'ALERTS') {
    const subs = await mySubscriptions(member.id);
    if (!subs.length) return 'You have no alerts set up. Send SUBSCRIBE to start.';
    return `Your alerts:\n${subs.map((s: any, i: number) => `${i + 1}. ${s.areas?.name ?? `within ${s.radius_m} m of your pin`} (severity ${s.min_severity}+)`).join('\n')}\n\nSTOP turns them all off.`;
  }

  // ── Communities & news ─────────────────────────────────────────────────────────────────────
  if (c === 'COMMUNITIES') {
    const [all, mine] = await Promise.all([listCommunities(), myCommunities(member.id)]);
    if (!all.length) return 'There are no communities yet. Check back soon.';
    const mineSlugs = new Set(mine.map((m) => m.slug));
    return `Communities:\n${all.map((x) => `• ${x.name}${mineSlugs.has(x.slug) ? ' ✅' : ''} — JOIN ${x.slug}`).join('\n')}`;
  }
  if (c === 'JOIN' && arg) {
    const comm = await joinCommunity(member.id, arg.toLowerCase().replace(/\s+/g, '-'));
    return comm ? `Welcome to ${comm.name}! 🎉 You'll see its news with NEWS.` : `I couldn't find "${arg}". Send COMMUNITIES to see what's available.`;
  }
  if (c === 'LEAVE' && arg) {
    const ok = await leaveCommunity(member.id, arg.toLowerCase().replace(/\s+/g, '-'));
    return ok ? 'You have left that community.' : `I couldn't find "${arg}".`;
  }
  if (c === 'NEWS') {
    const posts = await safely<any[]>(() => db().from('news_posts').select('title, body, published_at').order('pinned', { ascending: false }).order('published_at', { ascending: false }).limit(3), []);
    if (!posts.length) return 'No news yet.';
    return posts.map((p) => `📰 *${p.title}* (${timeAgo(p.published_at)})\n${String(p.body).slice(0, 280)}`).join('\n\n');
  }

  return null;
}

async function finishSubscribe(member: Member, lat: number, lng: number): Promise<string> {
  const areas = await listAreas();
  const area = areaForPoint(areas, lat, lng);
  await subscribe(member.id, { lat, lng, radiusM: 1500 });
  return `🔔 Done. You'll get an alert for high-severity reports within 1.5 km of that pin${area ? ` (${area.name})` : ''}. Send ALERTS to review or STOP to turn them off.`;
}

async function handleSettings(member: Member, arg: string): Promise<string> {
  const p = await getProfile(member.id);
  const a = arg.trim();
  const g = /^grace\s+(\d{1,3})$/i.exec(a);
  if (g) {
    const v = Math.min(Math.max(parseInt(g[1], 10), 1), 120);
    await updateProfile(member.id, { grace_minutes: v });
    return `Grace time set to ${v} minutes: I'll wait that long after a missed check-in before alerting your contacts.`;
  }
  const s = /^(?:share|location)\s*(?:location)?\s*(on|off)$/i.exec(a);
  if (s) {
    const on = s[1].toLowerCase() === 'on';
    await updateProfile(member.id, { share_location: on });
    return on ? 'Your last known location will be shared with contacts in an SOS or missed check-in.' : 'Your location will NOT be shared with contacts.';
  }
  const ci = /^checkin\s+(\d{1,4})$/i.exec(a);
  if (ci) {
    const v = Math.min(Math.max(parseInt(ci[1], 10), 5), 1440);
    await updateProfile(member.id, { default_checkin_minutes: v });
    return `Default check-in set to ${v} minutes (used when you send CHECKIN with no time).`;
  }
  const sm = /^sos\s+(.{1,140})$/i.exec(a);
  if (sm) {
    await updateProfile(member.id, { sos_message: sm[1] });
    return 'Your SOS note is saved. It will be included when contacts are alerted.';
  }
  return `Your settings:\n• Grace time: ${p.grace_minutes} min (SETTINGS GRACE <min>)\n• Share location: ${p.share_location ? 'on' : 'off'} (SETTINGS SHARE ON/OFF)\n• Default check-in: ${p.default_checkin_minutes} min (SETTINGS CHECKIN <min>)\n• SOS note: ${p.sos_message ?? 'none'} (SETTINGS SOS <note>)`;
}
