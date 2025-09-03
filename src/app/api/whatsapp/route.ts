import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// WhatsApp Cloud API webhook handler
export async function GET(req: NextRequest) {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  const searchParams = req.nextUrl.searchParams;
  
  // Verification handshake - using exact parameter names from WhatsApp docs
  const mode = searchParams.get('hub.mode');
  const challenge = searchParams.get('hub.challenge');
  const token = searchParams.get('hub.verify_token');
  
  console.log('Webhook verification attempt:', {
    'hub.mode': mode,
    'hub.challenge': challenge,
    'hub.verify_token': token,
    expectedToken: VERIFY_TOKEN,
    hasEnvToken: !!VERIFY_TOKEN
  });
  
  // Make sure we have a verify token configured
  if (!VERIFY_TOKEN) {
    console.error('WHATSAPP_VERIFY_TOKEN not configured');
    return new Response('Server configuration error', { status: 500 });
  }
  
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK VERIFIED');
    return new Response(challenge, { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  } else {
    console.error('Webhook verification failed:', {
      mode,
      token,
      expectedToken: VERIFY_TOKEN,
      modeMatch: mode === 'subscribe',
      tokenMatch: token === VERIFY_TOKEN
    });
    return new Response('Forbidden', { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messagesPath = path.join(process.cwd(), 'data', 'messages.json');
    const eventsPath = path.join(process.cwd(), 'data', 'events.json');

    // WhatsApp Cloud API payload structure
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messageObj = changes?.value?.messages?.[0];
    const message = messageObj?.text?.body;
    const from = messageObj?.from;
    const timestamp = messageObj?.timestamp || Date.now().toString();

    if (!message) {
      return NextResponse.json({ status: 'No message to process' });
    }

    console.log(`Received message from ${from}: ${message}`);

    // Log message to messages.json
    let messages = [];
    try {
      const data = await fs.readFile(messagesPath, 'utf8');
      messages = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is empty, start with empty array
      console.log('Creating new messages.json file:', error);
    }
    
    messages.push({ from, message, timestamp, receivedAt: new Date().toISOString() });
    await fs.writeFile(messagesPath, JSON.stringify(messages, null, 2));

    // Forward to LLM API
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    const llmResponse = await fetch(`${baseUrl}/api/process-llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: message,
        provider: process.env.LLM_PROVIDER || 'openai'
      })
    });

    if (!llmResponse.ok) {
      throw new Error(`LLM API error: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    console.log('LLM Response:', llmData);

    // Extract event data from LLM result and store in events.json
    if (llmData.result && typeof llmData.result === 'object' && llmData.result.event) {
      let events = [];
      try {
        const eventsData = await fs.readFile(eventsPath, 'utf8');
        events = JSON.parse(eventsData);
      } catch (error) {
        console.log('Creating new events.json file:', error);
      }
      
      events.push({ 
        ...llmData.result.event, 
        from, 
        timestamp,
        createdAt: new Date().toISOString()
      });
      await fs.writeFile(eventsPath, JSON.stringify(events, null, 2));
      
      console.log('Event stored:', llmData.result.event);
    }

    // Send response back to WhatsApp user
    const replyMessage = typeof llmData.result === 'object' && llmData.result.reply 
      ? llmData.result.reply 
      : llmData.result;

    if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      try {
        const whatsappResponse = await fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: from,
            text: { body: replyMessage }
          })
        });

        if (!whatsappResponse.ok) {
          console.error('Failed to send WhatsApp response:', await whatsappResponse.text());
        } else {
          console.log('WhatsApp response sent successfully');
        }
      } catch (error) {
        console.error('Error sending WhatsApp response:', error);
      }
    } else {
      console.log('WhatsApp credentials not configured - response not sent');
    }

    return NextResponse.json({ 
      status: 'success',
      reply: llmData.result, 
      to: from,
      messageSent: !!process.env.WHATSAPP_ACCESS_TOKEN
    });

  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}
