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

  private generateResponse(userId: string, userMessage: string): string {
    const conversation = this.getConversation(userId);
    const lowerMessage = userMessage.toLowerCase();

    // Handle confirmation responses
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
      } else {
        // They're adding more details while we're waiting for confirmation - add it to the incident
        if (conversation.currentIncident) {
          conversation.currentIncident.description += ` ${userMessage}`;
          return "Got it, I've added that detail to the report. Do you want me to log this incident now? Just say 'yes' to confirm.";
        }
        return "I'm waiting for your confirmation about the incident you reported. Please reply 'yes' to record it or 'no' to cancel.";
      }
    }

    // Get conversation context
    const recentMessages = conversation.messages.slice(-6);
    const conversationContext = recentMessages.map(m => m.content).join(' ').toLowerCase();
    
    // Check if we're currently collecting incident details
    const isCollectingDetails = conversation.conversationPhase === 'collecting';
    const hasAskedForDetails = conversationContext.includes('when and where') || 
                               conversationContext.includes('tell me more') ||
                               conversationContext.includes('what happened');
    
    // Check if this is providing requested information
    const isProvidingTime = lowerMessage.match(/\d+:\d+|morning|afternoon|evening|night|today|yesterday|last night|this morning/);
    const isProvidingLocation = lowerMessage.match(/near|at |in |around|by |westland|kikuyu|nairobi|mall|street|road|avenue/);
    const isProvidingDetails = userMessage.length > 15 && !['hi', 'hello', 'hey', 'ola'].includes(lowerMessage);
    
    // If they just answered our question with details, acknowledge and continue the conversation
    if (hasAskedForDetails && (isProvidingTime || isProvidingLocation || isProvidingDetails)) {
      // Build on what they said
      let response = "";
      
      if (isProvidingTime && !isProvidingLocation) {
        response = `Okay, so this happened ${userMessage}. Where did this take place? Even a general area like a neighborhood name helps.`;
        conversation.conversationPhase = 'collecting';
      } else if (isProvidingLocation && !isProvidingTime) {
        response = `I see, this was ${userMessage}. What time did it happen? Was it during the day, evening, or night?`;
        conversation.conversationPhase = 'collecting';
      } else if (isProvidingTime && isProvidingLocation) {
        // They gave us enough detail - create incident
        const detectedIncident = this.detectIncident(conversationContext + ' ' + userMessage);
        if (detectedIncident) {
          conversation.currentIncident = detectedIncident;
          conversation.awaitingConfirmation = true;
          conversation.conversationPhase = 'confirming';
          return `Thank you for sharing all those details. Just to make sure I have this right:\n\n${detectedIncident.description}\n\nShould I officially log this report? Reply 'yes' to confirm.`;
        } else {
          response = `Thank you for sharing that information. It sounds like something concerning happened. Can you tell me exactly what occurred - like what was taken or what the person did?`;
          conversation.conversationPhase = 'collecting';
        }
      } else {
        // Just general details, acknowledge and ask for more
        response = `I understand. Can you tell me more about when and where this happened? The more specific you can be, the better.`;
        conversation.conversationPhase = 'collecting';
      }
      
      return response;
    }

    // Check for new incident
    const detectedIncident = this.detectIncident(userMessage);
    if (detectedIncident) {
      conversation.currentIncident = detectedIncident;
      conversation.conversationPhase = 'collecting';
      
      // Ask follow-up questions naturally
      const responses = [
        `I'm really sorry to hear that happened to you. That must have been scary. Can you tell me when and where this occurred?`,
        `Oh no, I'm so sorry you went through that. Are you okay now? When and where did this happen?`,
        `That sounds really frightening. I'm here to help you report this. Can you share when and where it took place?`
      ];
      
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Handle follow-up incident requests
    if ((lowerMessage.includes('add') && lowerMessage.includes('another')) || 
        (lowerMessage.includes('report') && lowerMessage.includes('another')) ||
        (lowerMessage.includes('one more') || lowerMessage.includes('also happened'))) {
      conversation.conversationPhase = 'collecting';
      conversation.currentIncident = undefined;
      return "Of course, I'm here to listen. Tell me about this other incident - what happened?";
    }

    // Emergency situations
    if (lowerMessage.includes('emergency') || lowerMessage.includes('danger') || 
        (lowerMessage.includes('help') && lowerMessage.includes('now'))) {
      return "🚨 This sounds urgent! Are you in immediate danger right now? If yes, please call emergency services (999 or 911) immediately. Once you're safe, I'm here to help you document what happened.";
    }

    // Simple greetings
    if (['hi', 'hello', 'hey', 'ola', 'hola'].includes(lowerMessage.trim())) {
      conversation.conversationPhase = 'greeting';
      const greetings = [
        "Hi there! How are you doing? I'm here if you need to report anything or just want to talk.",
        "Hello! Hope you're doing well. Is there something on your mind?",
        "Hey! How can I help you today? I'm here to listen."
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // Check how they're doing / general check-ins
    if (lowerMessage.match(/how are you|how's it going|what's up|wassup/)) {
      return "I'm here and ready to help! More importantly - how are YOU doing? Is everything okay?";
    }

    // Location-only messages
    if ((lowerMessage.includes('near') || lowerMessage.includes('kikuyu') || 
         lowerMessage.includes('westland') || lowerMessage.includes('nairobi')) && 
        userMessage.split(' ').length < 5) {
      conversation.conversationPhase = 'collecting';
      return `You mentioned ${userMessage} - is something happening there or did something occur in that area? Tell me more.`;
    }

    // General conversational responses based on context
    const hasRecentIncidentDiscussion = conversationContext.includes('stole') || 
                                       conversationContext.includes('robbery') ||
                                       conversationContext.includes('robbed') ||
                                       conversationContext.includes('incident');
    
    if (hasRecentIncidentDiscussion && conversation.conversationPhase === 'collecting') {
      return "I'm still listening. Take your time and share whatever details you remember. Every bit helps.";
    }

    // Catch-all conversational responses
    const responses = [
      "I'm here to help. What's going on?",
      "Tell me more - what's on your mind?",
      "I'm listening. Feel free to share what's happening.",
      "You can talk to me about anything. What would you like to discuss?"
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  public processMessage(userId: string, message: string): { response: string; incident?: IncidentReport } {
    const conversation = this.getConversation(userId);
    
    // Add user message
    this.addMessage(userId, 'user', message);
    
    // Generate response
    const response = this.generateResponse(userId, message);
    
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
