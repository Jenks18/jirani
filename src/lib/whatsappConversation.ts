// Robust WhatsApp Conversation Management System with Supabase persistence
import { supabase } from './supabaseClient';

interface Message {
  id: string;
  timestamp: Date;
  role: 'user' | 'assistant';
  content: string;
}

interface IncidentReport {
  type: string;
  description: string;
  location?: string;
  coordinates?: [number, number]; // Direct coordinates from location pin
  timestamp: string;
  severity: number;
  confirmed: boolean;
}

interface ConversationState {
  userId: string;
  messages: Message[];
  currentIncident?: IncidentReport;
  awaitingConfirmation: boolean;
  conversationPhase: 'greeting' | 'collecting' | 'confirming' | 'completed';
  lastActivity: Date;
}

class WhatsAppConversationManager {
  private conversations = new Map<string, ConversationState>();
  private readonly MAX_MESSAGES = 50;
  private readonly CONVERSATION_TIMEOUT = 60 * 60 * 1000;

  constructor() {
    // Note: setInterval doesn't work reliably in serverless, rely on per-request cleanup
  }

  private async loadFromSupabase(userId: string): Promise<ConversationState | null> {
    if (!supabase) {
      console.error('❌ Supabase client not available');
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Not found
          return null;
        }
        console.error('❌ Error loading conversation from Supabase:', error);
        return null;
      }

      if (!data) return null;

      // Parse the stored data
      return {
        userId: data.user_id,
        messages: data.messages || [],
        currentIncident: data.current_incident,
        awaitingConfirmation: data.awaiting_confirmation || false,
        conversationPhase: data.conversation_phase || 'greeting',
        lastActivity: new Date(data.last_activity)
      };
    } catch (error) {
      console.error('❌ Exception loading conversation:', error);
      return null;
    }
  }

  private async saveToSupabase(conversation: ConversationState): Promise<void> {
    if (!supabase) {
      console.error('❌❌❌ CRITICAL: Supabase client is NULL - cannot save conversation!');
      console.error('Check env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return;
    }
    
    try {
      console.log(`💾 Attempting to save conversation for ${conversation.userId}...`);
      console.log('📊 Data to save:', {
        user_id: conversation.userId,
        messageCount: conversation.messages.length,
        hasIncident: !!conversation.currentIncident,
        incidentConfirmed: conversation.currentIncident?.confirmed,
        awaitingConfirmation: conversation.awaitingConfirmation,
        phase: conversation.conversationPhase
      });
      
      const { data, error } = await supabase
        .from('conversations')
        .upsert({
          user_id: conversation.userId,
          messages: conversation.messages,
          current_incident: conversation.currentIncident,
          awaiting_confirmation: conversation.awaitingConfirmation,
          conversation_phase: conversation.conversationPhase,
          last_activity: conversation.lastActivity.toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select();

      if (error) {
        console.error('❌❌❌ SAVE FAILED - Supabase error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
      } else {
        console.log('✅✅✅ Conversation SAVED successfully to Supabase!');
        console.log('Saved data:', data);
      }
    } catch (error) {
      console.error('❌❌❌ EXCEPTION during save:', error);
      console.error('Error type:', typeof error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    }
  }

  private generateMessageId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private async getConversation(userId: string): Promise<ConversationState> {
    // Check memory cache first
    if (this.conversations.has(userId)) {
      const conversation = this.conversations.get(userId)!;
      conversation.lastActivity = new Date();
      return conversation;
    }

    // Try to load from Supabase
    console.log('🔍 Loading conversation from Supabase for', userId);
    const stored = await this.loadFromSupabase(userId);
    
    if (stored) {
      console.log('✅ Found existing conversation:', {
        phase: stored.conversationPhase,
        hasIncident: !!stored.currentIncident,
        awaitingConfirmation: stored.awaitingConfirmation,
        messageCount: stored.messages.length
      });
      this.conversations.set(userId, stored);
      stored.lastActivity = new Date();
      return stored;
    }

    // Create new conversation
    console.log('🆕 Creating new conversation for', userId);
    const newConversation: ConversationState = {
      userId,
      messages: [],
      awaitingConfirmation: false,
      conversationPhase: 'greeting',
      lastActivity: new Date()
    };
    
    this.conversations.set(userId, newConversation);
    return newConversation;
  }

  private async addMessage(userId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    const conversation = await this.getConversation(userId);
    const message: Message = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      role,
      content
    };

    conversation.messages.push(message);

    // Keep conversation window manageable
    if (conversation.messages.length > this.MAX_MESSAGES) {
      conversation.messages = conversation.messages.slice(-this.MAX_MESSAGES);
    }
    
    // Save to Supabase
    await this.saveToSupabase(conversation);
  }

  private async detectIncident(message: string): Promise<IncidentReport | null> {
    try {
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      if (!GROQ_API_KEY) {
        console.log('⚠️ No GROQ_API_KEY');
        return null;
      }

      console.log('🔍 Analyzing message for incident with Groq Compound...');

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'groq/compound',
          messages: [{
            role: 'user',
            content: `Analyze this message: "${message}"

Is this a safety incident (crime, theft, assault, etc)?
If YES: Extract the EXACT FULL location name as stated (e.g., "Thika Road Mall", "Sarit Centre", "Junction Mall"), incident type (Theft/Robbery/Assault/Harassment/Other), and severity (1-5).
If NO: Just say "NOT_INCIDENT"

IMPORTANT: Keep the complete location name - do NOT shorten "Thika Road Mall" to "Thika Road" or "Sarit Centre" to "Sarit".

Reply in this EXACT format:
INCIDENT|Theft|Thika Road Mall|4
OR
NOT_INCIDENT`
          }],
          temperature: 0.3,
          max_tokens: 100
        })
      });

      if (!response.ok) {
        console.error('❌ Groq API error:', response.status);
        return null;
      }

      const data = await response.json();
      const aiText = data.choices?.[0]?.message?.content?.trim();
      
      console.log('🤖 Groq response:', aiText);

      if (!aiText || aiText.includes('NOT_INCIDENT')) {
        console.log('❌ Not an incident');
        return null;
      }

      // Extract the pipe-separated line from potentially verbose response
      const lines = aiText.split('\n');
      const incidentLine = lines.find((line: string) => line.trim().startsWith('INCIDENT|'));
      
      if (!incidentLine) {
        console.log('❌ No INCIDENT line found in response');
        return null;
      }

      // Parse the response: INCIDENT|Type|Location|Severity
      const parts = incidentLine.trim().split('|');
      if (parts[0] !== 'INCIDENT' || parts.length < 4) {
        console.log('❌ Invalid response format');
        return null;
      }

      const type = parts[1] || 'General Incident';
      const location = parts[2] !== 'null' && parts[2] ? parts[2] : undefined;
      const severity = parseInt(parts[3]) || 3;

      console.log('✅ Incident detected:', { type, location, severity });

      return {
        type,
        description: message,
        location,
        timestamp: new Date().toISOString(),
        severity,
        confirmed: false
      };
    } catch (error) {
      console.error('❌ Incident detection error:', error);
      return null;
    }
  }

  private async extractLocationWithAI(message: string): Promise<string | undefined> {
    try {
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      if (!GROQ_API_KEY) {
        console.log('⚠️  No GROQ_API_KEY, extraction failed');
        return undefined;
      }

      // Use Groq Compound (agentic AI) for intelligent location extraction
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'groq/compound',
          messages: [
            {
              role: 'system',
              content: `You are a location extraction expert for Kenya. Extract the EXACT location mentioned by the user, preserving original phrasing.

Rules:
- Extract location EXACTLY as stated (e.g., "CBD near Archives", "Westlands Mall", "Yaya Centre Kilimani")
- Include landmarks and descriptors (e.g., "near", "outside", "at")
- Keep Kenyan place names accurate
- If NO location mentioned, return null

Return JSON: {"location": "exact location string" or null}`
            },
            {
              role: 'user',
              content: message
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.0,
          max_tokens: 100
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Groq location extraction failed:', response.statusText, errorText);
        return undefined;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      
      if (!content) {
        console.log('⚠️  No response from AI');
        return undefined;
      }

      const parsed = JSON.parse(content);
      const extractedLocation = parsed.location;
      
      if (!extractedLocation || typeof extractedLocation !== 'string' || extractedLocation.length < 2) {
        console.log('⚠️  No location found in message');
        return undefined;
      }

      console.log(`🎯 AI extracted location: "${extractedLocation}"`);
      return extractedLocation;
    } catch (error) {
      console.error('❌ Error in AI location extraction:', error);
      return undefined;
    }
  }



  private async generateResponseWithAI(userId: string, userMessage: string, conversationHistory: string): Promise<string> {
    try {
      console.log('🤖 CALLING GROQ AI...');
      console.log('📝 User message:', userMessage);
      console.log('📚 Context:', conversationHistory);
      
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      
      if (!GROQ_API_KEY) {
        console.error('❌ GROQ_API_KEY NOT FOUND!');
        throw new Error('Groq API key not configured');
      }

  const systemPrompt = `You are Jirani, a brief, friendly, and security-focused community safety assistant in Kenya. Your job is to help people report safety incidents and answer questions about security in the community.

PERSONALITY & RULES:
- Always keep responses short, clear, and to the point (1-2 sentences max).
- Speak in natural Kenyan English dialect (e.g., "Sawa", "Pole sana", "Uko sawa?", casual Kenyan expressions).
- ONLY switch to full Kiswahili when the user explicitly asks for Kiswahili or says "Swahili" or "Kiswahili".
- If this is the first message (greeting), you can ask: "Hi! Would you prefer English or Kiswahili?"
- Stay focused on security, safety, and incident reporting. If the user goes off-topic, gently steer them back to security.
- Never share information about your creators, how you were made, or any sensitive/internal details. If asked, politely say you can't discuss that and ask if they have a security concern.
- If asked who you are: Say you are Jirani, a community safety assistant.
- If asked about your origin, creators, or technical details: Do not answer, and redirect to security topics.
- If greeted: Greet back briefly in Kenyan English and ask if they have a security concern (or offer language choice).
- If they report an incident: Show empathy, ask for key details, and keep it brief.
- LOCATION: When asking for location, say: "Where did this happen? You can share your location pin 📍 or type the place name."
- CRITICAL: Once you have all incident details (what happened, location/pin, time), you MUST ask: "Should I file this report? Reply 'yes' to confirm." DO NOT say you've filed it until they confirm.
- Never give long or repetitive answers. Never give generic filler. Never answer off-topic questions.

CONVERSATION SO FAR:
${conversationHistory || 'This is the start of the conversation.'}

CURRENT USER MESSAGE: "${userMessage}"

INSTRUCTIONS:
- Respond as Jirani would, following the above rules.
- Use Kenyan English dialect unless user explicitly requests Kiswahili.
- If the user goes off-topic, gently bring the conversation back to security or safety.
- Keep it brief, natural, and human.
- REMEMBER: Always ask for explicit confirmation before filing a report!

Respond now as Jirani:`;

      console.log('🌐 Calling Groq Compound AI...');
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'groq/compound',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.8,
          max_tokens: 200,
          top_p: 0.9
        })
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Groq API error:', errorText);
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Groq response received');
      
      const aiText = data.choices?.[0]?.message?.content;
      
      if (!aiText) {
        console.error('❌ No text in Groq response');
        throw new Error('No text in Groq response');
      }

      console.log('💬 AI generated response:', aiText);
      return aiText.trim();
      
    } catch (error) {
      console.error('❌❌❌ AI CALL COMPLETELY FAILED ❌❌❌');
      console.error('Error details:', error);
      
      // INTELLIGENT FALLBACK - brief, guarded, security-focused with Kenyan English
      const lowerMessage = userMessage.toLowerCase();
      console.log('⚠️ Using fallback response for:', lowerMessage);
      if (lowerMessage.includes('who are you') || lowerMessage.includes('what is your name')) {
        return "I'm Jirani, your community safety assistant. Uko na shida ya usalama?";
      }
      if (lowerMessage.includes('who made you') || lowerMessage.includes('creator') || lowerMessage.includes('how were you made')) {
        return "Pole, I can't discuss that. Una security concern?";
      }
      if (lowerMessage.includes('what do you do') || lowerMessage.includes('what can you do')) {
        return "I help people report safety incidents. How can I help you?";
      }
      if (["hi", "hello", "hey", "ola", "hola", "jambo"].some(g => lowerMessage.trim() === g)) {
        return "Sawa! Una security concern ama incident ya ku-report?";
      }
      // Off-topic or last resort
      return "Tuongee kuhusu security. How can I help?";
    }
  }

  private async generateResponse(userId: string, userMessage: string): Promise<string> {
    const conversation = await this.getConversation(userId);
    const lowerMessage = userMessage.toLowerCase();

    console.log(`📱 Processing message from ${userId}: "${userMessage}"`);
    console.log(`📊 Conversation phase: ${conversation.conversationPhase}`);

    // Handle confirmation responses first (these need immediate action)
    console.log('🔍 Checking confirmation:', {
      awaitingConfirmation: conversation.awaitingConfirmation,
      hasCurrentIncident: !!conversation.currentIncident,
      messageIsYes: lowerMessage.includes('yes')
    });
    
    if (conversation.awaitingConfirmation && conversation.currentIncident) {
      if (lowerMessage.includes('yes') || lowerMessage.includes('confirm') || lowerMessage === 'y' || 
          lowerMessage.includes('okay') || lowerMessage.includes('ok') || lowerMessage.includes('sure') ||
          lowerMessage.includes('do it') || lowerMessage.includes('file it') || lowerMessage.includes('proceed')) {
        console.log('✅✅✅ USER SAID YES - MARKING AS CONFIRMED ✅✅✅');
        console.log('🎯 Current incident BEFORE confirm:', JSON.stringify(conversation.currentIncident));
        conversation.currentIncident.confirmed = true;
        conversation.awaitingConfirmation = false;
        conversation.conversationPhase = 'completed';
        console.log('🎯 Current incident AFTER confirm:', JSON.stringify(conversation.currentIncident));
        await this.saveToSupabase(conversation); // Persist the confirmation
        return "✅ Sawa, report filed! The incident has been recorded and shared with authorities. Stay safe, uko sawa?";
      } else if (lowerMessage.includes('no') || lowerMessage.includes('cancel') || lowerMessage === 'n' || 
                 lowerMessage.includes('don\'t') || lowerMessage.includes('stop')) {
        conversation.currentIncident = undefined;
        conversation.awaitingConfirmation = false;
        conversation.conversationPhase = 'greeting';
        await this.saveToSupabase(conversation); // Persist the cancellation
        return "Sawa, no problem. I won't file anything. Anything else I can help with?";
      }
    }

    // Get full conversation context for AI
    const conversationHistory = conversation.messages
      .slice(-8) // Last 8 messages for context
      .map(m => `${m.role === 'user' ? 'User' : 'Jirani'}: ${m.content}`)
      .join('\n');

    console.log('📝 Conversation history:', conversationHistory);

    // ALWAYS use AI for responses - no fallback to generic responses
    const aiResponse = await this.generateResponseWithAI(userId, userMessage, conversationHistory);
    
    console.log('💭 Generated response:', aiResponse);
    
    // Check if the message indicates an incident (Groq Compound AI detection)
    // If there's already a confirmed incident, ignore it and detect new one
    const shouldDetectNewIncident = !conversation.currentIncident || conversation.currentIncident.confirmed === true;
    
    if (shouldDetectNewIncident) {
      const detectedIncident = await this.detectIncident(userMessage);
      if (detectedIncident) {
        console.log('🚨 New incident detected and saving:', JSON.stringify(detectedIncident));
        conversation.currentIncident = detectedIncident;
        conversation.conversationPhase = 'collecting';
        await this.saveToSupabase(conversation);
        console.log('✅ Incident saved to Supabase');
      }
    } else {
      console.log('⏭️ Skipping incident detection - current incident pending:', JSON.stringify(conversation.currentIncident));
    }
    
    // Check if AI response asks for confirmation (indicates we have enough details)
    const lowerAI = aiResponse.toLowerCase();
    const asksForConfirmation = lowerAI.includes('should i file') || 
                                 lowerAI.includes('confirm') ||
                                 lowerAI.includes('proceed with') ||
                                 lowerAI.includes('reply') && (lowerAI.includes('yes') || lowerAI.includes('"yes"') || lowerAI.includes("'yes'")) ||
                                 lowerAI.includes('pole sana');
    
    if (conversation.currentIncident && asksForConfirmation && !conversation.awaitingConfirmation) {
      console.log('✋ Setting awaiting confirmation to true');
      conversation.awaitingConfirmation = true;
      conversation.conversationPhase = 'confirming';
      await this.saveToSupabase(conversation); // Persist awaiting confirmation state
    }
    
    return aiResponse;
  }

  public async processMessage(userId: string, message: string, coordinates?: [number, number]): Promise<{ response: string; incident?: IncidentReport }> {
    const conversation = await this.getConversation(userId);
    
    // Check if user sent a location pin
    if (coordinates && conversation.currentIncident && !conversation.currentIncident.confirmed) {
      console.log('📍 Location pin received! Updating incident with coordinates:', coordinates);
      conversation.currentIncident.coordinates = coordinates;
      conversation.currentIncident.location = `${coordinates[1]}, ${coordinates[0]}`; // lat, lng
      await this.saveToSupabase(conversation);
      
      return {
        response: `📍 Sawa! Location received. Should I file this ${conversation.currentIncident.type} report? Reply "yes" to confirm.`,
        incident: undefined
      };
    }
    
    // Add user message
    await this.addMessage(userId, 'user', message);
    
    // Generate response
    const response = await this.generateResponse(userId, message);
    
    // Add assistant response
    await this.addMessage(userId, 'assistant', response);
    
    // SIMPLE: If incident is confirmed, return it
    const shouldReturnIncident = conversation.currentIncident?.confirmed === true;
    
    console.log('🔍 Incident check:', {
      hasIncident: !!conversation.currentIncident,
      isConfirmed: conversation.currentIncident?.confirmed,
      hasCoordinates: !!conversation.currentIncident?.coordinates,
      willReturn: shouldReturnIncident
    });
    
    return {
      response,
      incident: shouldReturnIncident ? conversation.currentIncident : undefined
    };
  }

  public async getConversationHistory(userId: string): Promise<string> {
    const conversation = await this.getConversation(userId);
    return conversation.messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  public async clearIncident(userId: string): Promise<void> {
    const conversation = await this.getConversation(userId);
    conversation.currentIncident = undefined;
    conversation.awaitingConfirmation = false;
    conversation.conversationPhase = 'greeting';
    await this.saveToSupabase(conversation);
    console.log('✅ Cleared incident from conversation (ready for new reports)');
  }

  public async clearConversation(userId: string): Promise<void> {
    this.conversations.delete(userId);
    // Also delete from Supabase
    if (supabase) {
      try {
        await supabase
          .from('conversations')
          .delete()
          .eq('user_id', userId);
      } catch (error) {
        console.error('Error clearing conversation from Supabase:', error);
      }
    }
  }
}

// Export singleton instance
export const conversationManager = new WhatsAppConversationManager();
export default conversationManager;
