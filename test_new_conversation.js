const conversationManager = require('./src/lib/whatsappConversation.ts').conversationManager;

// Test conversation flow
console.log('=== Testing New WhatsApp Conversation System ===\n');

const testUserId = 'test-user-123';

// Test 1: Initial greeting
console.log('1. User says: "ola"');
let result = conversationManager.processMessage(testUserId, 'ola');
console.log('Bot responds:', result.response);
console.log('Incident stored:', !!result.incident);
console.log('');

// Test 2: Report incident
console.log('2. User says: "i got robbed"');
result = conversationManager.processMessage(testUserId, 'i got robbed');
console.log('Bot responds:', result.response);
console.log('Incident stored:', !!result.incident);
console.log('');

// Test 3: Provide more details
console.log('3. User says: "someone stole headphones"');
result = conversationManager.processMessage(testUserId, 'someone stole headphones');
console.log('Bot responds:', result.response);
console.log('Incident stored:', !!result.incident);
console.log('');

// Test 4: Confirm incident
console.log('4. User says: "yes"');
result = conversationManager.processMessage(testUserId, 'yes');
console.log('Bot responds:', result.response);
console.log('Incident stored:', !!result.incident);
console.log('');

// Test 5: Try to add another incident
console.log('5. User says: "i want to add another one"');
result = conversationManager.processMessage(testUserId, 'i want to add another one');
console.log('Bot responds:', result.response);
console.log('Incident stored:', !!result.incident);
console.log('');

// Test 6: Provide new incident details
console.log('6. User says: "someone stole my phone near westlands"');
result = conversationManager.processMessage(testUserId, 'someone stole my phone near westlands');
console.log('Bot responds:', result.response);
console.log('Incident stored:', !!result.incident);
console.log('');

// Display conversation history
console.log('=== Full Conversation History ===');
console.log(conversationManager.getConversationHistory(testUserId));
