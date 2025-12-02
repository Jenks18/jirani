import { NextRequest, NextResponse } from 'next/server';
import { storeEvent } from '../../../lib/eventStorage';
import { extractCoordinates } from '../../../lib/locationUtils';
import conversationManager from '../../../lib/whatsappConversation';
import { webhookRateLimiter } from '../../../lib/rateLimiter';
import twilio from 'twilio';

// Type definitions for better type safety
interface TwilioClient {
  messages: {
    create: (params: {
      body: string;
      to: string;
      from?: string;
      messagingServiceSid?: string;
    }) => Promise<{ sid: string }>;
  };
  validateRequest: (authToken: string, signature: string, url: string, params: Record<string, string>) => boolean;
}

// Production-grade logging utility
function logInfo(message: string, data?: unknown): void {
  console.log(`[WhatsApp Webhook] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

function logError(message: string, error?: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[WhatsApp Webhook ERROR] ${message}`, errorMessage);
}

// Validate Twilio webhook signature for security
function validateTwilioSignature(req: NextRequest, params: Record<string, string>): boolean {
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  if (!twilioAuthToken) {
    logError('TWILIO_AUTH_TOKEN not configured - skipping signature validation');
    return true; // Allow in dev, but log warning
  }

  const signature = req.headers.get('x-twilio-signature');
  if (!signature) {
    logError('Missing X-Twilio-Signature header');
    return false;
  }

  try {
    const url = req.url;
    return twilio.validateRequest(twilioAuthToken, signature, url, params);
  } catch (error) {
    logError('Signature validation failed', error);
    return false;
  }
}

// Twilio WhatsApp webhook handler
export async function GET() {
  // Twilio doesn't use GET for verification - return basic health check
  return NextResponse.json({ 
    status: 'ok', 
    provider: 'Twilio WhatsApp',
    timestamp: new Date().toISOString() 
  });
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    logInfo('=== Twilio WhatsApp Webhook POST Request ===');
    
    // Validate environment configuration
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    let TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;
    const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

    // Normalize WhatsApp number format: Twilio expects 'whatsapp:+<E.164 number>'
    if (TWILIO_WHATSAPP_NUMBER && !TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')) {
      TWILIO_WHATSAPP_NUMBER = `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;
    }

    const twilioConfigured = Boolean(
      TWILIO_ACCOUNT_SID && 
      TWILIO_AUTH_TOKEN && 
      (TWILIO_WHATSAPP_NUMBER || TWILIO_MESSAGING_SERVICE_SID)
    );

    let client: TwilioClient | null = null;
    if (twilioConfigured) {
      client = twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!) as unknown as TwilioClient;
      logInfo('Twilio client instantiated successfully');
    } else {
      logError('Twilio not configured - webhook will process messages but cannot respond');
    }
    
    // Parse incoming webhook payload (supports both form-encoded and JSON)
    let webhookParams: Record<string, string> = {};
    let from: string | undefined;
    let message: string | undefined;
    let messageSid: string | undefined;

    // Try form data first (Twilio's default format)
    try {
      const formData = await req.formData();
      webhookParams = Object.fromEntries(formData.entries() as Iterable<[string, string]>);
      
      // Validate Twilio signature for security
      if (!validateTwilioSignature(req, webhookParams)) {
        logError('Invalid Twilio signature - potential security threat');
        return new NextResponse('Forbidden', { status: 403 });
      }
      
      message = webhookParams['Body'] || webhookParams['body'];
      from = webhookParams['From'] || webhookParams['from'];
      messageSid = webhookParams['MessageSid'] || webhookParams['messageSid'];
      
      logInfo('Parsed form-encoded webhook', { from, messageSid, hasMessage: !!message });
    } catch (formError) {
      // Fallback to JSON parsing (for testing or alternative formats)
      try {
        const jsonBody = await req.json();
        
        // Handle Meta-style JSON format
        if (jsonBody.entry) {
          const entry = jsonBody.entry?.[0];
          const changes = entry?.changes?.[0];
          const messageObj = changes?.value?.messages?.[0];
          message = messageObj?.text?.body || messageObj?.body?.text;
          from = messageObj?.from || changes?.value?.metadata?.phone_number_id;
          logInfo('Parsed Meta-style JSON webhook', { from, hasMessage: !!message });
        } else {
          // Direct JSON format
          message = jsonBody.Body || jsonBody.message;
          from = jsonBody.From || jsonBody.from;
          messageSid = jsonBody.MessageSid;
          webhookParams = jsonBody;
          logInfo('Parsed JSON webhook', { from, messageSid, hasMessage: !!message });
        }
      } catch (jsonError) {
        logError('Failed to parse webhook payload as form-data or JSON', { formError, jsonError });
        return new NextResponse('Bad Request', { status: 400 });
      }
    }

    // Validate required fields
    if (!message || !from) {
      logInfo('Empty message or missing sender - acknowledging webhook');
      return new NextResponse('', { status: 200 }); // Acknowledge to prevent retries
    }

    // Apply rate limiting to prevent abuse
    const rateLimitResult = webhookRateLimiter.checkLimit(from);
    if (!rateLimitResult.allowed) {
      logError('Rate limit exceeded', { 
        from, 
        resetInSeconds: Math.ceil(rateLimitResult.resetIn / 1000) 
      });
      
      // Send rate limit message to user
      if (client) {
        try {
          let toNumber = from;
          if (!toNumber.startsWith('whatsapp:')) {
            toNumber = `whatsapp:${toNumber}`;
          }

          const sendParams: {
            body: string;
            to: string;
            messagingServiceSid?: string;
            from?: string;
          } = {
            body: `Samahani, umezidi kikomo cha ujumbe. Tafadhali subiri sekunde ${Math.ceil(rateLimitResult.resetIn / 1000)} kabla ya kujaribu tena. (Sorry, you've exceeded the message limit. Please wait ${Math.ceil(rateLimitResult.resetIn / 1000)} seconds before trying again.)`,
            to: toNumber
          };

          if (TWILIO_MESSAGING_SERVICE_SID) {
            sendParams.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
          } else if (TWILIO_WHATSAPP_NUMBER) {
            sendParams.from = TWILIO_WHATSAPP_NUMBER;
          }

          await client.messages.create(sendParams);
        } catch (err) {
          logError('Failed to send rate limit message', err);
        }
      }
      
      // Return 200 to prevent Twilio retries
      return new NextResponse('', { status: 200 });
    }

    logInfo('Rate limit check passed', { 
      from, 
      remaining: rateLimitResult.remaining 
    });

    // Sanitize and validate inputs
    message = message.trim();
    if (message.length === 0 || message.length > 4096) {
      logError('Message length invalid', { length: message.length });
      return new NextResponse('', { status: 200 });
    }

    logInfo('Processing message', { 
      from, 
      messageLength: message.length, 
      messageSid,
      preview: message.substring(0, 50) 
    });

    // Process message through AI-powered conversation manager
    let result;
    try {
      result = await conversationManager.processMessage(from, message);
      logInfo('AI response generated', { 
        responseLength: result.response.length,
        hasIncident: !!result.incident 
      });
    } catch (aiError) {
      logError('AI processing failed', aiError);
      // Use fallback response
      result = {
        response: "Samahani, nimepata shida kidogo. Tafadhali jaribu tena baadaye. (Sorry, I encountered an issue. Please try again later.)",
        incident: undefined
      };
    }
    
    // Store confirmed incident in database
    if (result.incident && result.incident.confirmed) {
      try {
        logInfo('Storing confirmed incident', { 
          type: result.incident.type,
          severity: result.incident.severity 
        });
        
        const eventData = {
          type: result.incident.type,
          severity: result.incident.severity,
          location: result.incident.location || 'Location not specified',
          description: result.incident.description,
          timestamp: result.incident.timestamp,
          coordinates: result.incident.location ? extractCoordinates(result.incident.location) : undefined
        };
        
        const storedEvent = await storeEvent(eventData, from, []);
        logInfo('Incident stored successfully', { eventId: storedEvent.id });
        
      } catch (storageError) {
        logError('Failed to store incident - continuing with response', storageError);
        // Don't block webhook response if storage fails
      }
    }

    // Send response via Twilio API
    if (!client) {
      logError('Cannot send response - Twilio client not configured');
      return new NextResponse('', { status: 200 });
    }

    try {
      // Normalize recipient number for WhatsApp format
      let toNumber = from;
      if (!toNumber.startsWith('whatsapp:')) {
        toNumber = `whatsapp:${toNumber}`;
      }

      // Build message parameters
      const sendParams: {
        body: string;
        to: string;
        messagingServiceSid?: string;
        from?: string;
      } = {
        body: result.response,
        to: toNumber
      };

      // Prefer Messaging Service SID (recommended for production)
      if (TWILIO_MESSAGING_SERVICE_SID) {
        sendParams.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
        logInfo('Using Messaging Service SID');
      } else if (TWILIO_WHATSAPP_NUMBER) {
        sendParams.from = TWILIO_WHATSAPP_NUMBER;
        logInfo('Using WhatsApp from number');
      } else {
        logError('No Messaging Service SID or WhatsApp number configured');
        return new NextResponse('', { status: 200 });
      }

      // Retry logic with exponential backoff
      const MAX_RETRIES = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const sentMessage = await client.messages.create(sendParams);
          
          const processingTime = Date.now() - startTime;
          logInfo('Message sent successfully', { 
            attempt,
            messageSid: sentMessage.sid,
            processingTimeMs: processingTime
          });
          
          // Return 200 to acknowledge webhook
          return new NextResponse('', { status: 200 });
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          
          logError(`Send attempt ${attempt} failed`, {
            error: lastError.message,
            attempt,
            willRetry: attempt < MAX_RETRIES
          });

          // Wait before retry with exponential backoff
          if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
          }
        }
      }

      // All retries failed
      logError('All send attempts exhausted', {
        error: lastError?.message,
        attempts: MAX_RETRIES
      });
      
      // Still return 200 to acknowledge webhook and prevent retries
      return new NextResponse('', { status: 200 });

    } catch (error) {
      logError('Unexpected error during message send', error);
      // Return 200 to acknowledge and prevent retries
      return new NextResponse('', { status: 200 });
    }

  } catch (error) {
    logError('Critical webhook processing error', error);
    
    // Always return 200 to acknowledge webhook and prevent retries
    // Twilio will retry on 4xx/5xx which can cause duplicate processing
    return new NextResponse('', { status: 200 });
  }
}
