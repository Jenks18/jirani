'use client';

import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl';

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
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<Record<string, MapboxMarker | null>>({});
  const [events, setEvents] = useState<Event[]>([]);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);

  // Load Mapbox GL JS dynamically
  useEffect(() => {
    const loadMapbox = async () => {
      try {
        if (typeof window !== 'undefined') {
          // Dynamic import of Mapbox GL JS
          await import('mapbox-gl');
          // We don't keep a global reference here; other effects will import as needed
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
      
      interface ReportAPI {
        _id?: string;
        id?: string;
        type?: string;
        severity?: number;
        location?: string;
        summary?: string;
        dateTime?: string;
        coordinates?: { coordinates: [number, number] };
        sourceType?: string;
        images?: string[];
      }

      const transformedEvents: Event[] = reports.map((report: ReportAPI) => ({
        id: report._id || report.id || Math.random().toString(36).slice(2,9),
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
    if (!mapboxLoaded || !mapContainer.current || mapInitialized) {
      return;
    }

    const init = async () => {
      try {
        const mapboxModule = await import('mapbox-gl');
        const mb = mapboxModule.default;
        mb.accessToken = "pk.eyJ1IjoieWF6enlqZW5rcyIsImEiOiJjbWU2b2o0eXkxNDFmMm1vbGY3dWt5aXViIn0.8hEu3t-bv3R3kGsBb_PIcw";

        const map = new mb.Map({
          container: mapContainer.current as HTMLDivElement,
          style: "mapbox://styles/mapbox/light-v11",
          center: [36.8219, -1.2921], // Nairobi coordinates
          zoom: 10,
          pitch: 0,
          bearing: 0,
        });

        mapRef.current = map as unknown as MapboxMap;
        setMapInitialized(true);

        map.on('load', () => {
          console.log('Map loaded successfully');
        });
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    init();
  }, [mapboxLoaded, mapInitialized]);

  // Update markers when events change
  useEffect(() => {
    if (!mapRef.current) return;

    const update = async () => {
      try {
        const mapboxModule = await import('mapbox-gl');
        const mb = mapboxModule.default;

        // Clear existing markers
        Object.values(markersRef.current).forEach((marker) => marker?.remove());
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
            } as Record<number, string>;
            el.style.backgroundColor = colors[event.severity] || "#6b7280";

            const marker = new mb.Marker(el)
              .setLngLat([event.coordinates[1], event.coordinates[0]])
              .addTo(mapRef.current as MapboxMap);

            markersRef.current[event.id] = marker as unknown as MapboxMarker;
          } catch (error) {
            console.error('Error adding marker:', error);
          }
        });
      } catch (error) {
        console.error('Marker update failed:', error);
      }
    };

    update();
  }, [events, mapInitialized]);

  // Fetch events on mount
  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Update marker visuals when highlightedEventId changes
  useEffect(() => {
    if (!highlightedEventId) return;
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const el = marker?.getElement?.() as HTMLElement | undefined;
      if (!el) return;
      if (id === highlightedEventId) {
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.6)';
      } else {
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.boxShadow = '';
      }
    });
  }, [highlightedEventId]);

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
        Events: {events.length}
      </div>
    </div>
  );
}
