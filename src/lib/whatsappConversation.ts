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
      // Use the LLM API to generate intelligent responses
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://jirani-dk58srmho-jenks18s-projects.vercel.app';
      
      const systemPrompt = `You are Jirani, a warm and empathetic community safety assistant in Kenya. You're a real person having a genuine conversation.

WHO YOU ARE:
- Name: Jirani (means "neighbor" in Swahili)
- Purpose: Help people report safety incidents and feel supported
- Personality: Warm, empathetic, conversational, reliable friend
- You ALWAYS remember the conversation context

HOW YOU TALK:
- Like a caring friend, not a robot
- Natural, warm, conversational Kenyan English
- 2-3 sentences max per response
- Ask ONE question at a time
- Remember what was said before
- Show genuine empathy and care

CONVERSATION MEMORY:
${conversationHistory || 'This is a new conversation.'}

CURRENT MESSAGE: ${userMessage}

INSTRUCTIONS:
- If asked who you are: Introduce yourself as Jirani warmly
- If greeted: Greet back naturally and ask how you can help
- If they share an incident: Show empathy first, then gently gather details (what, when, where)
- Always acknowledge their previous messages
- Be conversational and human

Respond now as Jirani would:`;

      console.log('🤖 Calling AI with prompt...');
      
      const response = await fetch(`${baseUrl}/api/process-llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: systemPrompt,
          provider: 'gemini'
        }),
        signal: AbortSignal.timeout(15000) // Increased timeout to 15 seconds
      });

      if (!response.ok) {
        console.error('❌ AI API returned error:', response.status, response.statusText);
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ AI response received:', data);
      
      if (data.result && typeof data.result === 'string') {
        // Clean up the response
        let aiResponse = data.result.trim();
        
        // Remove any markdown or JSON formatting
        aiResponse = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // If it returned JSON, extract the reply
        if (aiResponse.startsWith('{')) {
          try {
            const parsed = JSON.parse(aiResponse);
            if (parsed.reply) {
              aiResponse = parsed.reply;
            }
          } catch {
            // Not valid JSON, use as is
          }
        }
        
        console.log('💬 Final AI response:', aiResponse);
        return aiResponse;
      }
      
      throw new Error('No valid AI response');
      
    } catch (error) {
      console.error('❌ AI response generation failed:', error);
      
      // Intelligent fallback based on message content
      const lowerMessage = userMessage.toLowerCase();
      
      // Personal questions about the bot
      if (lowerMessage.includes('who are you') || lowerMessage.includes('what is your name')) {
        return "I'm Jirani, your community safety assistant! 😊 I'm here to help you report incidents and keep our community safe. Think of me as your reliable neighbor looking out for you. What brings you here today?";
      }
      
      if (lowerMessage.includes('what do you do') || lowerMessage.includes('what can you do')) {
        return "I help people like you report safety incidents in our community. Whether it's theft, harassment, or any security concern, I'm here to listen and record what happened so we can keep everyone safer. How can I support you today?";
      }
      
      // Greetings
      if (['hi', 'hello', 'hey', 'ola', 'hola', 'jambo'].some(g => lowerMessage.trim() === g)) {
        return "Hey there! 👋 I'm Jirani, your community safety buddy. I'm here to listen and help. What's going on?";
      }
      
      // Generic conversational fallback
      return "I'm here and listening. 😊 Tell me what's on your mind, or ask me anything you'd like to know.";
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
