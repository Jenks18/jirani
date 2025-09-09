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
      lowerMessage.includes('assault') || lowerMessage.includes('beaten') || lowerMessage.includes('shot') || 
      lowerMessage.includes('shooting') || lowerMessage.includes('stabbed') || lowerMessage.includes('knife')) {
    return "I'm really sorry to hear about this. Your safety is the priority. If you need medical attention, please get help first. When you're ready, I can help you report what happened.";
  }

  // Serious crimes - carjacking, armed robbery, etc.
  if (lowerMessage.includes('carjacking') || lowerMessage.includes('carjacked') || lowerMessage.includes('hijacked') ||
      lowerMessage.includes('armed robbery') || lowerMessage.includes('gunpoint') || lowerMessage.includes('weapon') ||
      lowerMessage.includes('gun') || lowerMessage.includes('pistol')) {
    return "That sounds terrifying. Are you safe now? I can help you report this incident. Please tell me where and when this happened.";
  }
  
  // Greetings - warm and friendly
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') || lowerMessage.includes('hola')) {
    return "Hello! 👋 I'm Jirani. How are you doing today?";
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

    // Initialize response variables
    let replyMessage = generateSimpleResponse(messageText);
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
