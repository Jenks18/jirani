/** Great-circle distance in metres. */
export function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const mapsUrl = (lat: number, lng: number) => `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`;

/** Normalise a phone number to digits only (E.164 without "+"), as WhatsApp uses. Returns null if implausible. */
export function normalizePhone(raw: string, defaultCountry = '254'): string | null {
  let d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = defaultCountry + d.slice(1);
  else if (d.length === 9) d = defaultCountry + d;
  return /^\d{10,15}$/.test(d) ? d : null;
}
