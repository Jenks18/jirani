/* eslint-disable @typescript-eslint/no-explicit-any */

import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://fake.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-key';
process.env.SESSION_SECRET = randomBytes(32).toString('hex');
process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString('hex');

type Row = Record<string, any>;
const tables: Record<string, Row[]> = {};
const unique: Record<string, string[]> = {
  members: ['phone'],
  conversations: ['user_id'],
  trusted_contacts: ['member_id|contact_phone'],
};
const fks: Record<string, Record<string, string>> = { trusted_contacts: { members: 'member_id' } };

class Query {
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: any;
  private conflict?: string;
  private cols = '*';
  private filters: ((r: Row) => boolean)[] = [];
  private sort?: { col: string; asc: boolean };
  private max = Infinity;
  private mode: 'many' | 'single' | 'maybe' = 'many';

  constructor(private readonly table: string) {
    tables[table] ??= [];
  }

  select(cols = '*') {
    this.cols = cols;
    return this;
  }
  insert(p: any) {
    this.op = 'insert';
    this.payload = p;
    return this;
  }
  update(p: any) {
    this.op = 'update';
    this.payload = p;
    return this;
  }
  upsert(p: any, o?: { onConflict?: string }) {
    this.op = 'upsert';
    this.payload = p;
    this.conflict = o?.onConflict;
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }
  eq(c: string, v: unknown) {
    this.filters.push((r) => r[c] === v);
    return this;
  }
  neq(c: string, v: unknown) {
    this.filters.push((r) => r[c] !== v);
    return this;
  }
  in(c: string, vs: unknown[]) {
    this.filters.push((r) => vs.includes(r[c]));
    return this;
  }
  order(col: string, o?: { ascending?: boolean }) {
    this.sort = { col, asc: o?.ascending !== false };
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  maybeSingle() {
    this.mode = 'maybe';
    return this;
  }
  single() {
    this.mode = 'single';
    return this;
  }

  private embed(row: Row): Row {
    const out: Row = { ...row };
    for (const m of this.cols.matchAll(/(\w+)\(([^)]*)\)/g)) {
      const fk = fks[this.table]?.[m[1]];
      if (fk) out[m[1]] = tables[m[1]].find((r) => r.id === row[fk]) ?? null;
    }
    return out;
  }

  private clash(row: Row): Row | undefined {
    return tables[this.table].find((r) => (unique[this.table] ?? []).some((u) => u.split('|').every((c) => r[c] === row[c])));
  }

  private run(): { data: any; error: any } {
    const rows = tables[this.table];
    let affected: Row[] = [];
    if (this.op === 'insert' || this.op === 'upsert') {
      for (const p of [].concat(this.payload)) {
        const row = { id: randomUUID(), created_at: new Date().toISOString(), ...(p as Row) };
        const existing = this.clash(row);
        if (existing && this.op === 'insert') return { data: null, error: { code: '23505', message: 'duplicate key' } };
        if (existing) {
          Object.assign(existing, p);
          affected.push(existing);
        } else {
          rows.push(row);
          affected.push(row);
        }
      }
    } else {
      affected = rows.filter((r) => this.filters.every((f) => f(r)));
      if (this.op === 'update') affected.forEach((r) => Object.assign(r, this.payload));
      if (this.op === 'delete') tables[this.table] = rows.filter((r) => !affected.includes(r));
    }
    if (this.sort) {
      const { col, asc } = this.sort;
      affected = [...affected].sort((a, b) => (a[col] > b[col] ? 1 : -1) * (asc ? 1 : -1));
    }
    affected = affected.slice(0, this.max).map((r) => this.embed(r));
    if (this.mode === 'single') return affected[0] ? { data: affected[0], error: null } : { data: null, error: { code: 'PGRST116' } };
    if (this.mode === 'maybe') return { data: affected[0] ?? null, error: null };
    return { data: affected, error: null };
  }

  then(resolve: (v: any) => unknown, reject?: (e: unknown) => unknown) {
    return Promise.resolve(this.run()).then(resolve, reject);
  }
}

let failed = 0;
async function test(name: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
    console.log(`ok   ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL ${name}\n     ${err instanceof Error ? err.stack?.split('\n').slice(0, 4).join('\n     ') : err}`);
  }
}

const everythingStored = () => JSON.stringify(tables);
const PHONE = '254712345678';
const OTHER = '254799000111';

async function main() {
  const { supabase } = await import('../src/lib/supabaseClient');
  (supabase as any).from = (t: string) => new Query(t);
  const platform = await import('../src/lib/platform');
  const safety = await import('../src/lib/safetyNet');
  const { WhatsAppConversationManager } = await import('../src/lib/whatsappConversation');
  const { storeEvent, getEvents } = await import('../src/lib/eventStorage');
  const { getPublicReports } = await import('../src/lib/publicReports');
  const session = await import('../src/lib/session');
  const vault = await import('../src/lib/vault');

  tables.areas = [
    { id: 'a1', level: 'neighborhood', name: 'Westlands', slug: 'westlands', center_lat: -1.2676, center_lng: 36.8108, radius_m: 3500, parent_id: null },
  ];

  await test('a new member is stored with an encrypted phone number', async () => {
    const m = await platform.upsertMember(PHONE);
    assert.equal(m.phone, PHONE);
    assert.ok(!everythingStored().includes(PHONE));
    assert.ok(vault.isSealed(tables.members[0].phone));
  });

  await test('the same number finds the same member instead of creating a duplicate', async () => {
    const again = await platform.upsertMember(PHONE);
    assert.equal(tables.members.length, 1);
    assert.equal(again.phone, PHONE);
  });

  await test('a legacy plaintext member is found and upgraded in place', async () => {
    tables.members.push({ id: 'legacy', phone: OTHER, display_name: 'Amina', last_location: { lat: -1.3, lng: 36.8, at: 'x' }, created_at: '2020-01-01' });
    const m = await platform.upsertMember(OTHER);
    assert.equal(m.id, 'legacy');
    assert.equal(m.display_name, 'Amina');
    assert.equal(tables.members.filter((r) => r.id === 'legacy').length, 1);
    const stored = tables.members.find((r) => r.id === 'legacy')!;
    assert.ok(vault.isSealed(stored.phone) && vault.isSealed(stored.display_name) && vault.isSealed(stored.last_location));
    assert.ok(!everythingStored().includes(OTHER) && !everythingStored().includes('Amina'));
  });

  await test('name and location are encrypted at rest and readable through the app', async () => {
    const m = await platform.upsertMember(PHONE);
    await safety.setName(m.id, 'Wanjiru Kamau');
    await platform.saveLocation(m.id, -1.28333, 36.81667);
    assert.ok(!everythingStored().includes('Wanjiru') && !everythingStored().includes('36.81667'));
    const back = await platform.upsertMember(PHONE);
    assert.equal(back.display_name, 'Wanjiru Kamau');
    assert.deepEqual(platform.recentLocation(back, 5), { lat: -1.28333, lng: 36.81667 });
  });

  await test('trusted contacts: stored sealed, readable, and invites resolve across the join', async () => {
    const me = await platform.upsertMember(PHONE);
    const added = await safety.addContact(me, 'Mama Njeri', '0722 111 222');
    assert.equal(added.ok, true);
    assert.ok(!everythingStored().includes('722111222') && !everythingStored().includes('Mama Njeri'));
    const listed = await safety.listContacts(me.id);
    assert.equal(listed[0].contact_name, 'Mama Njeri');
    assert.equal(listed[0].contact_phone, '254722111222');
    const reply = await safety.respondToInvite('254722111222', true);
    assert.equal(reply.handled, true);
    assert.equal((await safety.listContacts(me.id))[0].status, 'accepted');
    const again = await safety.addContact(me, 'Mama Njeri', '+254722111222');
    assert.equal(again.ok, false);
    assert.equal(tables.trusted_contacts.length, 1);
  });

  await test('conversations: history and draft incident are encrypted, the phone is not stored', async () => {
    const mgr = new WhatsAppConversationManager(undefined, async () =>
      JSON.stringify({ reply: 'Pole. Where exactly?', incident: { type: 'Theft', severity: 3, location: 'Kasarani stage', summary: 'Phone stolen' }, ask_confirmation: false })
    );
    const out = await mgr.processMessage(PHONE, 'Nimeibiwa simu yangu na jamaa mmoja anaitwa Otieno');
    assert.match(out.response, /Pole/);
    const stored = JSON.stringify(tables.conversations);
    assert.ok(!stored.includes('Otieno') && !stored.includes('Kasarani') && !stored.includes(PHONE));
    const history = await mgr.getConversationHistory(PHONE);
    assert.match(history, /Otieno/);
  });

  await test('a legacy plaintext conversation is read, then replaced by an encrypted one', async () => {
    tables.conversations.push({ id: 'old', user_id: OTHER, messages: [{ id: '1', timestamp: new Date().toISOString(), role: 'user', content: 'older message about Karen' }], current_incident: null, awaiting_confirmation: false, conversation_phase: 'collecting', last_activity: new Date().toISOString() });
    const mgr = new WhatsAppConversationManager(undefined, async () => JSON.stringify({ reply: 'Sawa.', incident: null, ask_confirmation: false }));
    assert.match(await mgr.getConversationHistory(OTHER), /Karen/);
    await mgr.processMessage(OTHER, 'hello again');
    assert.ok(!tables.conversations.some((r) => r.user_id === OTHER));
    assert.ok(!everythingStored().includes('Karen') && !everythingStored().includes(OTHER));
  });

  await test('a stored report has no reporter, a blurred spot, an hour-only time and no raw pin text', async () => {
    const stored = await storeEvent({
      type: 'theft',
      severity: 3,
      location: '-1.26763, 36.80971',
      description: 'Phone stolen, call me on 0712345678, plate KCB 123A',
      timestamp: new Date().toISOString(),
      coordinates: [36.80971, -1.26763],
    });
    const row = tables.reports[tables.reports.length - 1];
    assert.equal('from_phone' in row, false);
    assert.equal(row.location, 'Near Westlands');
    assert.equal(row.latitude, -1.269);
    assert.equal(row.longitude, 36.81);
    assert.match(row.event_timestamp, /T\d\d:00:00\.000Z$/);
    assert.match(row.created_at, /T\d\d:00:00\.000Z$/);
    assert.ok(!JSON.stringify(row).includes('0712345678') && !JSON.stringify(row).includes('KCB'));
    assert.deepEqual(stored.coordinates, [36.81, -1.269]);
    assert.ok(!JSON.stringify(stored).includes('254'));
  });

  await test('the public report feed re-blurs old precise rows and never exposes a phone', async () => {
    tables.reports.push({
      id: 'precise',
      type: 'Robbery',
      severity: 4,
      location: '-1.26763, 36.80971',
      summary: 'Armed robbery, victim phone 0722333444 and plate 647382',
      event_timestamp: '2026-10-20T08:41:09Z',
      created_at: '2026-10-20T08:41:12Z',
      latitude: -1.26763,
      longitude: 36.80971,
      from_phone: PHONE,
    });
    const feed = await getPublicReports();
    const old = feed.find((r) => r.id === 'precise')!;
    assert.equal(old.location, 'Near Westlands');
    assert.equal(old.latitude, -1.269);
    assert.equal(old.createdAt, '2026-10-20T08:00:00.000Z');
    const wire = JSON.stringify(feed);
    for (const leak of [PHONE, '0722333444', '647382', 'from_phone', '36.80971']) assert.ok(!wire.includes(leak), `feed leaked ${leak}`);
    const raw = await getEvents();
    assert.ok(!JSON.stringify(raw).includes(PHONE));
  });

  await test('sessions carry no phone number and can be revoked', async () => {
    const member = (await platform.findMemberByPhone(PHONE))!;
    const token = session.signSession(member)!;
    const payload = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
    assert.deepEqual(Object.keys(payload).sort(), ['e', 'm', 'v']);
    assert.ok(!token.includes(PHONE));
    assert.deepEqual(session.readSession(token), { memberId: member.id, epoch: 0 });
    assert.equal(session.readSession(token.slice(0, -2) + 'xx'), null);
    assert.equal(session.readSession(undefined), null);
  });

  await test('a login code is verified through the encrypted phone lookup', async () => {
    const member = (await platform.findMemberByPhone(PHONE))!;
    const code = await session.issueLoginCode(member);
    assert.equal(await session.verifyLoginCode(PHONE, '000000' === code ? '111111' : '000000'), null);
    const ok = await session.verifyLoginCode(PHONE, code);
    assert.equal(ok?.id, member.id);
    assert.equal(await session.verifyLoginCode(PHONE, code), null);
  });

  await test('after every flow, no phone number and no message text sits in any stored row', async () => {
    const dump = everythingStored().replace(/"from_phone":"254712345678"/g, '');
    for (const leak of [OTHER, '722111222', 'Otieno', 'Kasarani', 'Wanjiru']) assert.ok(!dump.includes(leak), `stored data contains ${leak}`);
    const memberRows = JSON.stringify(tables.members) + JSON.stringify(tables.trusted_contacts) + JSON.stringify(tables.conversations);
    assert.ok(!memberRows.includes(PHONE));
  });

  await test('with no key configured the app still works in plaintext mode', async () => {
    const key = process.env.DATA_ENCRYPTION_KEY;
    delete process.env.DATA_ENCRYPTION_KEY;
    try {
      const fresh = await platform.upsertMember('254700000001');
      assert.equal(fresh.phone, '254700000001');
      assert.ok(tables.members.some((r) => r.phone === '254700000001'));
    } finally {
      process.env.DATA_ENCRYPTION_KEY = key;
    }
  });

  if (failed) {
    console.log(`\n${failed} test(s) failed`);
    process.exit(1);
  }
  console.log('\nall data-flow tests passed');
}

main();
