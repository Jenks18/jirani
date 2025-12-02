// Simple location coordinate lookup for Kenya
interface LocationCoords {
  [key: string]: [number, number]; // [longitude, latitude]
}

// Common locations in Kenya with coordinates
const KENYA_LOCATIONS: LocationCoords = {
  // Nairobi areas
  'nairobi': [36.8219, -1.2921],
  'cbd': [36.8219, -1.2873],
  'cbd roundabout': [36.8219, -1.2873],
  'uhuru highway roundabout': [36.8167, -1.2833],
  'westlands': [36.8097, -1.2676],
  'karen': [36.6855, -1.3197],
  'ngong': [36.6678, -1.3524],
  'kibera': [36.7873, -1.3133],
  'eastleigh': [36.8442, -1.2864],
  'kasarani': [36.8972, -1.2202],
  'kawangware': [36.7440, -1.2835],
  'dandora': [36.8945, -1.2544],
  'mathare': [36.8583, -1.2594],
  
  // Malls & landmarks
  'junction mall': [36.8219, -1.2921],
  'sarit centre': [36.7870, -1.2634],
  'yaya centre': [36.7884, -1.2895],
  'westgate mall': [36.8065, -1.2674],
  'village market': [36.8065, -1.2343],
  'two rivers mall': [36.8844, -1.2283],
  'thika road mall': [36.8844, -1.2283],
  
  // Major cities
  'mombasa': [39.6682, -4.0435],
  'kisumu': [34.7617, -0.0917],
  'nakuru': [36.0667, -0.3031],
  'eldoret': [35.2699, 0.5143],
  'thika': [37.0692, -1.0332],
  'meru': [37.6551, 0.0467],
  'kisii': [34.7720, -0.6789],
  'kakamega': [34.7520, 0.2827],
  'kitale': [35.0063, 1.0167],
  'garissa': [39.6401, -0.4536],
  
  // Universities and institutions
  'university of nairobi': [36.8309, -1.2966],
  'kenyatta university': [36.9301, -1.1748],
  'strathmore university': [36.7879, -1.3107],
  'usiu': [36.8865, -1.2324],
  
  // Landmarks
  'uhuru park': [36.8156, -1.2884],
  'central park': [36.8226, -1.2884],
  'city market': [36.8284, -1.2884],
  'railway station': [36.8284, -1.2884],
  'kenyatta avenue': [36.8219, -1.2884],
  'tom mboya street': [36.8234, -1.2884],
  'moi avenue': [36.8219, -1.2864]
};

export async function geocodeLocation(locationString: string): Promise<[number, number] | null> {
  // Use Google Maps Geocoding API
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  
  if (!GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_API_KEY not configured');
    return null;
  }

  try {
    // Add "Nairobi, Kenya" to improve accuracy if not already present
    const searchQuery = locationString.includes('Kenya') || locationString.includes('Nairobi')
      ? locationString
      : `${locationString}, Nairobi, Kenya`;
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${GOOGLE_API_KEY}`;
    
    console.log(`🗺️  Geocoding with Google Maps: "${searchQuery}"`);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      const lng = location.lng;
      const lat = location.lat;
      console.log(`✅ Geocoded to: [${lng}, ${lat}] - ${data.results[0].formatted_address}`);
      return [lng, lat];
    }
    
    console.log(`⚠️  Google Maps returned: ${data.status} for "${locationString}"`);
    return null;
  } catch (error) {
    console.error(`❌ Geocoding error for "${locationString}":`, error);
    return null;
  }
}

export async function extractCoordinates(location: string): Promise<[number, number] | null> {
  if (!location) return null;
  
  const lowerLocation = location.toLowerCase().trim();
  
  // Try direct match first (fast)
  if (KENYA_LOCATIONS[lowerLocation]) {
    console.log(`✅ Found in cache: ${lowerLocation}`);
    return KENYA_LOCATIONS[lowerLocation];
  }
  
  // Try partial match (fast)
  for (const [name, coords] of Object.entries(KENYA_LOCATIONS)) {
    if (lowerLocation.includes(name) || name.includes(lowerLocation)) {
      console.log(`✅ Partial match in cache: ${name}`);
      return coords;
    }
  }
  
  // MUST use geocoding API - no defaults
  console.log(`🔍 No cache match, trying geocoding for: "${location}"`);
  const geocoded = await geocodeLocation(location);
  
  if (geocoded) {
    // Cache the result for future lookups
    KENYA_LOCATIONS[lowerLocation] = geocoded;
    return geocoded;
  }
  
  // No default - return null if geocoding fails
  console.error(`❌ Failed to geocode location: "${location}"`);
  return null;
}

export function addLocation(name: string, coordinates: [number, number]) {
  KENYA_LOCATIONS[name.toLowerCase()] = coordinates;
}
