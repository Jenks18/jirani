import { NextRequest, NextResponse } from 'next/server';
import conversationManager from '../../../../lib/whatsappConversation';
import { testEndpointRateLimiter } from '../../../../lib/rateLimiter';
import twilio from 'twilio';

/**
 * Test endpoint for verifying the Groq AI pipeline and Twilio messaging
 * without requiring an actual incoming webhook.
 * 
 * POST JSON body:
 * {
 *   "to": "+1234567890",      // E.164 format phone number
 *   "message": "test message", // Message to process
 *   "send": true              // Optional: actually send via Twilio
 * }
 * 
 * Features:
 * - Tests AI conversation flow
 * - Optionally sends response via Twilio
 * - Returns AI response and incident detection info
 * - Prefers Messaging Service SID over direct number
 */

interface TestRequestBody {
  to?: string;
  phone?: string;
  message?: string;
  msg?: string;
  send?: boolean;
}

interface TestResponsePayload {
  response: string;
  incident?: unknown;
  twilio?: {
    sent: boolean;
    sid?: string;
    reason?: string;
    error?: string;
  };
  processingTimeMs?: number;
}

interface TwilioClient {
  messages: {
    create: (params: {
      body: string;
      to: string;
      from?: string;
      messagingServiceSid?: string;
    }) => Promise<{ sid?: string }>;
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

function logInfo(message: string, data?: unknown): void {
  console.log(`[WhatsApp Test] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

function logError(message: string, error?: unknown): void {
  console.error(`[WhatsApp Test ERROR] ${message}`, getErrorMessage(error));
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse and validate request body
    let body: TestRequestBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Extract parameters with flexible field names
    const to = body.to || body.phone;
    const message = body.message || body.msg;
    const doSend = Boolean(body.send);

    // Validate required fields
    if (!to || typeof to !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "to" field (phone number)' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "message" field' },
        { status: 400 }
      );
    }

    // Validate phone number format (basic E.164 check)
    if (!to.match(/^\+?[1-9]\d{1,14}$/)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)' },
        { status: 400 }
      );
    }

    logInfo('Test request received', { to, messageLength: message.length, doSend });

    // Apply rate limiting for test endpoint
    const rateLimitResult = testEndpointRateLimiter.checkLimit(to);
    if (!rateLimitResult.allowed) {
      logError('Rate limit exceeded for test endpoint', { 
        to, 
        resetInSeconds: Math.ceil(rateLimitResult.resetIn / 1000) 
      });
      
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          resetInSeconds: Math.ceil(rateLimitResult.resetIn / 1000),
          message: 'Too many test requests. Please wait before trying again.'
        },
        { status: 429 }
      );
    }

    // Process message through AI conversation manager
    let result;
    try {
      result = await conversationManager.processMessage(to, message);
      logInfo('AI response generated', { 
        responseLength: result.response.length,
        hasIncident: !!result.incident 
      });
    } catch (aiError) {
      logError('AI processing failed', aiError);
      return NextResponse.json(
        { error: 'AI processing failed', details: getErrorMessage(aiError) },
        { status: 500 }
      );
    }

    // Prepare response payload
    const payload: TestResponsePayload = {
      response: result.response,
      incident: result.incident,
      processingTimeMs: Date.now() - startTime
    };

    // Send via Twilio if requested
    if (doSend) {
      const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
      const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
      const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;
      let TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

      // Normalize WhatsApp number format
      if (TWILIO_WHATSAPP_NUMBER && !TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')) {
        TWILIO_WHATSAPP_NUMBER = `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;
      }

      const twilioConfigured = Boolean(
        TWILIO_ACCOUNT_SID && 
        TWILIO_AUTH_TOKEN && 
        (TWILIO_MESSAGING_SERVICE_SID || TWILIO_WHATSAPP_NUMBER)
      );

      if (!twilioConfigured) {
        payload.twilio = { 
          sent: false, 
          reason: 'Twilio credentials not configured in environment variables' 
        };
        logError('Twilio not configured');
        return NextResponse.json(payload);
      }

      try {
        const client = twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!) as unknown as TwilioClient;

        // Normalize recipient number for WhatsApp
        let toNumber = to;
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

        // Prefer Messaging Service SID (recommended)
        if (TWILIO_MESSAGING_SERVICE_SID) {
          sendParams.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
          logInfo('Using Messaging Service SID');
        } else if (TWILIO_WHATSAPP_NUMBER) {
          sendParams.from = TWILIO_WHATSAPP_NUMBER;
          logInfo('Using WhatsApp from number');
        } else {
          payload.twilio = { 
            sent: false, 
            reason: 'No Messaging Service SID or WhatsApp number configured' 
          };
          return NextResponse.json(payload);
        }

        // Send message
        const sent = await client.messages.create(sendParams);
        payload.twilio = { 
          sent: true, 
          sid: sent.sid 
        };
        
        logInfo('Message sent successfully', { sid: sent.sid });

      } catch (twilioError) {
        logError('Twilio send failed', twilioError);
        payload.twilio = { 
          sent: false, 
          error: getErrorMessage(twilioError) 
        };
      }
    }

    payload.processingTimeMs = Date.now() - startTime;
    return NextResponse.json(payload);

  } catch (error) {
    logError('Test endpoint error', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: getErrorMessage(error) 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/whatsapp/test',
    method: 'POST',
    description: 'Test endpoint for Groq AI + Twilio integration',
    usage: {
      body: {
        to: 'Phone number in E.164 format (e.g., +1234567890)',
        message: 'Message to process through AI',
        send: 'Optional: true to actually send via Twilio'
      },
      example: {
        to: '+1234567890',
        message: 'Somebody robbed me near Westland',
        send: false
      }
    },
    timestamp: new Date().toISOString()
  });
}
