import { debug } from './log';
import { MAPBOX_TOKEN } from './mapConfig';
import { findPlace } from './placeSearch';

const KENYA_BBOX = '33.9,-4.8,41.95,5.6';

interface MapboxFeature {
  place_type?: string[];
  center: [number, number];
  place_name?: string;
  relevance?: number;
}

export async function geocodeLocation(locationString: string): Promise<[number, number] | null> {
  try {
    const place = await findPlace(locationString);
    if (place) {
      debug(`Place index matched "${locationString}" -> ${place.name}, ${place.subcounty}, ${place.county}`);
      return [place.lng, place.lat];
    }
  } catch (error) {
    console.error('Place index lookup failed, falling back to Mapbox:', error);
  }

  const query = encodeURIComponent(locationString);
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}` +
    `&limit=3&country=ke&bbox=${KENYA_BBOX}`;

  try {
    const response = await fetch(url);
    const data = response.ok ? ((await response.json()) as { features?: MapboxFeature[] }) : { features: [] };
    const best = (data.features ?? []).find((f) => (f.relevance ?? 0) >= 0.7);
    if (best) {
      const [lng, lat] = best.center;
      return [lng, lat];
    }
  } catch (error) {
    console.error(`Geocoding error for "${locationString}":`, error);
  }

  try {
    const area = await findPlace(locationString, { areaFallback: true });
    return area ? [area.lng, area.lat] : null;
  } catch {
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
  
  const geocoded = await geocodeLocation(cleanLocation);
  
  if (geocoded) {
    debug(`✅ Successfully geocoded: "${cleanLocation}" -> [${geocoded[0]}, ${geocoded[1]}]`);
    return geocoded;
  }
  
  console.error(`❌ FAILED to geocode location: "${cleanLocation}"`);
  return null;
}
