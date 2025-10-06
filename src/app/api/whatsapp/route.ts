import { NextRequest, NextResponse } from 'next/server';
import { storeEvent } from '../../../lib/eventStorage';
import { extractCoordinates } from '../../../lib/locationUtils';
import conversationManager from '../../../lib/whatsappConversation';

// WhatsApp Cloud API webhook handler
export async function GET(req: NextRequest) {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  const searchParams = req.nextUrl.searchParams;
  
  // Verification handshake
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
  
  if (!VERIFY_TOKEN) {
    console.error('WHATSAPP_VERIFY_TOKEN not configured');
    return new Response('Server configuration error', { status: 500 });
  }
  
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    return new Response(challenge, { status: 200 });
  } else {
    console.error('Webhook verification failed');
    return new Response('Forbidden', { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('=== WhatsApp Webhook POST Request ===');
    
    // Validate required environment variables
    const requiredEnvVars = {
      WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
      WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    };
    
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        console.error(`Missing required environment variable: ${key}`);
        return NextResponse.json({ error: `${key} not configured` }, { status: 500 });
      }
    }
    
    // Parse webhook body
    const body = await req.json();
    console.log('Raw webhook body:', JSON.stringify(body, null, 2));
    
    // Extract message data
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messageObj = changes?.value?.messages?.[0];
    const message = messageObj?.text?.body;
    const from = messageObj?.from;

    // Validate message data
    if (!message || !from) {
      console.log('No message or sender found in webhook');
      return NextResponse.json({ status: 'No message to process' });
    }

    console.log(`Processing message from ${from}: "${message}"`);

    // Process message through conversation manager
    const result = conversationManager.processMessage(from, message);
    
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
    
    // Send response via WhatsApp API
    try {
      const whatsappResponse = await fetch(
        `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: from,
            text: { body: result.response }
          })
        }
      );

      if (!whatsappResponse.ok) {
        const errorText = await whatsappResponse.text();
        console.error('WhatsApp API error:', errorText);
        return NextResponse.json({ 
          error: 'Failed to send WhatsApp message',
          details: errorText 
        }, { status: 500 });
      }

      console.log('WhatsApp message sent successfully');
      
      return NextResponse.json({ 
        status: 'Message processed successfully',
        messageProcessed: true,
        incidentStored: !!result.incident
      });

    } catch (error) {
      console.error('WhatsApp API request failed:', error);
      return NextResponse.json({ 
        error: 'Failed to send WhatsApp message',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
