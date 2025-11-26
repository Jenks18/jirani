import { NextRequest, NextResponse } from 'next/server';
import { storeEvent } from '../../../lib/eventStorage';
import { extractCoordinates } from '../../../lib/locationUtils';
import conversationManager from '../../../lib/whatsappConversation';
import twilio from 'twilio';

/*
  This file intentionally uses some dynamic typing to handle both Twilio
  (form-encoded) and Meta (JSON) webhook payloads. Disable the explicit any
  rule here so we can parse unknown shapes without failing the build.
*/
/* eslint-disable @typescript-eslint/no-explicit-any */

// Twilio WhatsApp webhook handler
export async function GET(req: NextRequest) {
  // Twilio doesn't use GET for verification
  return NextResponse.json({ status: 'ok', provider: 'Twilio WhatsApp' });
}

export async function POST(req: NextRequest) {
  try {
    console.log('=== Twilio WhatsApp Webhook POST Request ===');
    
    // Validate required environment variables
    const requiredEnvVars = {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,
    };
    
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        console.error(`Missing required environment variable: ${key}`);
        return NextResponse.json({ error: `${key} not configured` }, { status: 500 });
      }
    }
    
    // Initialize Twilio client
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
    
    // Try to parse incoming payload as JSON (Meta/Cloud API)
    let incoming: any = null;
    let from: string | undefined;
    let message: string | undefined;

    try {
      incoming = await req.json();
      console.log('Parsed JSON webhook body');
    } catch (jsonErr) {
      // Not JSON — try form data (Twilio sends x-www-form-urlencoded)
      try {
        const formData = await req.formData();
        const fd: Record<string, string> = Object.fromEntries(formData.entries() as Iterable<[string,string]>);
        console.log('Parsed form-encoded webhook body', fd);
        // Twilio uses 'Body' and 'From'
        message = fd['Body'] || fd['body'];
        from = fd['From'] || fd['from'];
        incoming = fd;
      } catch (fdErr) {
        // Fallback to raw text
        const txt = await req.text();
        console.warn('Failed to parse JSON or form-data; raw text payload:', txt.slice(0,200));
        // Attempt to extract simple key=val pairs from text
        const params = new URLSearchParams(txt);
        if ([...params.keys()].length) {
          const fd: Record<string,string> = {};
          for (const [k,v] of params.entries()) fd[k]=v;
          message = fd['Body'] || fd['body'];
          from = fd['From'] || fd['from'];
          incoming = fd;
        }
      }
    }

    // If JSON payload (likely Meta) — extract fields accordingly
    if (!message && incoming && incoming.entry) {
      try {
        const entry = incoming.entry?.[0];
        const changes = entry?.changes?.[0];
        const messageObj = changes?.value?.messages?.[0];
        message = messageObj?.text?.body || messageObj?.body?.text || messageObj?.text?.body;
        from = messageObj?.from || changes?.value?.metadata?.phone_number_id || from;
        console.log('Extracted Meta-style message/from', { from, message });
      } catch (e) {
        // ignore
      }
    }

    console.log('Webhook resolved to from/message:', { from, message });

    // Validate message data
    if (!message || !from) {
      console.log('No message or sender found in webhook — acknowledging with 200');
      return new NextResponse('', { status: 200 }); // Acknowledge to avoid retries
    }
    console.log(`Processing message from ${from}: "${message}"`);

    // Process message through conversation manager (AI-powered)
    const result = await conversationManager.processMessage(from, message);
    
    console.log(`Generated response: "${result.response}"`);
    
    // Store any confirmed incident
    if (result.incident) {
      try {
        console.log('Storing confirmed incident:', result.incident);
        
        const eventData = {
          type: result.incident.type,
          severity: result.incident.severity,
          location: result.incident.location || 'Location not specified',
          description: result.incident.description,
          timestamp: result.incident.timestamp,
          coordinates: result.incident.location ? extractCoordinates(result.incident.location) : undefined
        };
        
        const storedEvent = await storeEvent(eventData, from, []);
        console.log('Incident stored successfully with ID:', storedEvent.id);
        
      } catch (error) {
        console.error('Failed to store incident:', error);
        // Don't fail the response if storage fails
      }
    }

// Send response via Twilio API
    try {
      const sendParams: any = {
        body: result.response,
        to: from
      };

      // Prefer Messaging Service SID if configured (recommended)
      if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
        sendParams.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
      } else {
        sendParams.from = process.env.TWILIO_WHATSAPP_NUMBER!;
      }

      await client.messages.create(sendParams);

      console.log('Twilio WhatsApp message sent successfully');
      
      // Return empty 200 response (Twilio requirement)
      return new NextResponse('', { status: 200 });

    } catch (error) {
      console.error('Twilio API request failed:', error);
      // Still return 200 to acknowledge receipt
      return new NextResponse('', { status: 200 });
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Return 200 even on error to prevent Twilio retries
    return new NextResponse('', { status: 200 });
  }
}
