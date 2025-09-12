'use client';

import { useEffect, useRef, useState } from "react";

// Import Mapbox dynamically to avoid SSR issues
let mapboxgl: any = null;

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
}

export default function MapComponent({ highlightedEventId }: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [events, setEvents] = useState<Event[]>([]);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [renderCount, setRenderCount] = useState(0);

  // Increment render count
  useEffect(() => {
    setRenderCount(prev => prev + 1);
  });

  // Load Mapbox GL JS dynamically
  useEffect(() => {
    const loadMapbox = async () => {
      try {
        if (typeof window !== 'undefined') {
          // Dynamic import of Mapbox GL JS
          const mapboxModule = await import('mapbox-gl');
          mapboxgl = mapboxModule.default;
          setMapboxLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load Mapbox GL JS:', error);
      }
    };

    loadMapbox();
  }, []);

  // Fetch events with comprehensive error handling
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/reports');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const reports = data.reports || [];
      
      const transformedEvents: Event[] = reports.map((report: any) => ({
        id: report._id,
        type: report.type,
        severity: report.severity,
        location: report.location || 'Unknown location',
        description: report.summary,
        timestamp: report.dateTime,
        coordinates: report.coordinates?.coordinates ? 
          [report.coordinates.coordinates[1], report.coordinates.coordinates[0]] as [number, number] : null,
        from: report.sourceType,
        createdAt: report.dateTime,
        images: report.images || []
      }));
      
      setEvents(transformedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      // Set fallback data
      setEvents([{
        id: "fallback-1",
        type: "System Test",
        severity: 2,
        location: "Nairobi, Kenya",
        description: "Map is working with fallback data",
        timestamp: new Date().toISOString(),
        coordinates: [-1.2921, 36.8219] as [number, number],
        from: "FALLBACK",
        createdAt: new Date().toISOString(),
        images: []
      }]);
    }
  };

  // Initialize map only after Mapbox is loaded
  useEffect(() => {
    if (!mapboxLoaded || !mapboxgl || !mapContainer.current || mapInitialized) {
      return;
    }

    try {
      mapboxgl.accessToken = "pk.eyJ1IjoieWF6enlqZW5rcyIsImEiOiJjbWU2b2o0eXkxNDFmMm1vbGY3dWt5aXViIn0.8hEu3t-bv3R3kGsBb_PIcw";
      
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [36.8219, -1.2921], // Nairobi coordinates
        zoom: 10,
        pitch: 0,
        bearing: 0,
      });

      mapRef.current = map;
      setMapInitialized(true);

      map.on('load', () => {
        console.log('Map loaded successfully');
      });

    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [mapboxLoaded, mapInitialized]);

  // Update markers when events change
  useEffect(() => {
    if (!mapRef.current || !events.length) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker: any) => marker.remove());
    markersRef.current = {};

    // Add markers for events
    events.forEach((event) => {
      if (!event.coordinates) return;

      try {
        const el = document.createElement("div");
        el.className = "marker";
        el.style.width = "20px";
        el.style.height = "20px";
        el.style.borderRadius = "50%";
        el.style.border = "2px solid white";
        el.style.cursor = "pointer";
        
        // Color based on severity
        const colors = {
          1: "#22c55e", // Green
          2: "#eab308", // Yellow
          3: "#f97316", // Orange
          4: "#ef4444", // Red
          5: "#dc2626"  // Dark Red
        };
        el.style.backgroundColor = colors[event.severity as keyof typeof colors] || "#6b7280";

        const marker = new mapboxgl.Marker(el)
          .setLngLat([event.coordinates[1], event.coordinates[0]])
          .addTo(mapRef.current);

        markersRef.current[event.id] = marker;
      } catch (error) {
        console.error('Error adding marker:', error);
      }
    });
  }, [events, mapInitialized]);

  // Fetch events on mount
  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000); // Poll every 30 seconds
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
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute top-4 right-4 bg-white rounded shadow px-3 py-1 text-sm">
        Events: {events.length} | Renders: {renderCount}
      </div>
    </div>
  );
}
