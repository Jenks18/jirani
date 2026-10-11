import { debug, maskPhone } from './log';
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
  coordinates?: [number, number];
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
  lastStoredAt?: Date;
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

      return {
        userId: data.user_id,
        messages: data.messages || [],
        currentIncident: data.current_incident,
        awaitingConfirmation: data.awaiting_confirmation || false,
        conversationPhase: data.conversation_phase || 'greeting',
        lastActivity: new Date(data.last_activity),
        lastStoredAt: data.last_stored_at ? new Date(data.last_stored_at) : undefined
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
      debug(`💾 Attempting to save conversation for ${conversation.userId}...`);
      debug('📊 Data to save:', {
        user_id: conversation.userId,
        messageCount: conversation.messages.length,
        hasIncident: !!conversation.currentIncident,
        incidentConfirmed: conversation.currentIncident?.confirmed,
        awaitingConfirmation: conversation.awaitingConfirmation,
        phase: conversation.conversationPhase
      });
      
      const dataToSave: Record<string, string | Message[] | IncidentReport | boolean | undefined> = {
        user_id: conversation.userId,
        messages: conversation.messages,
        current_incident: conversation.currentIncident,
        awaiting_confirmation: conversation.awaitingConfirmation,
        conversation_phase: conversation.conversationPhase,
        last_activity: conversation.lastActivity.toISOString()
      };
      
      if (conversation.lastStoredAt) {
        dataToSave.last_stored_at = conversation.lastStoredAt.toISOString();
      }
      
      const { data, error } = await supabase
        .from('conversations')
        .upsert(dataToSave, {
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
        debug('✅✅✅ Conversation SAVED successfully to Supabase!');
        debug('Saved data:', data);
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
    if (this.conversations.has(userId)) {
      const conversation = this.conversations.get(userId)!;
      conversation.lastActivity = new Date();
      return conversation;
    }

    debug('🔍 Loading conversation from Supabase for', userId);
    const stored = await this.loadFromSupabase(userId);
    
    if (stored) {
      debug('✅ Found existing conversation:', {
        phase: stored.conversationPhase,
        hasIncident: !!stored.currentIncident,
        awaitingConfirmation: stored.awaitingConfirmation,
        messageCount: stored.messages.length
      });
      this.conversations.set(userId, stored);
      stored.lastActivity = new Date();
      return stored;
    }

    debug('🆕 Creating new conversation for', userId);
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

    if (conversation.messages.length > this.MAX_MESSAGES) {
      conversation.messages = conversation.messages.slice(-this.MAX_MESSAGES);
    }
    
    await this.saveToSupabase(conversation);
  }

  private async detectIncident(message: string): Promise<IncidentReport | null> {
    try {
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      if (!GROQ_API_KEY) {
        debug('⚠️ No GROQ_API_KEY');
        return null;
      }

      debug('🔍 Analyzing message for incident with Groq Compound...');

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
      
      debug('🤖 Groq response:', aiText);

      if (!aiText || aiText.includes('NOT_INCIDENT')) {
        debug('❌ Not an incident');
        return null;
      }

      const lines = aiText.split('\n');
      const incidentLine = lines.find((line: string) => line.trim().startsWith('INCIDENT|'));
      
      if (!incidentLine) {
        debug('❌ No INCIDENT line found in response');
        return null;
      }

      const parts = incidentLine.trim().split('|');
      if (parts[0] !== 'INCIDENT' || parts.length < 4) {
        debug('❌ Invalid response format');
        return null;
      }

      const type = parts[1] || 'General Incident';
      const location = parts[2] !== 'null' && parts[2] ? parts[2] : undefined;
      const severity = parseInt(parts[3]) || 3;

      debug('✅ Incident detected:', { type, location, severity });

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
        debug('⚠️  No GROQ_API_KEY, extraction failed');
        return undefined;
      }

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
        debug('⚠️  No response from AI');
        return undefined;
      }

      const parsed = JSON.parse(content);
      const extractedLocation = parsed.location;
      
      if (!extractedLocation || typeof extractedLocation !== 'string' || extractedLocation.length < 2) {
        debug('⚠️  No location found in message');
        return undefined;
      }

      debug(`🎯 AI extracted location: "${extractedLocation}"`);
      return extractedLocation;
    } catch (error) {
      console.error('❌ Error in AI location extraction:', error);
      return undefined;
    }
  }

  private async generateResponseWithAI(userId: string, userMessage: string, conversationHistory: string): Promise<string> {
    try {
      debug('🤖 CALLING GROQ AI...');
      debug('📝 User message:', userMessage);
      debug('📚 Context:', conversationHistory);
      
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

      debug('🌐 Calling Groq Compound AI...');
      
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

      debug('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Groq API error:', errorText);
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      debug('✅ Groq response received');
      
      const aiText = data.choices?.[0]?.message?.content;
      
      if (!aiText) {
        console.error('❌ No text in Groq response');
        throw new Error('No text in Groq response');
      }

      debug('💬 AI generated response:', aiText);
      return aiText.trim();
      
    } catch (error) {
      console.error('❌❌❌ AI CALL COMPLETELY FAILED ❌❌❌');
      console.error('Error details:', error);
      
      const lowerMessage = userMessage.toLowerCase();
      debug('⚠️ Using fallback response for:', lowerMessage);
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
      return "Tuongee kuhusu security. How can I help?";
    }
  }

  private async generateResponse(userId: string, userMessage: string): Promise<string> {
    const conversation = await this.getConversation(userId);
    const lowerMessage = userMessage.toLowerCase();

    debug(`📱 Processing message from ${maskPhone(userId)} (${userMessage.length} chars)`);
    debug(`📊 Conversation phase: ${conversation.conversationPhase}`);

    debug('🔍 Checking confirmation:', {
      awaitingConfirmation: conversation.awaitingConfirmation,
      hasCurrentIncident: !!conversation.currentIncident,
      messageIsYes: lowerMessage.includes('yes')
    });
    
    if (conversation.awaitingConfirmation && conversation.currentIncident) {
      if (lowerMessage.includes('yes') || lowerMessage.includes('confirm') || lowerMessage === 'y' || 
          lowerMessage.includes('okay') || lowerMessage.includes('ok') || lowerMessage.includes('sure') ||
          lowerMessage.includes('ndio') || lowerMessage.includes('sawa')) {
        debug('✅✅✅ USER CONFIRMED - FILING REPORT ✅✅✅');
        conversation.currentIncident.confirmed = true;
        conversation.awaitingConfirmation = false;
        conversation.conversationPhase = 'completed';
        await this.saveToSupabase(conversation);
        return "✅ Report filed! Stay safe!";
      } else if (lowerMessage.includes('no') || lowerMessage.includes('cancel') || lowerMessage === 'n' || 
                 lowerMessage.includes('hapana')) {
        conversation.currentIncident = undefined;
        conversation.awaitingConfirmation = false;
        conversation.conversationPhase = 'greeting';
        await this.saveToSupabase(conversation);
        return "Sawa, canceled. Anything else I can help with?";
      } else {
        debug('⚠️ User said something other than yes/no during confirmation');
        const summary = `${conversation.currentIncident.type} at ${conversation.currentIncident.location || 'provided location'}`;
        return `I'm waiting for your confirmation. ${summary}. Reply "yes" to file or "no" to cancel.`;
      }
    }

    const conversationHistory = conversation.messages
      .slice(-8)
      .map(m => `${m.role === 'user' ? 'User' : 'Jirani'}: ${m.content}`)
      .join('\n');

    debug('📝 Conversation history:', conversationHistory);

    const aiResponse = await this.generateResponseWithAI(userId, userMessage, conversationHistory);
    
    debug('💭 Generated response:', aiResponse);
    
    const recentlyStored = conversation.lastStoredAt && 
                           (Date.now() - conversation.lastStoredAt.getTime()) < 60000;
    
    const shouldDetectNewIncident = !conversation.currentIncident && !recentlyStored;
    
    if (shouldDetectNewIncident) {
      const detectedIncident = await this.detectIncident(userMessage);
      if (detectedIncident) {
        debug('🚨 New incident detected and saving:', JSON.stringify(detectedIncident));
        conversation.currentIncident = detectedIncident;
        conversation.conversationPhase = 'collecting';
        await this.saveToSupabase(conversation);
        debug('✅ Incident saved to Supabase');
      }
    } else {
      debug('⏭️ Skipping incident detection - current incident pending:', JSON.stringify(conversation.currentIncident));
    }
    
    const lowerAI = aiResponse.toLowerCase();
    const asksForConfirmation = lowerAI.includes('should i file') || 
                                 lowerAI.includes('confirm') ||
                                 lowerAI.includes('proceed with') ||
                                 lowerAI.includes('reply') && (lowerAI.includes('yes') || lowerAI.includes('"yes"') || lowerAI.includes("'yes'")) ||
                                 lowerAI.includes('pole sana');
    
    if (conversation.currentIncident && asksForConfirmation && !conversation.awaitingConfirmation) {
      debug('✋ Setting awaiting confirmation to true');
      conversation.awaitingConfirmation = true;
      conversation.conversationPhase = 'confirming';
      await this.saveToSupabase(conversation);
    }
    
    return aiResponse;
  }

  public async processMessage(userId: string, message: string, coordinates?: [number, number]): Promise<{ response: string; incident?: IncidentReport }> {
    const conversation = await this.getConversation(userId);
    
    if (coordinates && conversation.currentIncident && !conversation.currentIncident.confirmed) {
      debug('📍 Location pin received! Updating incident with coordinates:', coordinates);
      conversation.currentIncident.coordinates = coordinates;
      conversation.currentIncident.location = `${coordinates[1]}, ${coordinates[0]}`;
      await this.saveToSupabase(conversation);
      
      return {
        response: `📍 Sawa! Location received. Should I file this ${conversation.currentIncident.type} report? Reply "yes" to confirm.`,
        incident: undefined
      };
    }
    
    await this.addMessage(userId, 'user', message);
    
    const response = await this.generateResponse(userId, message);
    
    await this.addMessage(userId, 'assistant', response);
    
    const updatedConversation = await this.getConversation(userId);
    
    const shouldReturnIncident = updatedConversation.currentIncident?.confirmed === true;
    
    debug('🔍🔍🔍 FINAL INCIDENT CHECK 🔍🔍🔍');
    debug('Has incident:', !!updatedConversation.currentIncident);
    debug('Incident details:', JSON.stringify(updatedConversation.currentIncident));
    debug('Is confirmed:', updatedConversation.currentIncident?.confirmed);
    debug('Has coordinates:', !!updatedConversation.currentIncident?.coordinates);
    debug('Will return to webhook:', shouldReturnIncident);
    
    if (shouldReturnIncident) {
      debug('✅✅✅ RETURNING CONFIRMED INCIDENT TO WEBHOOK ✅✅✅');
    } else {
      debug('❌ NOT returning incident - either not confirmed or no incident');
    }
    
    return {
      response,
      incident: shouldReturnIncident ? updatedConversation.currentIncident : undefined
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
    conversation.lastStoredAt = new Date();
    await this.saveToSupabase(conversation);
    debug('✅ Cleared incident from conversation (ready for new reports in 60s)');
  }

  public async clearConversation(userId: string): Promise<void> {
    this.conversations.delete(userId);
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

export const conversationManager = new WhatsAppConversationManager();
export default conversationManager;
