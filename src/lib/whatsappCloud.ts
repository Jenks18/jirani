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

export function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const provided = header.slice('sha256='.length);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(provided, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

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

export interface SendResult {
  ok: boolean;
  errorCode?: number;
}

export async function sendText(to: string, body: string): Promise<boolean> {
  return (await sendTextDetailed(to, body)).ok;
}

export async function sendTextDetailed(to: string, body: string): Promise<SendResult> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneId || !process.env.WHATSAPP_ACCESS_TOKEN) {
    console.error('[whatsapp] WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN not configured');
    return { ok: false };
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
      if (res.ok) return { ok: true };
      const detail = (await res.json().catch(() => ({}))) as { error?: { code?: number } };
      const errorCode = detail.error?.code;
      console.error(`[whatsapp] send failed (${res.status}, code ${errorCode}) attempt ${attempt}`);
      if (res.status < 500 && res.status !== 429) return { ok: false, errorCode };
    } catch (err) {
      console.error(`[whatsapp] send error attempt ${attempt}`, err);
    }
    await new Promise((r) => setTimeout(r, 2 ** attempt * 400));
  }
  return { ok: false };
}

export async function sendTemplate(to: string, name: string, params: string[], language = 'en'): Promise<SendResult> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneId || !process.env.WHATSAPP_ACCESS_TOKEN) return { ok: false };
  try {
    const res = await graphPost(`${phoneId}/messages`, {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name,
        language: { code: language },
        components: params.length
          ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: text.slice(0, 500) })) }]
          : [],
      },
    });
    if (res.ok) return { ok: true };
    const detail = (await res.json().catch(() => ({}))) as { error?: { code?: number } };
    console.error(`[whatsapp] template ${name} failed (${res.status}, code ${detail.error?.code})`);
    return { ok: false, errorCode: detail.error?.code };
  } catch (err) {
    console.error('[whatsapp] template error', err);
    return { ok: false };
  }
}

export async function notify(
  to: string,
  text: string,
  template?: { name: string; params: string[] }
): Promise<boolean> {
  const first = await sendTextDetailed(to, text);
  if (first.ok) return true;
  if (template) return (await sendTemplate(to, template.name, template.params)).ok;
  return false;
}

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
