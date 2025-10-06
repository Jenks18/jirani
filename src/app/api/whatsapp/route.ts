import { NextRequest, NextResponse } from 'next/server';
import { storeEvent } from '../../../lib/eventStorage';
import { extractCoordinates } from '../../../lib/locationUtils';
import { 
  getConversationHistory, 
  addMessageToConversation,
  setPendingConfirmation,
  getPendingConfirmation,
  clearPendingConfirmation
} from '../../../lib/conversationMemory';

// Conversational response generator that understands context
function generateConversationalResponse(message: string, fromPhone: string, conversationHistory: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Don't treat short messages as repeats, and be more selective about repeat detection
  const isActualRepeat = conversationHistory.includes(`user: ${message}`) && 
                        message.length > 15 &&
                        conversationHistory.split(`user: ${message}`).length > 2; // appeared more than once
  
  // Handle actual repeated messages (but not first-time similar content)
  if (isActualRepeat) {
    return "I noticed you sent this same message again. Would you like me to help you with this incident report?";
  }
  
  // Emergency/urgent situations - immediate priority
  if (lowerMessage.includes('emergency') || lowerMessage.includes('help') || lowerMessage.includes('urgent') || 
      lowerMessage.includes('danger') || lowerMessage.includes('911') || lowerMessage.includes('999')) {
    return "🚨 This sounds urgent! Are you safe right now? If you're in immediate danger, please call 999 or 911 first. Once you're safe, I can help you report what happened.";
  }
  
  // Violence/crime with weapons - high priority
  if (lowerMessage.includes('knife') || lowerMessage.includes('gun') || lowerMessage.includes('weapon') || 
      lowerMessage.includes('shot') || lowerMessage.includes('stabbed') || lowerMessage.includes('attacked')) {
    return "Oh my goodness, that sounds terrifying! First - are you hurt? Do you need medical attention? I'm here to listen and help you report this. Can you tell me where this happened?";
  }
  
  // Detailed incident reports - check for specific incident details
  const hasTimeDetail = lowerMessage.includes('6:00') || lowerMessage.includes('7:00') || lowerMessage.includes('8:00') || 
                       lowerMessage.includes('am') || lowerMessage.includes('pm') || lowerMessage.includes('morning') || 
                       lowerMessage.includes('evening') || lowerMessage.includes('afternoon');
  
  const hasLocationDetail = lowerMessage.includes('westland') || lowerMessage.includes('aga khan') || 
                           lowerMessage.includes('mall') || lowerMessage.includes('road') || 
                           lowerMessage.includes('near') || lowerMessage.includes('at ');
  
  const hasIncidentDetail = lowerMessage.includes('walking') || lowerMessage.includes('bike') || 
                           lowerMessage.includes('plate') || lowerMessage.includes('shirt') || 
                           lowerMessage.includes('wearing') || lowerMessage.includes('took') ||
                           lowerMessage.includes('stole') || lowerMessage.includes('got on');
  
  // If they're providing detailed incident information
  if ((hasTimeDetail && hasLocationDetail) || (hasLocationDetail && hasIncidentDetail) || 
      (lowerMessage.includes('knife') && hasLocationDetail)) {
    return "Thank you for sharing those details with me. That sounds really frightening, and I'm so sorry this happened to you. Are you safe now? Would you like me to officially record this incident so it can be reported to the authorities? Just reply 'yes' to confirm or 'no' if you'd prefer not to.";
  }
  
  // General theft/robbery/crime - empathetic response
  if (lowerMessage.includes('stole') || lowerMessage.includes('theft') || lowerMessage.includes('robbery') || 
      lowerMessage.includes('mugged') || lowerMessage.includes('stolen') || lowerMessage.includes('robbed')) {
    return "I'm so sorry to hear you experienced this. That must have been really frightening. Can you tell me a bit more about what happened? When and where did this occur?";
  }
  
  // Simple greetings
  if (lowerMessage === 'hi' || lowerMessage === 'hello' || lowerMessage === 'hey') {
    const greetings = [
      "Hi there! How can I help you today?",
      "Hello! I'm Jirani, here to help with community safety. What's going on?",
      "Hey! Thanks for reaching out. Is everything okay?"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  // Follow-up messages like "hi", "something happened"
  if (lowerMessage === 'something happened' || lowerMessage.includes('something happened')) {
    return "I'm here to listen. What happened? Take your time - you can tell me as much or as little as you're comfortable sharing.";
  }
  
  // Very short messages that might be testing
  if (lowerMessage.length < 4) {
    return "I'm here! What's going on? You can tell me about anything that's happened or if you need help with something.";
  }
  
  // Questions about what the bot does
  if (lowerMessage.includes('what') && (lowerMessage.includes('do') || lowerMessage.includes('help'))) {
    return "I help people report safety incidents in their communities. If something's happened to you or you've witnessed something concerning, I can help you record it and get the information to the right people. What's on your mind?";
  }
  
  // If message seems like they're starting to describe an incident
  if (lowerMessage.includes('was walking') || lowerMessage.includes('happened') || lowerMessage.includes('saw') ||
      lowerMessage.includes('witnessed') || lowerMessage.includes('occurred')) {
    return "I'm listening. Please go ahead and tell me what happened. Don't worry about getting everything perfect - just share what you remember.";
  }
  
  // Default conversational response
  const defaultResponses = [
    "I'm here to help! Can you tell me more about what's going on?",
    "Thanks for reaching out. What would you like to talk about?",
    "I'm listening. How can I help you today?",
    "Hi! Is there something you'd like to report or discuss?"
  ];
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
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

    // Check for images/media
    const images: string[] = [];
    if (messageObj?.image) {
      images.push(messageObj.image.id);
      console.log(`Received image from ${from}: ${messageObj.image.id}`);
    }

    // Handle media-only messages (images without text)
    if (!message && images.length === 0) {
      return NextResponse.json({ status: 'No message or media to process' });
    }

    const messageText = message || '[Image shared]';
    console.log(`Received from ${from}: ${messageText}${images.length > 0 ? ` (with ${images.length} image(s))` : ''}`);

    // Add message to conversation history
    addMessageToConversation(from, 'user', messageText);

    // Get conversation history for context
    const conversationHistory = getConversationHistory(from);

    // Initialize response variables  
    let replyMessage = generateConversationalResponse(messageText, from, conversationHistory);
    let storedEvent = null;

    // Check if user is confirming a pending report
    const pendingConfirmation = getPendingConfirmation(from);
    if (pendingConfirmation && (messageText.toLowerCase().includes('yes') || messageText.toLowerCase().includes('confirm') || messageText.toLowerCase().trim() === 'yes')) {
      // User confirmed - store the event
      const eventData = {
        type: pendingConfirmation.type,
        severity: 3, // Default severity
        location: pendingConfirmation.location,
        description: pendingConfirmation.description,
        timestamp: pendingConfirmation.timestamp,
        coordinates: extractCoordinates(pendingConfirmation.location)
      };
      
      storedEvent = await storeEvent(eventData, from, images);
      clearPendingConfirmation(from);
      
      replyMessage = "Thank you for confirming! I've recorded this incident. Stay safe, and don't hesitate to reach out if you need anything else.";
      addMessageToConversation(from, 'assistant', replyMessage);
      
      console.log('Confirmation processed, event stored:', storedEvent.id);
      
    } else if (pendingConfirmation && (messageText.toLowerCase().includes('no') || messageText.toLowerCase().includes('cancel'))) {
      // User declined
      clearPendingConfirmation(from);
      replyMessage = "No problem! I won't record anything. Is there anything else I can help you with?";
      addMessageToConversation(from, 'assistant', replyMessage);
      
      console.log('Confirmation declined');
      
    } else {
      // Normal processing - try to enhance with LLM if available
      console.log('Processing normal message (not a confirmation)');
      
      // Check if the message contains incident details and set up for confirmation
      const lowerMessage = messageText.toLowerCase();
      
      // Enhanced incident detection
      const hasTimeDetail = lowerMessage.includes('6:00') || lowerMessage.includes('7:00') || lowerMessage.includes('8:00') || 
                           lowerMessage.includes('am') || lowerMessage.includes('pm') || lowerMessage.includes('morning') || 
                           lowerMessage.includes('evening') || lowerMessage.includes('afternoon');
      
      const hasLocationDetail = lowerMessage.includes('westland') || lowerMessage.includes('aga khan') || 
                               lowerMessage.includes('mall') || lowerMessage.includes('road') || 
                               lowerMessage.includes('near') || lowerMessage.includes('at ');
      
      const hasIncidentDetail = lowerMessage.includes('walking') || lowerMessage.includes('bike') || 
                               lowerMessage.includes('plate') || lowerMessage.includes('shirt') || 
                               lowerMessage.includes('wearing') || lowerMessage.includes('took') ||
                               lowerMessage.includes('stole') || lowerMessage.includes('got on') ||
                               lowerMessage.includes('knife') || lowerMessage.includes('theft');
      
      // If message contains detailed incident information, set up pending confirmation
      if ((hasTimeDetail && hasLocationDetail) || (hasLocationDetail && hasIncidentDetail) || 
          (lowerMessage.includes('knife') && hasLocationDetail) || 
          (lowerMessage.includes('stole') && lowerMessage.length > 30)) {
        
        const incidentDetails = {
          type: lowerMessage.includes('knife') ? 'Armed Theft/Robbery' : 
                lowerMessage.includes('theft') || lowerMessage.includes('stole') ? 'Theft/Robbery' : 
                'Incident',
          location: lowerMessage.includes('westland') ? 'Westlands, near Aga Khan' : 
                   lowerMessage.includes('mall') ? 'Near shopping mall' :
                   'Location described in message',
          description: messageText,
          timestamp: new Date().toISOString()
        };
        
        setPendingConfirmation(from, incidentDetails);
        console.log('Set pending confirmation for detailed incident');
      }
      
      try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // Get conversation history for context
      const conversationHistory = getConversationHistory(from);
      const promptWithContext = `CONVERSATION HISTORY:\n${conversationHistory}\n\nCURRENT MESSAGE: ${messageText}`;
      
      const llmResponse = await fetch(`${baseUrl}/api/process-llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: promptWithContext,
          provider: 'gemini'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (llmResponse.ok) {
        const llmData = await llmResponse.json();
        console.log('LLM Raw Response:', JSON.stringify(llmData, null, 2));
        
        // Check if LLM returned structured event data
        if (llmData.result && typeof llmData.result === 'object') {
          if (llmData.result.confirmation) {
            // LLM wants to confirm an incident before storing
            console.log('Setting pending confirmation:', llmData.result.confirmation);
            setPendingConfirmation(from, llmData.result.confirmation);
            if (llmData.result.reply) {
              replyMessage = llmData.result.reply;
              console.log('Using confirmation reply:', replyMessage);
              addMessageToConversation(from, 'assistant', replyMessage);
            }
          } else if (llmData.result.event) {
            // Enhance event with location coordinates
            const eventData = { ...llmData.result.event };
            if (eventData.location) {
              const coordinates = extractCoordinates(eventData.location);
              if (coordinates) {
                eventData.coordinates = coordinates;
                console.log(`Added coordinates ${coordinates} for location: ${eventData.location}`);
              }
            }
            
            // Store the confirmed event
            storedEvent = await storeEvent(eventData, from, images);
            console.log('Event stored with ID:', storedEvent.id);
          }
          
          if (llmData.result.reply) {
            replyMessage = llmData.result.reply;
            console.log('Enhanced response with Gemini AI');
            // Add AI response to conversation history
            addMessageToConversation(from, 'assistant', replyMessage);
          }
        } else if (typeof llmData.result === 'string' && llmData.result.length > 0) {
          // Handle cases where LLM returns a string that might contain JSON
          const replyText = llmData.result;
          
          // Check if the string contains JSON that we need to parse
          if (replyText.includes('```json') || (replyText.includes('"confirmation"') && replyText.includes('"reply"'))) {
            try {
              // Clean up markdown formatting and extract JSON more robustly
              let cleanedText = replyText.trim();
              
              // Remove markdown code blocks
              if (cleanedText.includes('```json')) {
                const jsonMatch = cleanedText.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                  cleanedText = jsonMatch[1];
                }
              } else if (cleanedText.includes('```')) {
                const codeMatch = cleanedText.match(/```\s*([\s\S]*?)\s*```/);
                if (codeMatch) {
                  cleanedText = codeMatch[1];
                }
              }
              
              // Find JSON object boundaries more carefully
              const jsonStart = cleanedText.indexOf('{');
              const jsonEnd = cleanedText.lastIndexOf('}') + 1;
              if (jsonStart !== -1 && jsonEnd > jsonStart) {
                cleanedText = cleanedText.substring(jsonStart, jsonEnd);
              }
              
              // Remove any trailing commas or comments
              cleanedText = cleanedText.replace(/,(\s*[}\]])/g, '$1').replace(/\/\/.*$/gm, '');
              
              console.log('Cleaned text for parsing:', cleanedText);
              
              // Try to parse as JSON
              const parsedData = JSON.parse(cleanedText);
              
              if (parsedData.confirmation) {
                // Handle confirmation request
                console.log('Parsed confirmation from string response:', parsedData.confirmation);
                setPendingConfirmation(from, parsedData.confirmation);
                replyMessage = parsedData.reply || 'Please confirm if this information is correct by saying "yes" or "no".';
                console.log('Using parsed confirmation reply:', replyMessage);
                addMessageToConversation(from, 'assistant', replyMessage);
              } else if (parsedData.event) {
                // Handle event creation
                console.log('Parsed event from string response:', parsedData.event);
                const eventData = { ...parsedData.event };
                if (eventData.location) {
                  const coordinates = extractCoordinates(eventData.location);
                  if (coordinates) {
                    eventData.coordinates = coordinates;
                    console.log(`Added coordinates ${coordinates} for location: ${eventData.location}`);
                  }
                }
                
                // Store the confirmed event
                storedEvent = await storeEvent(eventData, from, images);
                console.log('Event stored with ID:', storedEvent.id);
                replyMessage = parsedData.reply || 'Thank you! I have recorded this incident.';
                addMessageToConversation(from, 'assistant', replyMessage);
              } else {
                // Just a regular reply
                replyMessage = parsedData.reply || 'I understand. How can I help you with safety-related questions or reporting?';
                console.log('Enhanced response with Gemini AI');
                addMessageToConversation(from, 'assistant', replyMessage);
              }
            } catch (parseError) {
              // If JSON parsing fails, try to extract reply from the text manually
              console.log('Failed to parse JSON from string response, trying manual extraction:', parseError);
              
              // Try to extract just the reply field from the malformed JSON
              const replyMatch = replyText.match(/"reply"\s*:\s*"([^"]+)"/);
              if (replyMatch) {
                replyMessage = replyMatch[1];
                console.log('Extracted reply manually:', replyMessage);
              } else {
                // Last resort - use a safe fallback message
                replyMessage = 'I understand. How can I help you with safety-related questions or reporting?';
                console.log('Using fallback message due to parsing failure');
              }
              addMessageToConversation(from, 'assistant', replyMessage);
            }
          } else {
            // Regular string response
            replyMessage = replyText;
            console.log('Enhanced response with Gemini AI');
            addMessageToConversation(from, 'assistant', replyMessage);
          }
        }
      } else {
        console.log('LLM API unavailable, using simple response');
        // Add simple response to conversation history as fallback
        addMessageToConversation(from, 'assistant', replyMessage);
      }
    } catch (error) {
      console.log('LLM enhancement failed, using simple response:', error instanceof Error ? error.message : 'Unknown error');
      // Add simple response to conversation history on error
      addMessageToConversation(from, 'assistant', replyMessage);
    }
    } // End normal processing block

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
      messageSent: !!process.env.WHATSAPP_ACCESS_TOKEN,
      eventStored: !!storedEvent,
      eventId: storedEvent?.id || null,
      imagesReceived: images.length
    });

  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}
