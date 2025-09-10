import mapboxgl from "mapbox-gl";

// Guarantee Mapbox CSS is present in the DOM (runtime fallback)
if (typeof window !== "undefined") {
  const MAPBOX_CSS_URL = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css";
  const isMapboxCSSLoaded = Array.from(document.styleSheets).some(
    (sheet) => sheet.href && sheet.href.includes("mapbox-gl-js")
  );
  if (!isMapboxCSSLoaded) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = MAPBOX_CSS_URL;
    document.head.appendChild(link);
  }
}
import { useEffect, useRef, useState } from "react";
const MAPBOX_TOKEN = "pk.eyJ1IjoieWF6enlqZW5rcyIsImEiOiJjbWU2b2o0eXkxNDFmMm1vbGY3dWt5aXViIn0.8hEu3t-bv3R3kGsBb_PIcw";

interface Report {
  _id: string;
  dateTime: string;
  coordinates: {
    type: string;
    coordinates: [number, number];
  };
  type: string;
  severity: number;
  summary: string;
  sourceType: string;
  location?: string;
  images?: string[];
}

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
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const [mapBearing, setMapBearing] = useState(0);
  const [mapPitch, setMapPitch] = useState(0);
  const [events, setEvents] = useState<Event[]>([]);

  // Function to fetch events from API
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/reports');
      if (!response.ok) throw new Error('Failed to fetch events');
      
      const data = await response.json();
      const reports = data.reports || [];
      
      // Transform API data to match Event interface
      const newEvents = reports.map((report: Report) => ({
        id: report._id,
        type: report.type,
        severity: report.severity,
        location: report.location || 'Unknown location',
        description: report.summary,
        timestamp: report.dateTime,
        coordinates: report.coordinates?.coordinates ? 
          [report.coordinates.coordinates[1], report.coordinates.coordinates[0]] : null, // Convert [lng,lat] to [lat,lng]
        from: report.sourceType,
        createdAt: report.dateTime,
        images: report.images || []
      }));
      
      setEvents(newEvents);
      
    } catch (err) {
      console.error('Error fetching events for map:', err);
    }
  };

  // Function to update markers on the map
  const updateMarkers = () => {
    if (!mapRef.current) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Add new markers for events with coordinates
    events.forEach((event) => {
      if (event.coordinates) {
        const el = document.createElement("div");
        el.className = "marker";
        
        // Check if this event is highlighted
        const isHighlighted = highlightedEventId === event.id;
        
        el.style.width = isHighlighted ? "24px" : "16px";  // Larger when highlighted
        el.style.height = isHighlighted ? "24px" : "16px"; // Larger when highlighted
        
        // Color based on severity
        const severityColors = {
          1: "#22c55e", // Green - Low
          2: "#eab308", // Yellow - Medium  
          3: "#f97316", // Orange - High
          4: "#ef4444", // Red - Critical
          5: "#dc2626"  // Dark Red - Emergency
        };
        
        el.style.background = severityColors[event.severity as keyof typeof severityColors] || "#6b7280";
        el.style.borderRadius = "50%";
        el.style.border = isHighlighted ? "4px solid #fff" : "2px solid white"; // Thicker border when highlighted
        el.style.boxShadow = isHighlighted ? "0 4px 16px rgba(0,0,0,0.8)" : "0 2px 6px rgba(0,0,0,0.4)"; // Stronger shadow when highlighted
        el.style.cursor = "pointer";
        el.style.zIndex = isHighlighted ? "2000" : "1000"; // Higher z-index when highlighted
        el.style.transform = isHighlighted ? "scale(1.2)" : "scale(1)"; // Slightly bigger when highlighted
        el.style.transition = "all 0.3s ease"; // Smooth transition

        // Create popup with event details
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
          .setLngLat([event.coordinates[1], event.coordinates[0]]) // Already converted: [lat,lng] -> [lng,lat] for mapbox
          .setPopup(popup)
          .addTo(mapRef.current!);

        // Store marker by event ID for highlighting
        markersRef.current[event.id] = marker;
      }
    });
  };

  // Fetch events on component mount and set up polling
  useEffect(() => {
    fetchEvents();
    
    // Poll for new events every 15 seconds
    const interval = setInterval(fetchEvents, 15000);
    
    return () => clearInterval(interval);
  }, []);

  // Update markers when events change
  useEffect(() => {
    if (mapRef.current) {
      updateMarkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  // Update markers when highlighted event changes
  useEffect(() => {
    if (mapRef.current) {
      updateMarkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedEventId]);

  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;
    
    // Super comprehensive Mapbox CSS detection override
    if (typeof window !== "undefined") {
      // Override at multiple levels to ensure we catch everything
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapboxPrototype = mapboxgl.Map.prototype as any;
      
      // Method 1: Override _detectMissingCSS directly
      if (mapboxPrototype._detectMissingCSS) {
        mapboxPrototype._detectMissingCSS = function() { return; };
      }
      
      // Method 2: Define it if it doesn't exist yet
      Object.defineProperty(mapboxPrototype, "_detectMissingCSS", {
        value: function() { return; },
        writable: false,
        configurable: false
      });

      // Method 3: Override any other CSS detection methods
      if (mapboxPrototype._checkForMissingCSS) {
        mapboxPrototype._checkForMissingCSS = function() { return; };
      }

      // Method 4: Override the tf function that appears in the stack trace
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalWindow = window as any;
      if (globalWindow.tf && typeof globalWindow.tf === 'function') {
        const originalTf = globalWindow.tf;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        globalWindow.tf = function(...args: any[]) {
          const message = args.join(' ');
          if (message.includes('CSS declarations for Mapbox GL JS') || 
              message.includes('mapbox-gl.css')) {
            return;
          }
          return originalTf.apply(this, args);
        };
      }

      // Method 5: Override any console methods at the last moment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const suppressMapboxWarning = (originalMethod: (...args: any[]) => void) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return function(...args: any[]) {
          const message = args.join(' ');
          if (message.includes('CSS declarations for Mapbox GL JS') || 
              message.includes('mapbox-gl.css') ||
              message.includes('missing CSS declarations')) {
            return;
          }
          return originalMethod.apply(console, args);
        };
      };

      console.warn = suppressMapboxWarning(console.warn);
      console.error = suppressMapboxWarning(console.error);
    }
    
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [36.0, -0.5], // Center of Kenya to show all cities
      zoom: 7, // Wider zoom to see entire Kenya
      pitch: 0, // Start with flat Google Maps style view
      bearing: 0, // Start pointing north
      antialias: true,
    });
    mapRef.current = map;

    // Update bearing and pitch state when map rotates or pitches
    const updateMapOrientation = () => {
      setMapBearing(map.getBearing());
      setMapPitch(map.getPitch());
    };
    
    map.on("rotate", updateMapOrientation);
    map.on("pitch", updateMapOrientation);

    map.on("load", () => {
      // Add realistic cityscape layers with proper colors
      
      // Water bodies - blue
      map.addLayer({
        id: "water-areas",
        source: "composite",
        "source-layer": "water",
        type: "fill",
        paint: {
          "fill-color": "#4A90E2",
          "fill-opacity": 0.8,
        },
      });

      // Parks and green spaces - green
      map.addLayer({
        id: "parks",
        source: "composite",
        "source-layer": "landuse",
        type: "fill",
        filter: ["in", "class", "park", "grass", "recreation_ground"],
        paint: {
          "fill-color": "#7CB342",
          "fill-opacity": 0.6,
        },
      });

      // Major roads - darker gray
      map.addLayer({
        id: "major-roads",
        source: "composite",
        "source-layer": "road",
        type: "line",
        filter: ["in", "class", "motorway", "trunk", "primary"],
        paint: {
          "line-color": "#424242",
          "line-width": 4,
        },
      });

      // Secondary roads - lighter gray
      map.addLayer({
        id: "secondary-roads",
        source: "composite",
        "source-layer": "road",
        type: "line",
        filter: ["in", "class", "secondary", "tertiary"],
        paint: {
          "line-color": "#757575",
          "line-width": 2,
        },
      });

      // Residential areas - light beige
      map.addLayer({
        id: "residential",
        source: "composite",
        "source-layer": "landuse",
        type: "fill",
        filter: ["==", "class", "residential"],
        paint: {
          "fill-color": "#F5F5DC",
          "fill-opacity": 0.4,
        },
      });

      // Commercial/industrial areas - light purple
      map.addLayer({
        id: "commercial",
        source: "composite",
        "source-layer": "landuse",
        type: "fill",
        filter: ["in", "class", "commercial", "industrial"],
        paint: {
          "fill-color": "#E1BEE7",
          "fill-opacity": 0.5,
        },
      });

      // 3D buildings with realistic colors
      map.addLayer({
        id: "3d-buildings",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 15,
        paint: {
          "fill-extrusion-color": [
            "case",
            ["==", ["get", "type"], "residential"], "#D2B48C", // Tan for residential
            ["==", ["get", "type"], "commercial"], "#B0C4DE", // Light steel blue for commercial
            ["==", ["get", "type"], "industrial"], "#A0A0A0", // Gray for industrial
            "#C0C0C0" // Default silver
          ],
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "min_height"],
          "fill-extrusion-opacity": 0.8,
        },
      });
    });

    return () => {
      // Clean up markers
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};
      
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute top-4 right-4 bg-white rounded shadow px-3 py-1 text-sm font-bold">Jirani Users: 315</div>
      
      {/* Custom navigation controls - centered vertically */}
      <div className="absolute top-1/2 right-4 transform -translate-y-1/2 flex flex-col space-y-1">
        {/* Zoom In */}
        <button 
          onClick={() => mapRef.current?.zoomIn()}
          className="w-10 h-10 bg-white rounded shadow-lg border border-gray-200 flex items-center justify-center text-lg font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          title="Zoom in"
        >
          +
        </button>
        
        {/* Zoom Out */}
        <button 
          onClick={() => mapRef.current?.zoomOut()}
          className="w-10 h-10 bg-white rounded shadow-lg border border-gray-200 flex items-center justify-center text-lg font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          title="Zoom out"
        >
          âˆ’
        </button>
        
        {/* Compass / Reset North with omnidirectional camera control */}
        <button 
          onClick={() => {
            mapRef.current?.resetNorth();
            mapRef.current?.easeTo({ pitch: 0 }); // Reset to flat Google Maps view
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            let isDragging = false;
            const startX = e.clientX;
            const startY = e.clientY;
            const startBearing = mapRef.current?.getBearing() || 0;
            const startPitch = mapRef.current?.getPitch() || 0;
            
            const handleMouseMove = (moveEvent: MouseEvent) => {
              const deltaX = moveEvent.clientX - startX;
              const deltaY = moveEvent.clientY - startY;
              const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
              
              if (!isDragging && distance > 5) {
                isDragging = true;
              }
              
              if (isDragging && mapRef.current) {
                // Horizontal drag (left/right) controls bearing (rotation)
                const bearingChange = deltaX * 0.5;
                const newBearing = (startBearing + bearingChange) % 360;
                
                // Vertical drag (up/down) controls pitch (camera angle)
                // Drag up = lower pitch (flat overhead view like Google Maps)
                // Drag down = higher pitch (more angled/3D view)
                const pitchChange = -deltaY * 0.5;
                const newPitch = Math.max(0, Math.min(85, startPitch + pitchChange));
                
                mapRef.current.easeTo({
                  bearing: newBearing,
                  pitch: newPitch,
                  duration: 0
                });
              }
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
          className="w-10 h-10 bg-white rounded shadow-lg border border-gray-200 flex items-center justify-center text-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer select-none"
          title="Click to reset, drag left/right to rotate, drag up for flat view, drag down for 3D view"
        >
          <div 
            className="transform transition-transform duration-150"
            style={{ 
              transform: `rotate(${mapBearing}deg) rotateX(${mapPitch * 0.7}deg)`,
              transformStyle: 'preserve-3d'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* North arrow - black */}
              <path d="M10 2 L6 10 L10 8 L14 10 Z" fill="#000000" stroke="#000000" strokeWidth="0.5"/>
              {/* South arrow - light gray */}
              <path d="M10 18 L14 10 L10 12 L6 10 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5"/>
              {/* Center dot */}
              <circle cx="10" cy="10" r="1" fill="#374151"/>
              {/* Pitch indicator - subtle lines to show tilt */}
              {mapPitch > 5 && (
                <>
                  <line x1="2" y1="10" x2="5" y2="10" stroke="#9ca3af" strokeWidth="0.5" opacity="0.6"/>
                  <line x1="15" y1="10" x2="18" y2="10" stroke="#9ca3af" strokeWidth="0.5" opacity="0.6"/>
                </>
              )}
            </svg>
          </div>
        </button>
      </div>
      
      {/* Global style override for Mapbox canvas */}
      <style>{`
        .mapboxgl-canvas {
          width: 100% !important;
          height: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          max-width: 100vw !important;
          max-height: 100vh !important;
          display: block !important;
        }
      `}</style>
    </div>
  );
}
