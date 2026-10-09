import { createHmac, timingSafeEqual } from 'crypto';

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface InboundMessage {
  id: string;
  from: string;
  type: string;
  text?: string;
  location?: { latitude: number; longitude: number };
}

interface WebhookPayload {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          id: string;
          from: string;
          type: string;
          text?: { body?: string };
          location?: { latitude?: number; longitude?: number };
          button?: { text?: string };
          interactive?: {
            button_reply?: { title?: string };
            list_reply?: { title?: string };
          };
        }>;
      };
    }>;
  }>;
}

/** Verify Meta's X-Hub-Signature-256 header against the raw request body. */
export function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const provided = header.slice('sha256='.length);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(provided, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Flatten a webhook payload into the user messages it contains (status updates are ignored). */
export function extractMessages(payload: WebhookPayload): InboundMessage[] {
  const out: InboundMessage[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const m of change.value?.messages ?? []) {
        const msg: InboundMessage = { id: m.id, from: m.from, type: m.type };
        if (m.type === 'text') msg.text = m.text?.body;
        else if (m.type === 'button') msg.text = m.button?.text;
        else if (m.type === 'interactive') {
          msg.text = m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title;
        } else if (
          m.type === 'location' &&
          typeof m.location?.latitude === 'number' &&
          typeof m.location?.longitude === 'number'
        ) {
          msg.location = { latitude: m.location.latitude, longitude: m.location.longitude };
        }
        out.push(msg);
      }
    }
  }
  return out;
}

async function graphPost(path: string, body: unknown): Promise<Response> {
  return fetch(`${GRAPH_BASE}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/** Send a text message with retry on transient (5xx / 429) failures. */
export async function sendText(to: string, body: string): Promise<boolean> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneId || !process.env.WHATSAPP_ACCESS_TOKEN) {
    console.error('[whatsapp] WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN not configured');
    return false;
  }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await graphPost(`${phoneId}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: body.slice(0, 4096), preview_url: false },
      });
      if (res.ok) return true;
      const detail = await res.text();
      console.error(`[whatsapp] send failed (${res.status}) attempt ${attempt}`, detail);
      if (res.status < 500 && res.status !== 429) return false;
    } catch (err) {
      console.error(`[whatsapp] send error attempt ${attempt}`, err);
    }
    await new Promise((r) => setTimeout(r, 2 ** attempt * 400));
  }
  return false;
}

/** Mark an inbound message as read (shows blue ticks). Best effort. */
export async function markRead(messageId: string): Promise<void> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneId) return;
  try {
    await graphPost(`${phoneId}/messages`, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });
  } catch {
    /* non-critical */
  }
}
