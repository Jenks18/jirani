import { NextRequest, NextResponse } from 'next/server';

// Simple response generator for immediate replies
function generateSimpleResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Emergency/help keywords - immediate action
  if (lowerMessage.includes('emergency') || lowerMessage.includes('help') || lowerMessage.includes('urgent') || 
      lowerMessage.includes('danger') || lowerMessage.includes('911') || lowerMessage.includes('999')) {
    return "🚨 I understand this is urgent! If you're in immediate danger, please contact emergency services at 999 or 911 right away. Once you're safe, I'm here to help you report what happened. Please share your location and what's happening.";
  }
  
  // Crime-related keywords - helpful but not pushy
  if (lowerMessage.includes('theft') || lowerMessage.includes('robbery') || lowerMessage.includes('stolen') || 
      lowerMessage.includes('mugged') || lowerMessage.includes('pickpocket')) {
    return "I'm sorry this happened to you. If you'd like to report this incident, I can help. Could you tell me where this occurred and any other details you're comfortable sharing?";
  }
  
  if (lowerMessage.includes('violence') || lowerMessage.includes('fight') || lowerMessage.includes('attack') || 
      lowerMessage.includes('assault') || lowerMessage.includes('beaten')) {
    return "I'm really sorry to hear about this. Your safety is the priority. If you need medical attention, please get help first. When you're ready, I can help you report what happened.";
  }
  
  // Greetings - warm and friendly
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') || lowerMessage.includes('hola')) {
    return "Hello! 👋 I'm Jirani, your friendly safety assistant for Kenya. I'm here to chat and help with anything safety-related. How are you doing today?";
  }
  
  // Casual conversation starters
  if (lowerMessage.includes('how are you') || lowerMessage.includes('whats up') || lowerMessage.includes('what\'s up')) {
    return "I'm doing well, thank you! I'm here to help keep our communities safer. Is everything okay with you today?";
  }
  
  // Location/area safety queries
  if (lowerMessage.includes('safe') && (lowerMessage.includes('area') || lowerMessage.includes('neighborhood') || lowerMessage.includes('place'))) {
    return "I can help you with safety information for your area! Which location or neighborhood are you asking about?";
  }
  
  // General questions
  if (lowerMessage.includes('what') && lowerMessage.includes('do')) {
    return "I help people in Kenya report safety incidents and get information about their communities. You can ask me about safety in your area, report incidents, or just chat! What would you like to know?";
  }
  
  // Default response - friendly and open
  return "Thanks for reaching out! 😊 I'm here to help with safety-related questions or if you need to report anything. Feel free to tell me what's on your mind - we can just chat or I can help with something specific.";
}

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

    // WhatsApp Cloud API payload structure
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messageObj = changes?.value?.messages?.[0];
    const message = messageObj?.text?.body;
    const from = messageObj?.from;

    if (!message) {
      return NextResponse.json({ status: 'No message to process' });
    }

    console.log(`Received message from ${from}: ${message}`);

    // Create a simple AI response without external API calls for now
    let replyMessage = generateSimpleResponse(message);

    // Try to enhance with LLM if available
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const llmResponse = await fetch(`${baseUrl}/api/process-llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: message,
          provider: 'gemini'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (llmResponse.ok) {
        const llmData = await llmResponse.json();
        const llmReply = typeof llmData.result === 'object' && llmData.result.reply 
          ? llmData.result.reply 
          : llmData.result;
        
        if (llmReply && typeof llmReply === 'string' && llmReply.length > 0) {
          replyMessage = llmReply;
          console.log('Enhanced response with Gemini AI');
        }
      } else {
        console.log('LLM API unavailable, using simple response');
      }
    } catch (error) {
      console.log('LLM enhancement failed, using simple response:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Send response back to WhatsApp user
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
      reply: replyMessage, 
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
