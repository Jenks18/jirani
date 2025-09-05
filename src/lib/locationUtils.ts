// Simple location coordinate lookup for Kenya
interface LocationCoords {
  [key: string]: [number, number]; // [longitude, latitude]
}

// Common locations in Kenya with coordinates
const KENYA_LOCATIONS: LocationCoords = {
  // Nairobi areas
  'nairobi': [36.8219, -1.2921],
  'westlands': [36.8097, -1.2676],
  'karen': [36.6855, -1.3197],
  'ngong': [36.6678, -1.3524],
  'kibera': [36.7873, -1.3133],
  'eastleigh': [36.8442, -1.2864],
  'kasarani': [36.8972, -1.2202],
  'kawangware': [36.7440, -1.2835],
  'dandora': [36.8945, -1.2544],
  'mathare': [36.8583, -1.2594],
  
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

export function extractCoordinates(location: string): [number, number] | null {
  if (!location) return null;
  
  const lowerLocation = location.toLowerCase().trim();
  
  // Direct match
  if (KENYA_LOCATIONS[lowerLocation]) {
    return KENYA_LOCATIONS[lowerLocation];
  }
  
  // Partial match
  for (const [name, coords] of Object.entries(KENYA_LOCATIONS)) {
    if (lowerLocation.includes(name) || name.includes(lowerLocation)) {
      return coords;
    }
  }
  
  // Default to Nairobi if no match found
  console.log(`Location '${location}' not found, defaulting to Nairobi`);
  return KENYA_LOCATIONS['nairobi'];
}

export function addLocation(name: string, coordinates: [number, number]) {
  KENYA_LOCATIONS[name.toLowerCase()] = coordinates;
}
