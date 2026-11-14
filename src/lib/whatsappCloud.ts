import { createHmac, timingSafeEqual } from 'crypto';

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface InboundMessage {
  id: string;
  from: string;
  type: string;
  /** Phone number ID of the Jirani number that received this message (reply from the same one). */
  phoneNumberId?: string;
  text?: string;
  location?: { latitude: number; longitude: number };
}

export interface DeliveryFailure {
  messageId: string;
  recipient?: string;
  phoneNumberId?: string;
  errors: Array<{ code?: number; title?: string; message?: string }>;
}

interface WebhookPayload {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        statuses?: Array<{
          id: string;
          status: string;
          recipient_id?: string;
          errors?: Array<{ code?: number; title?: string; message?: string }>;
        }>;
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

/** WHATSAPP_APP_SECRET may hold several comma-separated secrets (e.g. while moving between Meta apps). */
export function parseAppSecrets(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

export function verifySignature(rawBody: string, header: string | null, appSecret: string | string[]): boolean {
  if (!header?.startsWith('sha256=')) return false;
  const provided = Buffer.from(header.slice('sha256='.length).trim().toLowerCase(), 'hex');
  const secrets = Array.isArray(appSecret) ? appSecret : parseAppSecrets(appSecret);
  return secrets.some((secret) => {
    const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest();
    return expected.length === provided.length && timingSafeEqual(expected, provided);
  });
}

/** Explains a signature failure without revealing the secret or any user data. */
export function describeSignatureFailure(rawBody: string, header: string | null, secrets: string[]): string {
  const hints: string[] = [];
  if (!header) hints.push('no X-Hub-Signature-256 header (request did not come from Meta, or a proxy stripped it)');
  else if (!header.startsWith('sha256=')) hints.push('signature header is not sha256=...');
  for (const [i, s] of secrets.entries()) {
    if (!/^[0-9a-f]{32}$/i.test(s)) {
      hints.push(`secret #${i + 1} is ${s.length} chars and not 32 hex chars, so it is probably not an App secret (an access token or verify token pasted by mistake?)`);
    }
  }
  let source = '';
  try {
    const p = JSON.parse(rawBody) as WebhookPayload & { entry?: Array<{ id?: string }> };
    const waba = p.entry?.[0]?.id;
    const phoneId = p.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    source = ` Sent for WABA ${waba ?? '?'}, phone number ID ${phoneId ?? '?'}.`;
  } catch {
    /* ignore */
  }
  if (!hints.length) {
    hints.push(
      'the secret is well-formed but belongs to a different Meta app than the one whose webhook calls this URL (or it was reset). Copy App settings -> Basic -> App secret from the app that has this callback URL, then redeploy'
    );
  }
  return `invalid signature: ${hints.join('; ')}.${source}`;
}

export function extractMessages(payload: WebhookPayload): InboundMessage[] {
  const out: InboundMessage[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id;
      for (const m of change.value?.messages ?? []) {
        const msg: InboundMessage = { id: m.id, from: m.from, type: m.type, phoneNumberId };
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

/** Messages Meta accepted but then failed to deliver; these arrive only as webhook status events. */
export function extractFailures(payload: WebhookPayload): DeliveryFailure[] {
  const out: DeliveryFailure[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const st of change.value?.statuses ?? []) {
        if (st.status !== 'failed') continue;
        out.push({
          messageId: st.id,
          recipient: st.recipient_id,
          phoneNumberId: change.value?.metadata?.phone_number_id,
          errors: st.errors ?? [],
        });
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

export async function sendText(to: string, body: string, fromPhoneNumberId?: string): Promise<boolean> {
  return (await sendTextDetailed(to, body, fromPhoneNumberId)).ok;
}

export async function sendTextDetailed(to: string, body: string, fromPhoneNumberId?: string): Promise<SendResult> {
  const phoneId = fromPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
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
      const detail = (await res.json().catch(() => ({}))) as { error?: { code?: number; message?: string } };
      const errorCode = detail.error?.code;
      console.error(
        `[whatsapp] send failed from ${phoneId} (${res.status}, code ${errorCode}: ${detail.error?.message ?? 'no message'}) attempt ${attempt}`
      );
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
    const detail = (await res.json().catch(() => ({}))) as { error?: { code?: number; message?: string } };
    console.error(`[whatsapp] template ${name} failed (${res.status}, code ${detail.error?.code}: ${detail.error?.message ?? 'no message'})`);
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

export async function markRead(messageId: string, fromPhoneNumberId?: string): Promise<void> {
  const phoneId = fromPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
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
