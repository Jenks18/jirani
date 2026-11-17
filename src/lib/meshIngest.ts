import { createHash, createPublicKey, verify } from 'node:crypto';

/**
 * Reports arriving from the Jirani Mesh phone app.
 *
 * A phone with no signal records a report, the mesh carries it to other phones,
 * and any phone that gets a connection (a "gateway") posts it here. The app
 * cannot hold an admin secret, so the report is authenticated the only way it
 * can be: it is signed with the Ed25519 identity key of the phone that wrote
 * it, and that key is sent alongside.
 *
 * What the signature buys: the report cannot be altered by the gateway that
 * relays it, and abuse can be limited per author. What it does not buy:
 * anyone can mint a new key, so it is not proof of a trustworthy author.
 * Per-address rate limits and the same anonymising pipeline the WhatsApp
 * reports go through (coarse coordinates, hour-floored times, scrubbed text)
 * are what bound the damage.
 *
 * CANONICAL_VERSION and canonicalReport() are mirrored in the app
 * (jirani-mesh/src/reports/canonical.ts). Both have a golden test; change one
 * and the other fails.
 */

export const CANONICAL_VERSION = 'jirani-mesh-report-v1';

export const MAX_REPORT_AGE_MS = 30 * 24 * 3600_000;
export const MAX_CLOCK_SKEW_MS = 10 * 60_000;

export interface MeshReport {
  /** UUID the author generated; the idempotency key. */
  id: string;
  type: string;
  severity: number;
  location: string;
  summary: string;
  latitude: number | null;
  longitude: number | null;
  /** Milliseconds since the epoch, as the author's clock saw it. */
  observedAt: number;
}

export interface MeshSubmission {
  report: MeshReport;
  /** Ed25519 public key, 32 bytes as 64 hex characters. */
  publicKey: string;
  /** Ed25519 signature over the canonical bytes, 64 bytes as 128 hex characters. */
  signature: string;
}

export function canonicalReport(r: MeshReport): string {
  return JSON.stringify([CANONICAL_VERSION, r.id, r.type, r.severity, r.location, r.summary, r.latitude, r.longitude, r.observedAt]);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_KEY = /^[0-9a-f]{64}$/i;
const HEX_SIG = /^[0-9a-f]{128}$/i;

// DER SubjectPublicKeyInfo prefix for a raw Ed25519 public key.
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export type Checked = { ok: true; submission: MeshSubmission; signer: string } | { ok: false; reason: string };

const isStr = (v: unknown, min: number, max: number): v is string => typeof v === 'string' && v.length >= min && v.length <= max;

function coordinate(v: unknown, limit: number): v is number {
  return typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit;
}

/** Shape and range checks only. Does not look at the signature. */
export function validateSubmission(body: unknown, now = Date.now()): { ok: true; submission: MeshSubmission } | { ok: false; reason: string } {
  if (typeof body !== 'object' || body === null) return { ok: false, reason: 'body must be an object' };
  const b = body as Record<string, unknown>;
  const r = b.report as Record<string, unknown> | undefined;
  if (typeof r !== 'object' || r === null) return { ok: false, reason: 'report missing' };

  if (!isStr(r.id, 36, 36) || !UUID.test(r.id)) return { ok: false, reason: 'id must be a UUID' };
  if (!isStr(r.type, 1, 60)) return { ok: false, reason: 'type must be 1-60 characters' };
  if (!Number.isInteger(r.severity) || (r.severity as number) < 1 || (r.severity as number) > 5) return { ok: false, reason: 'severity must be an integer 1-5' };
  if (!isStr(r.location, 0, 200)) return { ok: false, reason: 'location must be at most 200 characters' };
  if (!isStr(r.summary, 1, 1000)) return { ok: false, reason: 'summary must be 1-1000 characters' };

  const hasLat = r.latitude !== null;
  const hasLng = r.longitude !== null;
  if (hasLat !== hasLng) return { ok: false, reason: 'latitude and longitude go together' };
  if (hasLat && (!coordinate(r.latitude, 90) || !coordinate(r.longitude, 180))) return { ok: false, reason: 'coordinates out of range' };

  if (typeof r.observedAt !== 'number' || !Number.isFinite(r.observedAt)) return { ok: false, reason: 'observedAt must be a number' };
  if (r.observedAt > now + MAX_CLOCK_SKEW_MS) return { ok: false, reason: 'observedAt is in the future' };
  if (r.observedAt < now - MAX_REPORT_AGE_MS) return { ok: false, reason: 'report is too old' };

  if (!isStr(b.publicKey, 64, 64) || !HEX_KEY.test(b.publicKey)) return { ok: false, reason: 'publicKey must be 64 hex characters' };
  if (!isStr(b.signature, 128, 128) || !HEX_SIG.test(b.signature)) return { ok: false, reason: 'signature must be 128 hex characters' };

  const report: MeshReport = {
    id: r.id.toLowerCase(),
    type: r.type,
    severity: r.severity as number,
    location: r.location,
    summary: r.summary,
    latitude: hasLat ? (r.latitude as number) : null,
    longitude: hasLng ? (r.longitude as number) : null,
    observedAt: r.observedAt,
  };
  return { ok: true, submission: { report, publicKey: b.publicKey.toLowerCase(), signature: b.signature.toLowerCase() } };
}

/** Stable, non-reversible handle for rate limiting an author. */
export function signerId(publicKeyHex: string): string {
  return createHash('sha256').update(Buffer.from(publicKeyHex, 'hex')).digest('hex').slice(0, 16);
}

export function checkSubmission(body: unknown, now = Date.now()): Checked {
  const shaped = validateSubmission(body, now);
  if (!shaped.ok) return shaped;
  const { submission } = shaped;
  try {
    const key = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(submission.publicKey, 'hex')]),
      format: 'der',
      type: 'spki',
    });
    const good = verify(null, Buffer.from(canonicalReport(submission.report), 'utf8'), key, Buffer.from(submission.signature, 'hex'));
    if (!good) return { ok: false, reason: 'signature does not match the report' };
  } catch {
    return { ok: false, reason: 'public key is not a valid Ed25519 key' };
  }
  return { ok: true, submission, signer: signerId(submission.publicKey) };
}

/** Remembers recently stored report ids so a retry or a second gateway does not insert twice. */
export class SeenIds {
  private ids = new Set<string>();
  constructor(private readonly cap = 5000) {}

  has(id: string): boolean {
    return this.ids.has(id);
  }

  add(id: string): void {
    if (this.ids.size >= this.cap) {
      const oldest = this.ids.values().next().value;
      if (oldest !== undefined) this.ids.delete(oldest);
    }
    this.ids.add(id);
  }
}
