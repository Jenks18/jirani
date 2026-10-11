import { NextRequest, NextResponse, after } from 'next/server';
import { storeEvent } from '@/lib/eventStorage';
import { extractCoordinates } from '@/lib/locationUtils';
import conversationManager from '@/lib/whatsappConversation';
import { webhookRateLimiter } from '@/lib/rateLimiter';
import { handleCommand } from '@/lib/commands';
import { dispatchAlerts } from '@/lib/alerts';
import { extractMessages, markRead, sendText, verifySignature, type InboundMessage } from '@/lib/whatsappCloud';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_MESSAGE_LENGTH = 4096;
const DEDUPE_TTL_MS = 10 * 60 * 1000;
const seenMessageIds = new Map<string, number>();

const FALLBACK_REPLY =
  'Samahani, nimepata shida kidogo. Tafadhali jaribu tena baadaye. (Sorry, something went wrong. Please try again shortly.)';
const UNSUPPORTED_REPLY =
  'Samahani, naweza kusoma ujumbe wa maandishi na eneo (location) pekee. (Sorry, I can only read text messages and shared locations.)';

function log(message: string, data?: Record<string, unknown>): void {
  console.log(`[whatsapp] ${message}`, data ? JSON.stringify(data) : '');
}

function alreadySeen(id: string): boolean {
  const now = Date.now();
  for (const [key, ts] of seenMessageIds) {
    if (now - ts > DEDUPE_TTL_MS) seenMessageIds.delete(key);
  }
  if (seenMessageIds.has(id)) return true;
  seenMessageIds.set(id, now);
  return false;
}

export async function GET(req: NextRequest) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const params = req.nextUrl.searchParams;

  if (!verifyToken) {
    return new NextResponse('Server configuration error', { status: 500 });
  }
  if (params.get('hub.mode') === 'subscribe' && params.get('hub.verify_token') === verifyToken) {
    return new NextResponse(params.get('hub.challenge') ?? '', { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

async function handleMessage(msg: InboundMessage): Promise<void> {
  const { from } = msg;
  void markRead(msg.id);

  const limit = webhookRateLimiter.checkLimit(from);
  if (!limit.allowed) {
    const secs = Math.ceil(limit.resetIn / 1000);
    await sendText(
      from,
      `Samahani, umezidi kikomo cha ujumbe. Tafadhali subiri sekunde ${secs}. (You've hit the message limit. Please wait ${secs} seconds.)`
    );
    return;
  }

  let text = msg.text?.trim();
  let coords: [number, number] | undefined;
  if (msg.location) {
    coords = [msg.location.longitude, msg.location.latitude];
    text = `📍 Location shared: ${msg.location.latitude}, ${msg.location.longitude}`;
  }
  if (!text) {
    await sendText(from, UNSUPPORTED_REPLY);
    return;
  }
  if (text.length > MAX_MESSAGE_LENGTH) text = text.slice(0, MAX_MESSAGE_LENGTH);

  try {
    const reply = await handleCommand({
      phone: from,
      text: msg.location ? undefined : text,
      location: msg.location ? { lat: msg.location.latitude, lng: msg.location.longitude } : undefined,
    });
    if (reply) {
      await sendText(from, reply);
      return;
    }
  } catch (err) {
    console.error('[whatsapp] command handling failed', err);
  }

  let result: Awaited<ReturnType<typeof conversationManager.processMessage>>;
  try {
    result = await conversationManager.processMessage(from, text, coords);
  } catch (err) {
    console.error('[whatsapp] AI processing failed', err);
    await sendText(from, FALLBACK_REPLY);
    return;
  }

  let alert: Parameters<typeof dispatchAlerts>[0] | null = null;
  if (result.incident) {
    try {
      let coordinates = result.incident.coordinates;
      if (!coordinates && result.incident.location) {
        coordinates = (await extractCoordinates(result.incident.location)) || undefined;
      }
      const stored = await storeEvent(
        {
          type: result.incident.type,
          severity: result.incident.severity,
          location: result.incident.location || 'Location not specified',
          description: result.incident.description,
          timestamp: result.incident.timestamp,
          coordinates,
        },
        from,
        []
      );
      log('incident stored', { eventId: stored.id });
      alert = {
        type: stored.type,
        severity: stored.severity,
        location: stored.location,
        summary: stored.summary,
        coordinates: stored.coordinates,
      };
      await conversationManager.clearIncident(from);
    } catch (err) {
      console.error('[whatsapp] failed to store incident', err);
    }
  }

  await sendText(from, result.response);
  if (alert) await dispatchAlerts(alert, from);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    if (!verifySignature(rawBody, req.headers.get('x-hub-signature-256'), appSecret)) {
      console.error('[whatsapp] invalid signature');
      return new NextResponse('Forbidden', { status: 403 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.error('[whatsapp] WHATSAPP_APP_SECRET missing; refusing unsigned webhook in production');
    return new NextResponse('Server configuration error', { status: 500 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }

  const messages = extractMessages(payload).filter((m) => !alreadySeen(m.id));

  if (messages.length > 0) {
    after(async () => {
      for (const msg of messages) {
        try {
          await handleMessage(msg);
        } catch (err) {
          console.error('[whatsapp] unhandled error', err);
        }
      }
    });
  }

  return new NextResponse('EVENT_RECEIVED', { status: 200 });
}
