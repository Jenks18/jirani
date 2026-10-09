/**
 * Public Mapbox token (pk.*), supplied via NEXT_PUBLIC_MAPBOX_TOKEN. Restrict it by URL
 * (jirani.the625movement.com, maps.the625movement.com) in the Mapbox dashboard.
 */
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

export const NAIROBI: [number, number] = [36.8219, -1.2921];
export const KENYA_BOUNDS: [[number, number], [number, number]] = [
  [33.5, -4.9],
  [42.0, 5.2],
];
