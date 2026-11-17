import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { canonicalReport, checkSubmission, SeenIds, signerId, validateSubmission, type MeshReport } from '../src/lib/meshIngest';

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

const NOW = Date.UTC(2026, 10, 17, 12, 0, 0);

const report = (over: Partial<MeshReport> = {}): MeshReport => ({
  id: '3f2b8c1e-5a47-4d0e-9b61-0c9d6f1a2e34',
  type: 'Road Accident',
  severity: 3,
  location: 'Thika Road, Kasarani',
  summary: 'Two vehicles collided near the Kasarani flyover.',
  latitude: -1.2195,
  longitude: 36.8984,
  observedAt: NOW - 3600_000,
  ...over,
});

function signed(r: MeshReport, tamper?: (hex: string) => string) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  const sig = sign(null, Buffer.from(canonicalReport(r), 'utf8'), privateKey).toString('hex');
  return { report: r, publicKey: raw.toString('hex'), signature: tamper ? tamper(sig) : sig };
}

// The app mirrors canonicalReport() in jirani-mesh/src/reports/canonical.ts and asserts this same string.
test('canonical form is pinned (the app asserts the same string)', () => {
  assert.equal(
    canonicalReport(report()),
    '["jirani-mesh-report-v1","3f2b8c1e-5a47-4d0e-9b61-0c9d6f1a2e34","Road Accident",3,"Thika Road, Kasarani","Two vehicles collided near the Kasarani flyover.",-1.2195,36.8984,1794913200000]',
  );
});

test('a correctly signed report is accepted and names its signer', () => {
  const r = checkSubmission(signed(report()), NOW);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.signer, signerId(r.submission.publicKey));
});

test('a report with no coordinates is accepted', () => {
  assert.ok(checkSubmission(signed(report({ latitude: null, longitude: null })), NOW).ok);
});

test('altering any signed field after signing is rejected', () => {
  for (const over of [{ summary: 'changed' }, { severity: 5 }, { location: 'elsewhere' }, { latitude: 1 }, { observedAt: NOW - 10 }, { type: 'Other' }]) {
    const s = signed(report());
    const r = checkSubmission({ ...s, report: { ...s.report, ...over } }, NOW);
    assert.equal(r.ok, false, JSON.stringify(over));
  }
});

test('a signature from a different key is rejected', () => {
  const a = signed(report());
  const b = signed(report());
  assert.equal(checkSubmission({ ...a, publicKey: b.publicKey }, NOW).ok, false);
});

test('a corrupted signature is rejected, not thrown', () => {
  const r = checkSubmission(signed(report(), (h) => (h[0] === 'a' ? 'b' : 'a') + h.slice(1)), NOW);
  assert.equal(r.ok, false);
});

test('shape errors are named', () => {
  const s = signed(report());
  const reason = (body: unknown) => {
    const r = validateSubmission(body, NOW);
    return r.ok ? 'ok' : r.reason;
  };
  assert.equal(reason(null), 'body must be an object');
  assert.equal(reason({ ...s, report: { ...s.report, id: 'nope' } }), 'id must be a UUID');
  assert.equal(reason({ ...s, report: { ...s.report, severity: 9 } }), 'severity must be an integer 1-5');
  assert.equal(reason({ ...s, report: { ...s.report, summary: '' } }), 'summary must be 1-1000 characters');
  assert.equal(reason({ ...s, report: { ...s.report, summary: 'x'.repeat(1001) } }), 'summary must be 1-1000 characters');
  assert.equal(reason({ ...s, report: { ...s.report, latitude: 95 } }), 'coordinates out of range');
  assert.equal(reason({ ...s, report: { ...s.report, longitude: null } }), 'latitude and longitude go together');
  assert.equal(reason({ ...s, publicKey: 'abc' }), 'publicKey must be 64 hex characters');
  assert.equal(reason({ ...s, signature: 'abc' }), 'signature must be 128 hex characters');
});

test('time window: the future and the long ago are refused, a day-old report is fine', () => {
  const reason = (r: MeshReport) => {
    const x = validateSubmission(signed(r), NOW);
    return x.ok ? 'ok' : x.reason;
  };
  assert.equal(reason(report({ observedAt: NOW + 11 * 60_000 })), 'observedAt is in the future');
  assert.equal(reason(report({ observedAt: NOW + 5 * 60_000 })), 'ok');
  assert.equal(reason(report({ observedAt: NOW - 31 * 24 * 3600_000 })), 'report is too old');
  assert.equal(reason(report({ observedAt: NOW - 24 * 3600_000 })), 'ok');
});

test('NaN and non-finite numbers are refused', () => {
  const s = signed(report());
  assert.equal(validateSubmission({ ...s, report: { ...s.report, observedAt: NaN } }, NOW).ok, false);
  assert.equal(validateSubmission({ ...s, report: { ...s.report, latitude: Infinity } }, NOW).ok, false);
});

test('seen ids: remembers, and evicts the oldest at capacity', () => {
  const seen = new SeenIds(2);
  seen.add('a');
  seen.add('b');
  seen.add('c');
  assert.equal(seen.has('a'), false);
  assert.equal(seen.has('b'), true);
  assert.equal(seen.has('c'), true);
});

if (failed) {
  console.log(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nall passed');
