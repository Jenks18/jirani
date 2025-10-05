#!/usr/bin/env node

/**
 * Test script to verify WhatsApp -> Supabase -> Map flow
 * This simulates the complete end-to-end workflow
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Test WhatsApp message payload
const testWhatsAppPayload = {
  entry: [{
    id: 'test-entry',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        messages: [{
          from: '+1234567890',
          text: {
            body: 'There was a theft at Westlands, Nairobi. Someone stole my phone near the shopping center.'
          },
          type: 'text',
          timestamp: Math.floor(Date.now() / 1000).toString()
        }]
      }
    }]
  }]
};

// Test confirmation payload
const confirmationPayload = {
  entry: [{
    id: 'test-entry',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        messages: [{
          from: '+1234567890',
          text: {
            body: 'yes'
          },
          type: 'text',
          timestamp: Math.floor(Date.now() / 1000).toString()
        }]
      }
    }]
  }]
};

async function testWhatsAppFlow() {
  console.log('🧪 Testing WhatsApp to Map Flow...\n');
  
  try {
    // Step 1: Send initial message to WhatsApp webhook
    console.log('📱 Step 1: Sending WhatsApp message...');
    const whatsappResponse = await fetch(`${BASE_URL}/api/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testWhatsAppPayload)
    });
    
    if (!whatsappResponse.ok) {
      throw new Error(`WhatsApp webhook failed: ${whatsappResponse.status}`);
    }
    
    const whatsappResult = await whatsappResponse.json();
    console.log('✅ WhatsApp webhook response:', whatsappResult.reply);
    
    // Step 2: Send confirmation
    console.log('\n📱 Step 2: Confirming the report...');
    const confirmResponse = await fetch(`${BASE_URL}/api/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(confirmationPayload)
    });
    
    if (!confirmResponse.ok) {
      throw new Error(`Confirmation failed: ${confirmResponse.status}`);
    }
    
    const confirmResult = await confirmResponse.json();
    console.log('✅ Confirmation response:', confirmResult.reply);
    
    // Step 3: Wait a moment for processing
    console.log('\n⏳ Waiting for processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 4: Check if event appears in the events API (used by map)
    console.log('\n🗺️  Step 3: Checking events API (Map data source)...');
    const eventsResponse = await fetch(`${BASE_URL}/api/events`);
    
    if (!eventsResponse.ok) {
      throw new Error(`Events API failed: ${eventsResponse.status}`);
    }
    
    const eventsData = await eventsResponse.json();
    console.log(`✅ Found ${eventsData.total} events in the database`);
    
    // Look for our test event
    const testEvent = eventsData.events.find(event => 
      event.description?.includes('phone') && 
      event.location?.includes('Westlands')
    );
    
    if (testEvent) {
      console.log('🎉 SUCCESS: Test event found on map!');
      console.log('Event details:', {
        id: testEvent.id,
        type: testEvent.type,
        location: testEvent.location,
        coordinates: testEvent.coordinates,
        description: testEvent.description?.substring(0, 100) + '...'
      });
    } else {
      console.log('⚠️  Test event not found - may need manual confirmation or processing');
      console.log('Latest events:', eventsData.events.slice(0, 3).map(e => ({
        id: e.id,
        type: e.type,
        location: e.location
      })));
    }
    
    // Step 5: Test direct report storage (alternative method)
    console.log('\n📝 Step 4: Testing direct report storage...');
    const directReportPayload = {
      type: 'Test Incident',
      severity: 2,
      location: 'Test Location, Nairobi',
      description: 'This is a test report from the automated test',
      coordinates: [36.8219, -1.2921], // Nairobi coordinates
      timestamp: new Date().toISOString(),
      from: '+1234567890'
    };
    
    const storeResponse = await fetch(`${BASE_URL}/api/store-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(directReportPayload)
    });
    
    if (storeResponse.ok) {
      const storeResult = await storeResponse.json();
      console.log('✅ Direct storage successful:', storeResult.id);
    } else {
      console.log('⚠️  Direct storage failed:', await storeResponse.text());
    }
    
    console.log('\n🏁 Flow test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testWhatsAppFlow();
}

module.exports = { testWhatsAppFlow };
