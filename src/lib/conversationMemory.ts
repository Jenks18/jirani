// Simple conversation memory for WhatsApp users
interface ConversationState {
  userId: string;
  messages: {
    timestamp: Date;
    role: 'user' | 'assistant';
    content: string;
  }[];
  pendingEvent?: {
    type?: string;
    location?: string;
    description?: string;
    severity?: number;
    timestamp?: string;
  };
  pendingConfirmation?: {
    type: string;
    location: string;
    description: string;
    timestamp: string;
  };
  lastActivity: Date;
}

// In-memory conversation storage (replace with database in production)
const conversations = new Map<string, ConversationState>();

// Clean up old conversations (older than 1 hour)
const CONVERSATION_TIMEOUT = 60 * 60 * 1000; // 1 hour

export function cleanupOldConversations() {
  const now = new Date();
  for (const [userId, conversation] of conversations.entries()) {
    if (now.getTime() - conversation.lastActivity.getTime() > CONVERSATION_TIMEOUT) {
      conversations.delete(userId);
    }
  }
}

export function getConversation(userId: string): ConversationState {
  // Clean up old conversations first
  cleanupOldConversations();
  
  if (!conversations.has(userId)) {
    conversations.set(userId, {
      userId,
      messages: [],
      lastActivity: new Date(),
    });
  }
  
  const conversation = conversations.get(userId)!;
  conversation.lastActivity = new Date();
  return conversation;
}

export function addMessageToConversation(userId: string, role: 'user' | 'assistant', content: string) {
  const conversation = getConversation(userId);
  conversation.messages.push({
    timestamp: new Date(),
    role,
    content
  });
  
  // Keep only last 10 messages to prevent memory bloat
  if (conversation.messages.length > 10) {
    conversation.messages = conversation.messages.slice(-10);
  }
}

export function getConversationHistory(userId: string): string {
  const conversation = getConversation(userId);
  
  if (conversation.messages.length === 0) {
    return "This is the start of the conversation.";
  }
  
  return conversation.messages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');
}

export function updatePendingEvent(userId: string, eventData: Partial<ConversationState['pendingEvent']>) {
  const conversation = getConversation(userId);
  if (!conversation.pendingEvent) {
    conversation.pendingEvent = {};
  }
  Object.assign(conversation.pendingEvent, eventData);
}

export function setPendingConfirmation(userId: string, confirmationData: ConversationState['pendingConfirmation']) {
  const conversation = getConversation(userId);
  conversation.pendingConfirmation = confirmationData;
}

export function getPendingConfirmation(userId: string) {
  const conversation = getConversation(userId);
  return conversation.pendingConfirmation;
}

export function clearPendingConfirmation(userId: string) {
  const conversation = getConversation(userId);
  delete conversation.pendingConfirmation;
}

export function getPendingEvent(userId: string) {
  const conversation = getConversation(userId);
  return conversation.pendingEvent;
}

export function clearPendingEvent(userId: string) {
  const conversation = getConversation(userId);
  delete conversation.pendingEvent;
}
