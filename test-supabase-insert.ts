// Test script to verify Supabase insert works
// Run with: npx tsx test-supabase-insert.ts

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load .env.local manually
try {
  const envFile = readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      // Remove quotes if present
      const value = match[2].replace(/^["']|["']$/g, '');
      process.env[match[1]] = value;
    }
  });
} catch (e) {
  // .env.local doesn't exist, that's ok
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  console.log('🧪 Testing Supabase insert...\n');
  
  const testReport = {
    type: 'TEST - Theft/Robbery',
    severity: 3,
    location: 'CBD roundabout',
    summary: 'TEST REPORT - Someone grabbed headphones at CBD roundabout around 9pm. This is a test to verify the system works.',
    event_timestamp: new Date().toISOString(),
    longitude: 36.8219,
    latitude: -1.2873,
    from_phone: '+254TEST',
    images: null,
    source: 'test-script'
  };

  console.log('📤 Inserting test report:', testReport);
  
  try {
    const { data, error } = await supabase
      .from('reports')
      .insert(testReport)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Insert failed:', error);
      process.exit(1);
    }

    console.log('\n✅ SUCCESS! Report inserted:');
    console.log('   ID:', data.id);
    console.log('   Type:', data.type);
    console.log('   Location:', data.location);
    console.log('   Coordinates:', [data.longitude, data.latitude]);
    console.log('   Created:', data.created_at);
    console.log('\n🗺️  Check your map at: https://maps.the625movement.com');
    console.log('   The test report should appear as a marker!');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

testInsert();
