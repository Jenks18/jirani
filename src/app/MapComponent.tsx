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
  onMarkerClick?: (eventId: string) => void;
}

export default function MapComponent({ highlightedEventId, sidebarCollapsed, reportsPanelCollapsed, onMarkerClick }: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [events, setEvents] = useState<Event[]>([]);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);

  // Load Mapbox GL JS dynamically
  useEffect(() => {
    const loadMapbox = async () => {
      try {
        if (typeof window !== 'undefined') {
          await import('mapbox-gl');
          setMapboxLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load Mapbox GL JS:', error);
      }
    };

    loadMapbox();
  }, []);

  // Helper function to map severity strings to numbers
  const mapSeverityToNumber = (severity: string): number => {
    switch (severity.toLowerCase()) {
      case 'low': return 1;
      case 'medium': return 3;
      case 'high': return 5;
      default: return 2;
    }
  };

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
        id: report.id || Math.random().toString(36).slice(2,9),
        type: report.title || report.type || 'Unknown',
        severity: typeof report.severity === 'string' ? mapSeverityToNumber(report.severity) : report.severity || 2,
        location: report.location_name || report.location || 'Unknown location',
        description: report.description || report.summary || 'No description',
        timestamp: report.created_at || report.dateTime || new Date().toISOString(),
        coordinates: report.latitude && report.longitude ? 
          [report.latitude, report.longitude] as [number, number] : null,
        from: 'SUPABASE',
        createdAt: report.created_at || report.dateTime || new Date().toISOString(),
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

        // Add navigation controls (zoom, compass, etc.) - positioned on the right center
        map.addControl(new mb.NavigationControl(), 'top-right');

        mapRef.current = map;
        setMapInitialized(true);

        map.on('load', () => {
          console.log('Map loaded successfully');
          // Ensure map resizes to container
          setTimeout(() => {
            map.resize();
          }, 100);
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

            // Add click handler
            el.addEventListener('click', () => {
              if (onMarkerClick) {
                onMarkerClick(event.id);
              }
            });

            const marker = new mb.Marker(el)
              .setLngLat([event.coordinates[1], event.coordinates[0]])
              .addTo(mapRef.current);

            markersRef.current[event.id] = marker;
          } catch (error) {
            console.error('Error adding marker:', error);
          }
        });
      } catch (error) {
        console.error('Marker update failed:', error);
      }
    };

    update();
  }, [events, mapInitialized, onMarkerClick]);

  // Resize map when sidebar collapse state changes
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.resize();
      }, 300); // Wait for transition to complete
    }
  }, [sidebarCollapsed, reportsPanelCollapsed]);

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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" style={{ width: '100%', height: '100%' }} />
      <div className="absolute top-4 right-4 bg-white rounded shadow px-3 py-1 text-sm z-10">
        Events: {events.length}
      </div>
    </div>
  );
}
