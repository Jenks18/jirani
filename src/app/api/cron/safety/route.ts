import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { processDueCheckins } from '@/lib/safetyNet';

export const maxDuration = 60;

/** Called every few minutes by the scheduler (see .github/workflows/safety-checkins.yml). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await processDueCheckins());
  } catch (err) {
    console.error('[cron/safety] failed', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
