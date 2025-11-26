import { NextRequest, NextResponse } from 'next/server';
import conversationManager from '../../../../lib/whatsappConversation';
import twilio from 'twilio';

/*
  Test endpoint for verifying the Groq pipeline and Twilio send without relying
  on an actual incoming webhook. POST JSON: { to: "+<E.164>", message: "...", send: true }
  - If `send` is true and Twilio is configured, the endpoint will attempt to send
    the generated AI response via Twilio (prefers Messaging Service SID).
  - Otherwise it returns the AI response and incident info.
*/

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  try { return String(e); } catch { return 'Unknown error'; }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const to = typeof body.to === 'string' ? body.to : (typeof body.phone === 'string' ? body.phone : undefined);
    const message = typeof body.message === 'string' ? body.message : (typeof body.msg === 'string' ? body.msg : '');
    const doSend = Boolean(body.send);

    if (!to || !message) {
      return NextResponse.json({ error: 'Missing `to` or `message` in JSON body' }, { status: 400 });
    }

    // Run the same conversation flow (uses Groq)
    const result = await conversationManager.processMessage(to, message);

    // Prepare response payload
    const payload: Record<string, unknown> = { response: result.response, incident: result.incident };

    // If requested, attempt Twilio send (uses Messaging Service SID first)
    if (doSend) {
      const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
      const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
      const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;
      let TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

      if (TWILIO_WHATSAPP_NUMBER && !TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')) {
        TWILIO_WHATSAPP_NUMBER = `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;
      }

      const twilioConfigured = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && (TWILIO_MESSAGING_SERVICE_SID || TWILIO_WHATSAPP_NUMBER));
      if (!twilioConfigured) {
        payload.twilio = { sent: false, reason: 'Twilio not configured in environment' };
        return NextResponse.json(payload);
      }

      const client = twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!);

      // Define a narrow type for the Twilio send params we use
      type TwilioSendParams = {
        body: string;
        to: string;
        messagingServiceSid?: string;
        from?: string;
      };

      let toNumber = to;
      if (!toNumber.startsWith('whatsapp:')) toNumber = `whatsapp:${toNumber}`;

      const sendParams: TwilioSendParams = {
        body: String(result.response || ''),
        to: toNumber,
      };

      if (TWILIO_MESSAGING_SERVICE_SID) {
        sendParams.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
      } else if (TWILIO_WHATSAPP_NUMBER) {
        sendParams.from = TWILIO_WHATSAPP_NUMBER;
      }

      try {
        // Twilio SDK typings are complex in this environment; ignore TS here
        // to allow runtime invocation with our narrow `sendParams` object.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const sent = await client.messages.create(sendParams as unknown as object);
        const sid = sent && typeof sent === 'object' && 'sid' in sent ? (sent as { sid?: string }).sid : undefined;
        payload.twilio = { sent: true, sid };
      } catch (err) {
        const errMsg = getErrorMessage(err);
        payload.twilio = { sent: false, error: errMsg };
      }
    }

    return NextResponse.json(payload);

  } catch (error) {
    const errMsg = getErrorMessage(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, note: 'POST JSON to this route to test Groq+Twilio flow' });
}
