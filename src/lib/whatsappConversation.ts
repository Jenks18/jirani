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
      console.error('❌ Supabase client not available');
      return;
    }
    
    try {
      const { error } = await supabase
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
        });

      if (error) {
        console.error('❌ Error saving conversation to Supabase:', error);
      } else {
        console.log('💾 Conversation saved to Supabase for', conversation.userId);
      }
    } catch (error) {
      console.error('❌ Exception saving conversation:', error);
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
    const lowerMessage = message.toLowerCase();
    
    // Crime-related keywords with broader context
    const crimeKeywords = ['stole', 'stolen', 'robbed', 'robbery', 'theft', 'mugged', 'attacked', 'knife', 'gun', 'weapon', 'threatened', 'assault', 'mugging'];
    const hasCrimeKeyword = crimeKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Also check for phrases that indicate something bad happened
    const incidentPhrases = ['somebody robbed', 'someone stole', 'got robbed', 'was robbed', 'they took', 'he took', 'she took'];
    const hasIncidentPhrase = incidentPhrases.some(phrase => lowerMessage.includes(phrase));
    
    if (!hasCrimeKeyword && !hasIncidentPhrase && !lowerMessage.includes('incident')) {
      return null;
    }

    // Determine incident type with better context
    let type = 'General Incident';
    if (lowerMessage.match(/knife|gun|weapon|armed|pistol|blade/)) {
      type = 'Armed Robbery';
    } else if (lowerMessage.match(/stole|theft|robbed|robbery|took my|grabbed my|snatched/)) {
      type = 'Theft/Robbery';
    } else if (lowerMessage.match(/mugged|attacked|assault|beat|hit me|pushed me/)) {
      type = 'Assault';
    } else if (lowerMessage.match(/threatened|intimidat|scared|following me/)) {
      type = 'Threat/Harassment';
    }

    // Use AI to extract location more intelligently
    const specificLocation = await this.extractLocationWithAI(message);

    return {
      type,
      description: message,
      location: specificLocation,
      timestamp: new Date().toISOString(),
      severity: type.includes('Armed') ? 5 : type.includes('Assault') ? 4 : 3,
      confirmed: false
    };
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
- CRITICAL: Once you have all incident details (what happened, location, time), you MUST ask: "Should I file this report? Reply 'yes' to confirm." DO NOT say you've filed it until they confirm.
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
    
    // Check if the message indicates an incident
    const detectedIncident = await this.detectIncident(userMessage);
    if (detectedIncident && !conversation.currentIncident) {
      console.log('🚨 Incident detected:', detectedIncident);
      conversation.currentIncident = detectedIncident;
      conversation.conversationPhase = 'collecting';
      await this.saveToSupabase(conversation); // Persist incident detection
    }
    
    // If we have an active incident, continuously update location from new messages
    if (conversation.currentIncident && conversation.conversationPhase === 'collecting') {
      const locationFromMessage = await this.extractLocationWithAI(userMessage);
      if (locationFromMessage && locationFromMessage !== 'NONE') {
        console.log(`📍 Updating incident location: "${locationFromMessage}"`);
        conversation.currentIncident.location = locationFromMessage;
        await this.saveToSupabase(conversation); // Persist location update
      }
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

  public async processMessage(userId: string, message: string): Promise<{ response: string; incident?: IncidentReport }> {
    const conversation = await this.getConversation(userId);
    
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
