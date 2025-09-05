import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";

interface Event {
  id: string;
  type: string;
  severity: number;
  location: string;
  description: string;
  coordinates: [number, number] | null;
  timestamp: string;
  hasImages: boolean;
}

export default function Map({ mapboxToken }: { mapboxToken: string }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
    // Refresh events every 30 seconds
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;
    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [36.8219, -1.2921], // Nairobi, Kenya
      zoom: 12,
      pitch: 45,
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

  // Add event markers to map
  useEffect(() => {
    if (!mapRef.current || events.length === 0) return;

    const map = mapRef.current;

    // Clear existing markers
    const existingMarkers = document.querySelectorAll('.event-marker');
    existingMarkers.forEach(marker => marker.remove());

    events.forEach(event => {
      if (!event.coordinates) return;

      // Create marker color based on severity
      const getMarkerColor = (severity: number) => {
        switch (severity) {
          case 1: return '#22c55e'; // Green - minor
          case 2: return '#eab308'; // Yellow - moderate  
          case 3: return '#f97316'; // Orange - serious
          case 4: return '#ef4444'; // Red - major
          case 5: return '#7c2d12'; // Dark red - critical
          default: return '#6b7280'; // Gray - unknown
        }
      };

      // Create custom marker element
      const markerElement = document.createElement('div');
      markerElement.className = 'event-marker';
      markerElement.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: ${getMarkerColor(event.severity)};
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: transform 0.2s;
      `;

      markerElement.addEventListener('mouseenter', () => {
        markerElement.style.transform = 'scale(1.2)';
      });

      markerElement.addEventListener('mouseleave', () => {
        markerElement.style.transform = 'scale(1)';
      });

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="p-3 max-w-xs">
          <h3 class="font-bold text-sm mb-1">${event.type}</h3>
          <p class="text-xs text-gray-600 mb-2">${event.location}</p>
          <p class="text-xs mb-2">${event.description}</p>
          <div class="flex justify-between items-center text-xs">
            <span class="px-2 py-1 rounded text-white" style="background-color: ${getMarkerColor(event.severity)}">
              Severity ${event.severity}
            </span>
            ${event.hasImages ? '<span class="text-blue-500">📷 Images</span>' : ''}
          </div>
          <p class="text-xs text-gray-500 mt-1">${new Date(event.timestamp).toLocaleString()}</p>
        </div>
      `);

      // Add marker to map
      new mapboxgl.Marker(markerElement)
        .setLngLat(event.coordinates)
        .setPopup(popup)
        .addTo(map);
    });
  }, [events]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Event counter */}
      <div className="absolute top-4 right-4 bg-white p-2 rounded shadow">
        <p className="text-sm font-medium">{events.length} Events</p>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded shadow">
        <h4 className="text-xs font-bold mb-2">Severity Levels</h4>
        <div className="space-y-1">
          {[
            { level: 1, color: '#22c55e', label: 'Minor' },
            { level: 2, color: '#eab308', label: 'Moderate' },
            { level: 3, color: '#f97316', label: 'Serious' },
            { level: 4, color: '#ef4444', label: 'Major' },
            { level: 5, color: '#7c2d12', label: 'Critical' }
          ].map(item => (
            <div key={item.level} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full border border-white"
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
