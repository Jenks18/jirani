import { NextRequest, NextResponse } from 'next/server';
import { DuplicateEventError, storeEvent } from '@/lib/eventStorage';
import { checkSubmission, SeenIds } from '@/lib/meshIngest';
import { meshAuthorRateLimiter, meshIpRateLimiter } from '@/lib/rateLimiter';

const MAX_BODY_BYTES = 8 * 1024;
const seen = new SeenIds();

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Accepts one report from a Jirani Mesh gateway phone.
 *
 * 200 { status: 'stored' | 'duplicate' } means the gateway can mark the report as delivered.
 * 200 { status: 'verified' } is a dry run (body has "dryRun": true): the shape, time window and signature were
 * checked exactly as for a real report, and nothing was stored. The app uses it for its "Test connection" button.
 * 400/413/422 mean the report itself is bad and retrying it will never work.
 * 429 and 5xx mean try again later.
 */
export async function POST(req: NextRequest) {
  const ip = meshIpRateLimiter.checkLimit(clientIp(req));
  if (!ip.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(ip.resetIn / 1000)) } });
  }

  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return NextResponse.json({ error: 'Report too large' }, { status: 413 });

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ error: 'Unreadable body' }, { status: 400 });
  }
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return NextResponse.json({ error: 'Report too large' }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const checked = checkSubmission(body);
  if (!checked.ok) return NextResponse.json({ error: checked.reason }, { status: 400 });
  const { report } = checked.submission;

  const dryRun = typeof body === 'object' && body !== null && (body as Record<string, unknown>).dryRun === true;
  if (dryRun) return NextResponse.json({ status: 'verified', id: report.id });

  if (seen.has(report.id)) return NextResponse.json({ status: 'duplicate', id: report.id });

  const author = meshAuthorRateLimiter.checkLimit(checked.signer);
  if (!author.allowed) {
    return NextResponse.json({ error: 'Too many reports from this device' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(author.resetIn / 1000)) } });
  }

  try {
    await storeEvent({
      type: report.type,
      severity: report.severity,
      location: report.location || 'Unknown location',
      description: report.summary,
      timestamp: new Date(report.observedAt).toISOString(),
      coordinates: report.latitude !== null && report.longitude !== null ? [report.longitude, report.latitude] : undefined,
      source: 'mesh',
      clientId: report.id,
    });
    seen.add(report.id);
    return NextResponse.json({ status: 'stored', id: report.id });
  } catch (err) {
    if (err instanceof DuplicateEventError) {
      seen.add(report.id);
      return NextResponse.json({ status: 'duplicate', id: report.id });
    }
    console.error('Mesh ingest failed:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Failed to store report' }, { status: 500 });
  }
}
