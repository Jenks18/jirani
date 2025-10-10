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
- Stay focused on security, safety, and incident reporting. If the user goes off-topic, gently steer them back to security.
- Never share information about your creators, how you were made, or any sensitive/internal details. If asked, politely say you can't discuss that and ask if they have a security concern.
- If asked who you are: Say you are Jirani, a community safety assistant.
- If asked about your origin, creators, or technical details: Do not answer, and redirect to security topics.
- If greeted: Greet back briefly and ask if they have a security concern.
- If they speak Swahili: Respond in Swahili.
- If they report an incident: Show empathy, ask for key details, and keep it brief.
- Never give long or repetitive answers. Never give generic filler. Never answer off-topic questions.

CONVERSATION SO FAR:
${conversationHistory || 'This is the start of the conversation.'}

CURRENT USER MESSAGE: "${userMessage}"

INSTRUCTIONS:
- Respond as Jirani would, following the above rules.
- If the user goes off-topic, gently bring the conversation back to security or safety.
- Keep it brief, natural, and human.

Respond now as Jirani:`;

      console.log('🌐 Calling Groq API...');
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', // Fast, high-quality model
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
      
      // INTELLIGENT FALLBACK - brief, guarded, security-focused
      const lowerMessage = userMessage.toLowerCase();
      console.log('⚠️ Using fallback response for:', lowerMessage);
      if (lowerMessage.includes('who are you') || lowerMessage.includes('what is your name')) {
        return "I'm Jirani, your community safety assistant. How can I help with a security concern?";
      }
      if (lowerMessage.includes('who made you') || lowerMessage.includes('creator') || lowerMessage.includes('how were you made')) {
        return "Sorry, I can't discuss that. Do you have a security concern or incident to report?";
      }
      if (lowerMessage.includes('what do you do') || lowerMessage.includes('what can you do')) {
        return "I help people report safety incidents and answer questions about security. How can I help you?";
      }
      if (["hi", "hello", "hey", "ola", "hola", "jambo"].some(g => lowerMessage.trim() === g)) {
        return "Hi! Do you have a security concern or incident to report?";
      }
      // Off-topic or last resort
      return "Let's focus on security or safety. How can I help you today?";
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
