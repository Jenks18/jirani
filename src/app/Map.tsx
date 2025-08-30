import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

export default function Map({ mapboxToken }: { mapboxToken: string }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;
    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
  center: [36.8219, -1.2921], // Nairobi, Kenya
      zoom: 15,
      pitch: 60,
      bearing: -17.6,
      antialias: true,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addLayer({
        id: "3d-buildings",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 15,
        paint: {
          "fill-extrusion-color": "#aaa",
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "min_height"],
          "fill-extrusion-opacity": 0.6,
        },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
