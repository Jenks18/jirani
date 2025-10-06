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
    
    // Crime-related keywords
    const crimeKeywords = ['stole', 'stolen', 'robbed', 'robbery', 'theft', 'mugged', 'attacked', 'knife', 'gun'];
    const hasCrimeKeyword = crimeKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (!hasCrimeKeyword && !lowerMessage.includes('incident') && !lowerMessage.includes('happened')) {
      return null;
    }

    // Determine incident type
    let type = 'General Incident';
    if (lowerMessage.includes('knife') || lowerMessage.includes('gun') || lowerMessage.includes('weapon')) {
      type = 'Armed Robbery';
    } else if (lowerMessage.includes('stole') || lowerMessage.includes('theft') || lowerMessage.includes('robbed')) {
      type = 'Theft/Robbery';
    } else if (lowerMessage.includes('mugged') || lowerMessage.includes('attacked')) {
      type = 'Assault';
    }

    // Extract location hints
    const locationKeywords = ['near', 'at ', 'in ', 'westland', 'kikuyu', 'mall', 'road', 'street'];
    const hasLocation = locationKeywords.some(keyword => lowerMessage.includes(keyword));

    return {
      type,
      description: message,
      location: hasLocation ? 'Location mentioned in description' : undefined,
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
        return "I'm waiting for your confirmation about the incident you reported. Please reply 'yes' to record it or 'no' to cancel.";
      }
    }

    // Check for new incident
    const detectedIncident = this.detectIncident(userMessage);
    if (detectedIncident) {
      conversation.currentIncident = detectedIncident;
      conversation.awaitingConfirmation = true;
      conversation.conversationPhase = 'confirming';
      
      return `I understand you're reporting a ${detectedIncident.type.toLowerCase()}. This sounds serious and I want to make sure I record this correctly.\n\nIncident: ${detectedIncident.description}\n\nWould you like me to officially log this report? Please reply 'yes' to confirm or 'no' to cancel.`;
    }

    // Handle follow-up incident requests
    if ((lowerMessage.includes('add') && lowerMessage.includes('another')) || 
        (lowerMessage.includes('report') && lowerMessage.includes('another')) ||
        lowerMessage.includes('more incident')) {
      conversation.conversationPhase = 'collecting';
      return "I understand you want to report another incident. Please tell me what happened - describe the situation, when it occurred, and where it took place.";
    }

    // Contextual responses based on conversation phase and history
    const recentMessages = conversation.messages.slice(-4);
    const hasRecentCrimeDiscussion = recentMessages.some(msg => 
      msg.content.toLowerCase().includes('stole') || 
      msg.content.toLowerCase().includes('robbery') ||
      msg.content.toLowerCase().includes('incident')
    );

    // Emergency situations
    if (lowerMessage.includes('emergency') || lowerMessage.includes('danger') || lowerMessage.includes('help')) {
      return "🚨 This sounds urgent! Are you in immediate danger? If so, please call emergency services (999 or 911) right away. Once you're safe, I can help you report what happened.";
    }

    // Simple greetings
    if (['hi', 'hello', 'hey', 'ola'].includes(lowerMessage.trim())) {
      conversation.conversationPhase = 'greeting';
      const greetings = [
        "Hi there! I'm here to help with community safety reports. How are you doing today?",
        "Hello! I help people report safety incidents in their area. Is everything okay?",
        "Hey! Thanks for reaching out. Is there something you'd like to report or discuss?"
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // Location-only messages (might be starting to describe an incident)
    if (lowerMessage.includes('near') || lowerMessage.includes('kikuyu') || lowerMessage.includes('westland')) {
      conversation.conversationPhase = 'collecting';
      return "I see you mentioned a location. Are you reporting something that happened there? Please tell me more about what occurred.";
    }

    // General conversational responses based on context
    if (hasRecentCrimeDiscussion) {
      return "I'm still here listening. If you want to report another incident or add more details, just let me know. How else can I help you today?";
    }

    // Default responses
    const defaultResponses = [
      "I'm here to help! You can report safety incidents, ask questions, or just tell me what's on your mind.",
      "Thanks for reaching out. Is there something happening in your area that you'd like to report?",
      "I'm listening. Feel free to share whatever's concerning you or if you've witnessed something that should be reported."
    ];

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
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
