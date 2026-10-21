import { NextRequest, NextResponse } from 'next/server';
import { safeEqual } from '@/lib/adminAuth';
import { processDueCheckins } from '@/lib/safetyNet';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!secret || !safeEqual(given, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await processDueCheckins());
  } catch (err) {
    console.error('[cron/safety] failed', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
