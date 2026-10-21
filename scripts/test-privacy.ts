import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { COORD_STEP, coarsenPoint, floorToHour, publicPlace, publicType, scrubText, snapCoord } from '../src/lib/anonymize';
import { isSealed, openJson, openPhone, openText, phoneKeys, sealJson, sealPhone, sealStable, sealText, VaultError, vaultEnabled } from '../src/lib/vault';

let failed = 0;
function test(name: string, run: () => void): void {
  try {
    run();
    console.log(`ok   ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL ${name}\n     ${err instanceof Error ? err.message : err}`);
  }
}

const KEY = randomBytes(32).toString('hex');
const withKey = (key: string | undefined, run: () => void) => {
  const prev = process.env.DATA_ENCRYPTION_KEY;
  if (key === undefined) delete process.env.DATA_ENCRYPTION_KEY;
  else process.env.DATA_ENCRYPTION_KEY = key;
  try {
    run();
  } finally {
    if (prev === undefined) delete process.env.DATA_ENCRYPTION_KEY;
    else process.env.DATA_ENCRYPTION_KEY = prev;
  }
};

test('vault: random sealing round-trips and differs each time', () =>
  withKey(KEY, () => {
    const a = sealText('hello Nairobi', 'conv');
    const b = sealText('hello Nairobi', 'conv');
    assert.ok(isSealed(a));
    assert.notEqual(a, b);
    assert.equal(openText(a, 'conv'), 'hello Nairobi');
    assert.ok(!a.includes('Nairobi'));
  }));

test('vault: phone sealing is stable so it can be looked up, and never contains the number', () =>
  withKey(KEY, () => {
    const a = sealPhone('254712345678');
    assert.equal(a, sealPhone('254712345678'));
    assert.notEqual(a, sealPhone('254712345679'));
    assert.ok(!a.includes('712345678'));
    assert.equal(openPhone(a), '254712345678');
    assert.deepEqual(phoneKeys('254712345678'), [a, '254712345678']);
  }));

test('vault: ciphertext is bound to its column context', () =>
  withKey(KEY, () => {
    const a = sealText('secret', 'note');
    assert.throws(() => openText(a, 'conv'), VaultError);
    const p = sealStable('254700000000', 'phone');
    assert.throws(() => openText(p, 'name'), VaultError);
  }));

test('vault: tampering and a wrong key are detected', () =>
  withKey(KEY, () => {
    const a = sealText('secret', 'conv');
    const flipped = a.slice(0, -2) + (a.endsWith('AA') ? 'BB' : 'AA');
    assert.throws(() => openText(flipped, 'conv'), VaultError);
    withKey(randomBytes(32).toString('hex'), () => assert.throws(() => openText(a, 'conv'), VaultError));
  }));

test('vault: legacy plaintext passes through and sealed data without a key fails loudly', () => {
  let sealed = '';
  withKey(KEY, () => {
    sealed = sealText('secret', 'conv');
  });
  withKey(undefined, () => {
    assert.equal(vaultEnabled(), false);
    assert.equal(openText('plain value', 'conv'), 'plain value');
    assert.equal(sealText('plain value', 'conv'), 'plain value');
    assert.deepEqual(phoneKeys('254700000000'), ['254700000000']);
    assert.throws(() => openText(sealed, 'conv'), VaultError);
  });
});

test('vault: json values round-trip and legacy objects pass through', () =>
  withKey(KEY, () => {
    const value = { lat: -1.2921, lng: 36.8219, at: '2026-10-21T10:00:00Z' };
    const sealed = sealJson(value, 'loc');
    assert.equal(typeof sealed, 'string');
    assert.deepEqual(openJson(sealed, 'loc'), value);
    assert.deepEqual(openJson(value, 'loc'), value);
    assert.equal(openJson(null, 'loc'), null);
  }));

test('vault: rejects a malformed key', () => withKey('too-short', () => assert.throws(() => vaultEnabled(), VaultError)));

test('coordinates snap to a coarse grid and collapse nearby points', () => {
  const [lng, lat] = coarsenPoint([36.80971, -1.26762]);
  assert.equal(lng, 36.81);
  assert.equal(lat, -1.269);
  assert.deepEqual(coarsenPoint([36.8112, -1.2688]), [36.81, -1.269]);
  assert.ok(Math.abs(snapCoord(36.8219) - 36.8219) <= COORD_STEP / 2 + 1e-9);
});

test('timestamps are floored to the hour and never in the future', () => {
  const now = Date.parse('2026-10-21T14:37:12Z');
  assert.equal(floorToHour('2026-10-21T14:05:59Z', now), '2026-10-21T14:00:00.000Z');
  assert.equal(floorToHour('2030-01-01T00:00:00Z', now), '2026-10-21T14:00:00.000Z');
  assert.equal(floorToHour('6:00 am today', now), '2026-10-21T14:00:00.000Z');
  assert.equal(floorToHour(undefined, now), '2026-10-21T14:00:00.000Z');
});

test('scrub removes phone numbers, emails, plates, ids, links and coordinates', () => {
  const dirty =
    'Call me on 0712 345 678 or +254 722 111 222 or 254733444555, mail jane.doe@example.com, bike KMDA 123B and KCB 456A, plate 647382, ID 12345678, imei 356938035643809, see https://x.example/a at -1.28333, 36.81667';
  const clean = scrubText(dirty, 1000);
  for (const leak of ['712 345', '722 111', '733444', 'jane.doe', 'KMDA', 'KCB', '647382', '12345678', '356938035643809', 'https://', '-1.28333', '36.81667']) {
    assert.ok(!clean.includes(leak), `still contains ${leak}: ${clean}`);
  }
});

test('scrub leaves ordinary incident wording alone', () => {
  const text = 'Phone snatched near the Kikuyu stage around 6pm by two people on a bike, about 5.5 km from town.';
  assert.equal(scrubText(text, 1000), text);
});

test('a pin shared as raw coordinates is never published as a location', () => {
  const area = (lat: number, lng: number) => (Math.abs(lat + 1.2676) < 0.05 && Math.abs(lng - 36.8108) < 0.05 ? 'Westlands' : null);
  assert.equal(publicPlace('-1.26763, 36.80971', { lat: -1.26763, lng: 36.80971 }, area), 'Near Westlands');
  assert.equal(publicPlace('-1.26763, 36.80971', null, area), 'Near Westlands');
  assert.equal(publicPlace('-4.04350, 39.66820', null, () => null), 'Shared location');
  assert.equal(publicPlace('Kasarani stage', null, area), 'Kasarani stage');
});

test('incident type is canonical or scrubbed', () => {
  assert.equal(publicType('theft'), 'Theft');
  assert.equal(publicType(undefined), 'Other');
  assert.ok(!publicType('call 0712345678 now').includes('0712345678'));
});

if (failed) {
  console.log(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('\nall privacy tests passed');
