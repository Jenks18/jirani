// Dynamic geocoding using Mapbox - no hardcoded locations
// This allows the system to handle ANY location in Kenya that users report

export async function geocodeLocation(locationString: string): Promise<[number, number] | null> {
  // Use Mapbox Geocoding API (same token as frontend map)
  const MAPBOX_TOKEN = 'pk.eyJ1IjoieWF6enlqZW5rcyIsImEiOiJjbWU2b2o0eXkxNDFmMm1vbGY3dWt5aXViIn0.8hEu3t-bv3R3kGsBb_PIcw';

  try {
    // Add "Nairobi, Kenya" for better accuracy with malls and specific locations
    const query = encodeURIComponent(`${locationString}, Nairobi, Kenya`);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}&limit=3&country=ke&types=poi,address,place`;
    
    console.log(`🗺️  Geocoding with Mapbox: "${locationString}"`);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      // Prioritize POI (point of interest) results for malls/landmarks
      const poiResult = data.features.find((f: any) => f.place_type?.includes('poi'));
      const feature = poiResult || data.features[0];
      
      const [lng, lat] = feature.center;
      console.log(`✅ Geocoded to: [${lng}, ${lat}] - ${feature.place_name}`);
      console.log(`   Place type: ${feature.place_type?.join(', ')}`);
      return [lng, lat];
    }
    
    console.log(`⚠️  No Mapbox results for: "${locationString}"`);
    return null;
  } catch (error) {
    console.error(`❌ Geocoding error for "${locationString}":`, error);
    return null;
  }
}

export async function extractCoordinates(location: string): Promise<[number, number] | null> {
  if (!location) {
    console.log('❌ extractCoordinates: No location provided');
    return null;
  }
  
  const cleanLocation = location.trim();
  console.log(`🔍 Geocoding location from incident report: "${cleanLocation}"`);
  
  // Always use Mapbox geocoding API - no cache, no hardcoded locations
  // This ensures we get accurate coordinates for ANY location in Kenya
  const geocoded = await geocodeLocation(cleanLocation);
  
  if (geocoded) {
    console.log(`✅ Successfully geocoded: "${cleanLocation}" -> [${geocoded[0]}, ${geocoded[1]}]`);
    return geocoded;
  }
  
  // If geocoding fails, return null (incident will be saved without coordinates)
  console.error(`❌ FAILED to geocode location: "${cleanLocation}"`);
  return null;
}
