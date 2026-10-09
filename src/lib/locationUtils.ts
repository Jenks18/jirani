import { debug } from './log';
import { MAPBOX_TOKEN } from './mapConfig';

// Dynamic geocoding using Mapbox - no hardcoded locations
// This allows the system to handle ANY location in Kenya that users report

export async function geocodeLocation(locationString: string): Promise<[number, number] | null> {

  try {
    // Add "Nairobi, Kenya" for better accuracy with malls and specific locations
    const query = encodeURIComponent(`${locationString}, Nairobi, Kenya`);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}&limit=3&country=ke&types=poi,address,place`;
    
    debug(`🗺️  Geocoding with Mapbox: "${locationString}"`);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      // Prioritize POI (point of interest) results for malls/landmarks
      interface MapboxFeature {
        place_type?: string[];
        center: [number, number];
        place_name?: string;
      }
      
      const poiResult = data.features.find((f: MapboxFeature) => f.place_type?.includes('poi'));
      const feature: MapboxFeature = poiResult || data.features[0];
      
      const [lng, lat] = feature.center;
      debug(`✅ Geocoded to: [${lng}, ${lat}] - ${feature.place_name}`);
      debug(`   Place type: ${feature.place_type?.join(', ')}`);
      return [lng, lat];
    }
    
    debug(`⚠️  No Mapbox results for: "${locationString}"`);
    return null;
  } catch (error) {
    console.error(`❌ Geocoding error for "${locationString}":`, error);
    return null;
  }
}

export async function extractCoordinates(location: string): Promise<[number, number] | null> {
  if (!location) {
    debug('❌ extractCoordinates: No location provided');
    return null;
  }
  
  const cleanLocation = location.trim();
  debug(`🔍 Geocoding location from incident report: "${cleanLocation}"`);
  
  // Always use Mapbox geocoding API - no cache, no hardcoded locations
  // This ensures we get accurate coordinates for ANY location in Kenya
  const geocoded = await geocodeLocation(cleanLocation);
  
  if (geocoded) {
    debug(`✅ Successfully geocoded: "${cleanLocation}" -> [${geocoded[0]}, ${geocoded[1]}]`);
    return geocoded;
  }
  
  // If geocoding fails, return null (incident will be saved without coordinates)
  console.error(`❌ FAILED to geocode location: "${cleanLocation}"`);
  return null;
}
