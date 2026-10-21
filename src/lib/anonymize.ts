export const COORD_STEP = 0.003;

const HOUR_MS = 3_600_000;

export const snapCoord = (value: number): number => Math.round(Math.round(value / COORD_STEP) * COORD_STEP * 1000) / 1000;

export const coarsenPoint = ([lng, lat]: [number, number]): [number, number] => [snapCoord(lng), snapCoord(lat)];

export function floorToHour(input?: string | number | Date | null, now = Date.now()): string {
  const parsed = input == null || input === '' ? NaN : new Date(input).getTime();
  const t = Number.isFinite(parsed) && parsed <= now ? parsed : now;
  return new Date(Math.floor(t / HOUR_MS) * HOUR_MS).toISOString();
}

const PATTERNS: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email removed]'],
  [/\bhttps?:\/\/\S+|\bwww\.\S+/gi, '[link removed]'],
  [/-?\d{1,3}\.\d{3,}\s*[,;/]?\s*-?\d{1,3}\.\d{3,}/g, 'a shared location'],
  [/\+\d[\d\s().-]{7,}\d/g, '[number removed]'],
  [/\b(?:254|0)[17]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/g, '[number removed]'],
  [/\b\d{9,}\b/g, '[number removed]'],
  [/\bK[A-Z]{2}\s?\d{3}\s?[A-Z]\b/gi, '[plate removed]'],
  [/\bK[MT][A-Z]{2}\s?\d{3}\s?[A-Z]\b/gi, '[plate removed]'],
  [/\b(number\s*plate|plate|registration|reg)\s*(?:no\.?|number|#)?\s*:?\s*[A-Z]{0,4}\s?\d{2,6}\s?[A-Z]{0,2}\b/gi, '$1 [removed]'],
  [/\b(id|national id|passport)\s*(?:no\.?|number|#)?\s*:?\s*\d{6,9}\b/gi, '$1 [removed]'],
];

export function scrubText(input: string, max = 400): string {
  let out = input;
  for (const [pattern, replacement] of PATTERNS) out = out.replace(pattern, replacement);
  return out.replace(/\s+/g, ' ').trim().slice(0, max);
}

const COORD_PAIR = /(-?\d{1,3}\.\d{3,})\s*[,;/]?\s*(-?\d{1,3}\.\d{3,})/;

export function parseCoordinateText(text: string): { lat: number; lng: number } | null {
  const m = COORD_PAIR.exec(text);
  if (!m) return null;
  const lat = Number.parseFloat(m[1]);
  const lng = Number.parseFloat(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

export function publicPlace(
  location: string,
  point: { lat: number; lng: number } | null,
  resolveArea: (lat: number, lng: number) => string | null
): string {
  if (COORD_PAIR.test(location)) {
    const where = point ?? parseCoordinateText(location);
    const area = where ? resolveArea(where.lat, where.lng) : null;
    return area ? `Near ${area}` : 'Shared location';
  }
  return scrubText(location, 120) || 'Unknown location';
}

const CANONICAL_TYPES = ['Theft', 'Robbery', 'Burglary', 'Assault', 'Harassment', 'Vandalism', 'Suspicious Activity', 'Other'];

export function publicType(type: string | undefined): string {
  const t = (type ?? '').trim();
  return CANONICAL_TYPES.find((c) => c.toLowerCase() === t.toLowerCase()) ?? (scrubText(t, 40) || 'Other');
}
