/**
 * Test script for location extraction and geocoding
 * Run with: npx tsx test-location-extraction.ts
 */

import { extractCoordinates, geocodeLocation } from './src/lib/locationUtils';

async function testLocationExtraction() {
  console.log('🧪 Testing Location Extraction & Geocoding\n');

  const testCases = [
    'CBD near Archives',
    'cbd near archives',
    'Westlands Mall',
    'Kikuyu Road',
    'Nairobi CBD',
    'near Uhuru Park',
    'at Tom Mboya Street',
    'Kasarani'
  ];

  for (const location of testCases) {
    console.log(`\n📍 Testing: "${location}"`);
    const coords = await extractCoordinates(location);
    if (coords) {
      console.log(`   ✅ Coordinates: [${coords[0]}, ${coords[1]}]`);
      console.log(`   🗺️  https://www.google.com/maps?q=${coords[1]},${coords[0]}`);
    } else {
      console.log(`   ❌ Failed to geocode`);
    }
  }

  console.log('\n\n🔍 Direct Geocoding Test:');
  const directTest = await geocodeLocation('CBD near Archives');
  console.log('Result:', directTest);
}

testLocationExtraction().catch(console.error);
