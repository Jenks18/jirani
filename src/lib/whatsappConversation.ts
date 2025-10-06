// Robust WhatsApp Conversation Management System
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
  private readonly MAX_MESSAGES = 50; // Increased for better memory
  private readonly CONVERSATION_TIMEOUT = 60 * 60 * 1000; // 60 minutes - longer sessions

  constructor() {
    // Clean up old conversations every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = new Date();
    for (const [userId, conversation] of this.conversations.entries()) {
      if (now.getTime() - conversation.lastActivity.getTime() > this.CONVERSATION_TIMEOUT) {
        this.conversations.delete(userId);
      }
    }
  }

  private generateMessageId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getConversation(userId: string): ConversationState {
    if (!this.conversations.has(userId)) {
      this.conversations.set(userId, {
        userId,
        messages: [],
        awaitingConfirmation: false,
        conversationPhase: 'greeting',
        lastActivity: new Date()
      });
    }
    
    const conversation = this.conversations.get(userId)!;
    conversation.lastActivity = new Date();
    return conversation;
  }

  private addMessage(userId: string, role: 'user' | 'assistant', content: string): void {
    const conversation = this.getConversation(userId);
    const message: Message = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      role,
      content
    };

    conversation.messages.push(message);

    // Keep only the last MAX_MESSAGES messages
    if (conversation.messages.length > this.MAX_MESSAGES) {
      conversation.messages = conversation.messages.slice(-this.MAX_MESSAGES);
    }
  }

  private detectIncident(message: string): IncidentReport | null {
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

    // Better location extraction
    const locationKeywords = ['near', 'at ', 'in ', 'on ', 'by ', 'westland', 'kikuyu', 'mall', 'road', 'street', 'avenue', 'around', 'outside'];
    const hasLocation = locationKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Extract specific location if mentioned
    let specificLocation = undefined;
    if (hasLocation) {
      const locationMatch = lowerMessage.match(/(near|at|in|on|by|around|outside)\s+([a-z\s]+?)(?:\.|,|$|\sand\s)/i);
      if (locationMatch) {
        specificLocation = locationMatch[0].trim();
      } else {
        specificLocation = 'Location mentioned in description';
      }
    }

    return {
      type,
      description: message,
      location: specificLocation,
      timestamp: new Date().toISOString(),
      severity: type.includes('Armed') ? 5 : type.includes('Assault') ? 4 : 3,
      confirmed: false
    };
  }

  private async generateResponseWithAI(userId: string, userMessage: string, conversationHistory: string): Promise<string> {
    try {
      console.log('🤖 CALLING AI (OpenAI GPT)...');
      console.log('📝 User message:', userMessage);
      console.log('📚 Context:', conversationHistory);
      
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY NOT FOUND!');
        throw new Error('OpenAI API key not configured');
      }

      const systemPrompt = `You are Jirani, a warm and empathetic community safety assistant in Kenya. You're having a natural conversation with a real person.

PERSONALITY:
- Warm, friendly, conversational
- Like talking to a caring neighbor
- Remember everything said in this conversation
- Natural Kenyan English (can speak Swahili too if asked)
- NEVER give generic one-line responses
- ALWAYS be specific and conversational

CONVERSATION SO FAR:
${conversationHistory || 'This is the start of the conversation.'}

CURRENT USER MESSAGE: "${userMessage}"

INSTRUCTIONS:
- Respond naturally and conversationally
- If asked who you are: Introduce yourself warmly as Jirani
- If asked what you do: Explain you help report safety incidents
- If greeted: Greet back warmly and ask how you can help
- If they speak Swahili: Respond in Swahili
- If they report an incident: Show empathy and gently gather details
- Keep responses 2-4 sentences, natural and human
- NEVER say "I'm here and listening" - be MORE specific

Respond now as Jirani would:`;

      console.log('🌐 Calling OpenAI API...');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.8,
          max_tokens: 200
        })
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenAI API error:', errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ OpenAI response received');
      
      const aiText = data.choices?.[0]?.message?.content;
      
      if (!aiText) {
        console.error('❌ No text in OpenAI response');
        throw new Error('No text in OpenAI response');
      }

      console.log('💬 AI generated response:', aiText);
      return aiText.trim();
      
    } catch (error) {
      console.error('❌❌❌ AI CALL COMPLETELY FAILED ❌❌❌');
      console.error('Error details:', error);
      
      // INTELLIGENT FALLBACK - still conversational
      const lowerMessage = userMessage.toLowerCase();
      
      console.log('⚠️ Using fallback response for:', lowerMessage);
      
      if (lowerMessage.includes('who are you') || lowerMessage.includes('what is your name') || lowerMessage === 'who are you') {
        return "I'm Jirani, your community safety assistant! 😊 I'm here to help you report incidents and keep our community safe. Think of me as your reliable neighbor looking out for you. What brings you here today?";
      }
      
      if (lowerMessage.includes('what do you do') || lowerMessage.includes('what can you do')) {
        return "I help people like you report safety incidents in our community. Whether it's theft, harassment, or any security concern, I'm here to listen and record what happened so we can keep everyone safer. How can I support you today?";
      }
      
      if (['hi', 'hello', 'hey', 'ola', 'hola', 'jambo'].some(g => lowerMessage.trim() === g)) {
        return "Hey there! 👋 I'm Jirani, your community safety buddy. I'm here to listen and help. What's going on?";
      }
      
      // Last resort - but more specific
      return "Hey! I'm Jirani, your safety assistant. You can ask me anything - who I am, what I do, or tell me about any safety concerns in your area. What would you like to know?";
    }
  }

  private async generateResponse(userId: string, userMessage: string): Promise<string> {
    const conversation = this.getConversation(userId);
    const lowerMessage = userMessage.toLowerCase();

    console.log(`📱 Processing message from ${userId}: "${userMessage}"`);
    console.log(`📊 Conversation phase: ${conversation.conversationPhase}`);

    // Handle confirmation responses first (these need immediate action)
    if (conversation.awaitingConfirmation && conversation.currentIncident) {
      if (lowerMessage.includes('yes') || lowerMessage.includes('confirm') || lowerMessage === 'y') {
        conversation.currentIncident.confirmed = true;
        conversation.awaitingConfirmation = false;
        conversation.conversationPhase = 'completed';
        return "✅ Thank you! I've recorded this incident. The report has been logged and will help keep our community safe. You're very brave for reporting this. Is there anything else I can help you with?";
      } else if (lowerMessage.includes('no') || lowerMessage.includes('cancel') || lowerMessage === 'n') {
        conversation.currentIncident = undefined;
        conversation.awaitingConfirmation = false;
        conversation.conversationPhase = 'greeting';
        return "No problem at all. I won't record anything. I'm still here if you need me for anything else. What would you like to talk about?";
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
    const detectedIncident = this.detectIncident(userMessage);
    if (detectedIncident && !conversation.currentIncident) {
      console.log('🚨 Incident detected:', detectedIncident);
      conversation.currentIncident = detectedIncident;
      conversation.conversationPhase = 'collecting';
    }
    
    return aiResponse;
  }

  public async processMessage(userId: string, message: string): Promise<{ response: string; incident?: IncidentReport }> {
    const conversation = this.getConversation(userId);
    
    // Add user message
    this.addMessage(userId, 'user', message);
    
    // Generate response
    const response = await this.generateResponse(userId, message);
    
    // Add assistant response
    this.addMessage(userId, 'assistant', response);
    
    // Return response and any confirmed incident
    return {
      response,
      incident: conversation.currentIncident?.confirmed ? conversation.currentIncident : undefined
    };
  }

  public getConversationHistory(userId: string): string {
    const conversation = this.getConversation(userId);
    return conversation.messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  public clearConversation(userId: string): void {
    this.conversations.delete(userId);
  }
}

// Export singleton instance
export const conversationManager = new WhatsAppConversationManager();
export default conversationManager;
