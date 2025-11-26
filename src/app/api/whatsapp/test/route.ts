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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const to = (body.to as string) || (body.phone as string);
    const message = (body.message as string) || body.msg || '';
    const doSend = Boolean(body.send);

    if (!to || !message) {
      return NextResponse.json({ error: 'Missing `to` or `message` in JSON body' }, { status: 400 });
    }

    // Run the same conversation flow (uses Groq)
    const result = await conversationManager.processMessage(to, message);

    // Prepare response payload
    const payload: any = { response: result.response, incident: result.incident };

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
      const sendParams: any = { body: result.response };

      if (TWILIO_MESSAGING_SERVICE_SID) {
        sendParams.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
      } else if (TWILIO_WHATSAPP_NUMBER) {
        sendParams.from = TWILIO_WHATSAPP_NUMBER;
      }

      let toNumber = to;
      if (!toNumber.startsWith('whatsapp:')) toNumber = `whatsapp:${toNumber}`;
      sendParams.to = toNumber;

      try {
        const sent = await client.messages.create(sendParams);
        payload.twilio = { sent: true, sid: sent.sid };
      } catch (err) {
        const errMsg = (err && typeof err === 'object' && 'message' in err) ? (err as any).message : String(err);
        payload.twilio = { sent: false, error: errMsg };
      }
    }

    return NextResponse.json(payload);

  } catch (error) {
    const errMsg = (error && typeof error === 'object' && 'message' in error) ? (error as any).message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, note: 'POST JSON to this route to test Groq+Twilio flow' });
}
