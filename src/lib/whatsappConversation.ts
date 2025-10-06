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
  private readonly MAX_MESSAGES = 20;
  private readonly CONVERSATION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

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

  private async generateResponseWithAI(userId: string, userMessage: string, conversationHistory: string): Promise<string | null> {
    try {
      // Use the LLM API to generate intelligent responses
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://jirani-dk58srmho-jenks18s-projects.vercel.app';
      
      const systemPrompt = `You are Jirani, a friendly and empathetic community safety assistant helping people in Kenya report incidents and feel heard. You have a warm, conversational personality.

CORE BEHAVIORS:
- Answer questions about yourself naturally (name: Jirani, purpose: help report safety incidents)
- Have real conversations - don't just pattern match keywords
- Remember context from earlier in the conversation
- Ask follow-up questions naturally
- Show empathy when people share difficult experiences
- Guide users through reporting incidents without being robotic

CONVERSATION FLOW:
1. If someone greets you or asks who you are - respond naturally and warmly
2. If someone mentions a crime/incident - express empathy and gently ask for details (when, where)
3. When collecting details - acknowledge what they share and ask follow-up questions
4. Once you have incident details - summarize and ask if they want to officially report it
5. After reporting - offer continued support

RESPONSE STYLE:
- Natural, conversational tone
- Empathetic and supportive
- Short, clear responses (2-3 sentences usually)
- Ask ONE question at a time
- Use Kenyan context (mention police, local areas if relevant)

CONVERSATION HISTORY:
${conversationHistory}

USER MESSAGE: ${userMessage}

Respond naturally as Jirani would in a real conversation. Be helpful, empathetic, and conversational.`;

      const response = await fetch(`${baseUrl}/api/process-llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: systemPrompt,
          provider: 'gemini'
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result && typeof data.result === 'string') {
          // Clean up the response
          let aiResponse = data.result.trim();
          
          // Remove markdown formatting if present
          aiResponse = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
          
          // If it returned JSON, extract the reply
          if (aiResponse.startsWith('{')) {
            try {
              const parsed = JSON.parse(aiResponse);
              if (parsed.reply) {
                return parsed.reply;
              }
            } catch {
              // Not valid JSON, use as is
            }
          }
          
          return aiResponse;
        }
      }
      
      // Fallback if LLM fails
      return null;
    } catch (error) {
      console.error('AI response generation failed:', error);
      return null;
    }
  }

  private async generateResponse(userId: string, userMessage: string): Promise<string> {
    const conversation = this.getConversation(userId);
    const lowerMessage = userMessage.toLowerCase();

    // Handle confirmation responses first (these need immediate action)
    if (conversation.awaitingConfirmation && conversation.currentIncident) {
      if (lowerMessage.includes('yes') || lowerMessage.includes('confirm') || lowerMessage === 'y') {
        conversation.currentIncident.confirmed = true;
        conversation.awaitingConfirmation = false;
        conversation.conversationPhase = 'completed';
        return "✅ Thank you! I've recorded this incident. The report has been logged and will help keep our community safe. You're very brave for reporting this.";
      } else if (lowerMessage.includes('no') || lowerMessage.includes('cancel') || lowerMessage === 'n') {
        conversation.currentIncident = undefined;
        conversation.awaitingConfirmation = false;
        conversation.conversationPhase = 'greeting';
        return "No problem at all. I won't record anything. Is there anything else I can help you with today?";
      }
    }

    // Get full conversation context for AI
    const conversationHistory = conversation.messages
      .slice(-10) // Last 10 messages for context
      .map(m => `${m.role === 'user' ? 'User' : 'Jirani'}: ${m.content}`)
      .join('\n');

    // Try to get AI response first
    const aiResponse = await this.generateResponseWithAI(userId, userMessage, conversationHistory);
    
    if (aiResponse) {
      // Check if the AI response indicates an incident should be detected
      const detectedIncident = this.detectIncident(userMessage);
      if (detectedIncident && !conversation.currentIncident) {
        conversation.currentIncident = detectedIncident;
        conversation.conversationPhase = 'collecting';
      }
      
      return aiResponse;
    }

    // Fallback to rule-based responses if AI fails
    const detectedIncident = this.detectIncident(userMessage);
    if (detectedIncident) {
      conversation.currentIncident = detectedIncident;
      conversation.conversationPhase = 'collecting';
      return `I'm really sorry to hear that happened to you. That must have been scary. Can you tell me when and where this occurred?`;
    }

    // Simple greetings
    if (['hi', 'hello', 'hey', 'ola', 'hola'].includes(lowerMessage.trim())) {
      return "Hi there! I'm Jirani, your community safety assistant. How can I help you today?";
    }

    // Generic fallback
    return "I'm here to help. What's on your mind?";
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
