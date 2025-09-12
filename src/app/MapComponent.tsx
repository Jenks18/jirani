'use client';

import { useEffect, useRef, useState } from "react";

interface Event {
  id: string;
  type: string;
  severity: number;
  location: string;
  description: string;
  timestamp: string;
  coordinates: [number, number] | null;
  from: string;
  createdAt: string;
  images?: string[];
}

interface MapComponentProps {
  highlightedEventId?: string | null;
  sidebarCollapsed?: boolean;
  reportsPanelCollapsed?: boolean;
}

export default function MapComponent({ highlightedEventId, sidebarCollapsed, reportsPanelCollapsed }: MapComponentProps) {
  // Resize map when sidebar is collapsed/expanded
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.resize();
      }, 350); // Wait for sidebar/reports panel transition to finish
    }
  }, [sidebarCollapsed, reportsPanelCollapsed]);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const [events, setEvents] = useState<Event[]>([]);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);

  // Dynamically import Mapbox to ensure client-side only
  useEffect(() => {
    const loadMapbox = async () => {
      try {
        await import('mapbox-gl');
        setMapboxLoaded(true);
      } catch (error) {
        console.error('Failed to load Mapbox:', error);
      }
    };

    if (typeof window !== 'undefined') {
      loadMapbox();
      
      // Inject essential CSS to prevent detection warnings
      const cssId = 'mapbox-gl-essential-css';
      if (!document.getElementById(cssId)) {
        const style = document.createElement('style');
        style.id = cssId;
        style.textContent = `
          .mapboxgl-map { font: 12px/20px 'Helvetica Neue', Arial, Helvetica, sans-serif; overflow: hidden; position: relative; }
          .mapboxgl-canvas { position: absolute; left: 0; top: 0; }
          .mapboxgl-canvas-container { overflow: hidden; }
          .mapboxgl-ctrl { border-radius: 3px; box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1); clear: both; pointer-events: auto; }
          .mapboxgl-ctrl-group { border-radius: 4px; background: #fff; }
          .mapboxgl-popup { position: absolute; top: 0; left: 0; display: flex; will-change: transform; pointer-events: none; }
          .mapboxgl-popup-content { position: relative; background: #fff; border-radius: 3px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); padding: 10px 10px 15px; pointer-events: auto; }
          .mapboxgl-popup-close-button { position: absolute; right: 0; top: 0; border: 0; border-radius: 0 3px 0 0; cursor: pointer; background-color: transparent; }
          .mapboxgl-popup-tip { width: 0; height: 0; border: 10px solid transparent; z-index: 1; }
          .mapboxgl-marker { position: absolute; top: 0; left: 0; will-change: transform; }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/reports');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      const reports = data.reports || [];
  console.log('Fetched reports from API:', reports);
      
      const transformedEvents: Event[] = reports.map((report: {
        id: string;
        type: string;
        severity: number;
        summary: string;
        dateTime: string;
        sourceType: string;
        location?: string;
        coordinates?: { coordinates: [number, number] };
        images?: string[];
      }) => ({
        id: report.id,
        type: report.type,
        severity: report.severity,
        location: report.location || 'Unknown',
        description: report.summary,
        timestamp: report.dateTime,
        coordinates: report.coordinates?.coordinates ? 
          [report.coordinates.coordinates[1], report.coordinates.coordinates[0]] : null,
        from: report.sourceType,
        createdAt: report.dateTime,
        images: report.images || []
      }));
  console.log('Transformed events for map:', transformedEvents);
      
      setEvents(transformedEvents);
    } catch (error) {
      console.error('API fetch failed:', error);
      // Fallback data
      setEvents([{
        id: "test-1",
        type: "Phone theft",
        severity: 3,
        location: "Nairobi, Kenya",
        description: "Incident reported near CBD",
        timestamp: new Date().toISOString(),
        coordinates: [-1.2921, 36.8219],
        from: "WhatsApp",
        createdAt: new Date().toISOString()
      }]);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapboxLoaded || !mapContainer.current || mapInitialized) return;

    const initMap = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        mapboxgl.accessToken = "pk.eyJ1IjoieWF6enlqZW5rcyIsImEiOiJjbWU2b2o0eXkxNDFmMm1vbGY3dWt5aXViIn0.8hEu3t-bv3R3kGsBb_PIcw";
        
        // Ensure CSS is loaded - inject it if not detected
        const cssLink = document.querySelector('link[href*="mapbox-gl.css"]');
        if (!cssLink) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
          document.head.appendChild(link);
          
          // Wait a bit for CSS to load
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const map = new mapboxgl.Map({
          container: mapContainer.current!,
          style: "mapbox://styles/mapbox/light-v11",
          center: [36.8219, -1.2921],
          zoom: 10
        });

        mapRef.current = map;
        setMapInitialized(true);
      } catch (error) {
        console.error('Map init failed:', error);
      }
    };

    initMap();
  }, [mapboxLoaded, mapInitialized]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !events.length || !mapInitialized) return;

    const updateMarkers = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        
        // Clear existing markers
        Object.values(markersRef.current).forEach(marker => marker.remove());
        markersRef.current = {};

        // Add new markers
        events.forEach((event) => {
          if (!event.coordinates) {
            console.log('Skipping event with no coordinates:', event);
            return;
          }
          console.log('Adding marker for event:', event);
          const el = document.createElement("div");
          el.style.width = highlightedEventId === event.id ? "24px" : "16px";
          el.style.height = highlightedEventId === event.id ? "24px" : "16px";
          el.style.borderRadius = "50%";
          el.style.border = "2px solid white";
          el.style.cursor = "pointer";
          el.style.boxShadow = highlightedEventId === event.id ? "0 4px 16px rgba(0,0,0,0.8)" : "0 2px 6px rgba(0,0,0,0.4)";
          const colors = {
            1: "#22c55e", 2: "#eab308", 3: "#f97316", 4: "#ef4444", 5: "#dc2626"
          };
          el.style.backgroundColor = colors[event.severity as keyof typeof colors] || "#6b7280";
          // Create popup
          const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: true,
            closeOnClick: false
          }).setHTML(`
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #333;">${event.type}</h3>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #666;"><strong>Location:</strong> ${event.location}</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #666;"><strong>Severity:</strong> ${event.severity}/5</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #666;">${event.description}</p>
              <p style="margin: 0; font-size: 12px; color: #888;">${new Date(event.createdAt).toLocaleString()}</p>
            </div>
          `);
          const marker = new mapboxgl.Marker(el)
            .setLngLat([event.coordinates[1], event.coordinates[0]])
            .setPopup(popup)
            .addTo(mapRef.current!);
          markersRef.current[event.id] = marker;
        });
      } catch (error) {
        console.error('Marker update failed:', error);
      }
    };

    updateMarkers();
  }, [events, mapInitialized, highlightedEventId]);

  // Fetch data on mount
  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!mapboxLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Status indicator */}
      <div className="absolute top-4 right-4 bg-white rounded shadow px-3 py-1 text-sm">
        Events: {events.length} | Status: {mapInitialized ? 'Ready' : 'Loading'}
      </div>
      
      {/* Navigation */}
      <div className="absolute top-1/2 right-4 transform -translate-y-1/2 flex flex-col space-y-1">
        <button 
          onClick={async () => {
            if (mapRef.current) mapRef.current.zoomIn();
          }}
          className="w-10 h-10 bg-white rounded shadow-lg border flex items-center justify-center text-lg font-bold hover:bg-gray-50"
        >
          +
        </button>
        <button 
          onClick={async () => {
            if (mapRef.current) mapRef.current.zoomOut();
          }}
          className="w-10 h-10 bg-white rounded shadow-lg border flex items-center justify-center text-lg font-bold hover:bg-gray-50"
        >
          −
        </button>
        <button 
          onClick={async () => {
            if (mapRef.current) {
              mapRef.current.flyTo({ center: [36.8219, -1.2921], zoom: 10 });
            }
          }}
          className="w-10 h-10 bg-white rounded shadow-lg border flex items-center justify-center text-sm font-bold hover:bg-gray-50"
          title="Reset to Nairobi"
        >
          ⌂
        </button>
      </div>
    </div>
  );
}
