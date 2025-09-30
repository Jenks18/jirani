'use client';

import { useEffect, useRef, useState } from "react";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Report {
  id: string;
  title: string;
  description: string;
  location: string;
  coordinates: [number, number];
  latitude: number;
  longitude: number;
  severity: string;
  priority: string;
  created_at: string;
}

interface MapComponentProps {
  highlightedEventId?: string | null;
  highlightSeq?: number; // increments each selection even if same id
  sidebarCollapsed?: boolean;
  reportsPanelCollapsed?: boolean;
  onMarkerClick?: (eventId: string) => void;
}

const getSeverityColor = (severity: string): string => {
  switch (severity.toLowerCase()) {
    case 'low':
      return '#4ade80';
    case 'medium':
      return '#fb923c';
    case 'high':
      return '#ef4444';
    default:
      return '#ef4444';
  }
};

export default function MapComponent({
  highlightedEventId,
  highlightSeq,
  sidebarCollapsed,
  reportsPanelCollapsed,
  onMarkerClick,
}: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const prevHighlightedIdRef = useRef<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = 'pk.eyJ1IjoieWF6enlqZW5rcyIsImEiOiJjbWU2b2o0eXkxNDFmMm1vbGY3dWt5aXViIn0.8hEu3t-bv3R3kGsBb_PIcw';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [36.8219, -1.2921],
      zoom: 10,
      attributionControl: true
    });

    const nav = new mapboxgl.NavigationControl({
      visualizePitch: true,
      showCompass: true
    });
    map.current.addControl(nav, 'right');

    map.current.addControl(
      new mapboxgl.ScaleControl({
        maxWidth: 80,
        unit: 'metric'
      }),
      'bottom-right'
    );

    map.current.on('load', () => {
      console.log('Map loaded');
      setIsStyleLoaded(true);
      fetchReports();
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Fetch reports
  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports');
      if (!response.ok) throw new Error('Failed to fetch reports');
      const data = await response.json();
      const normalized: Report[] = (data.reports || []).map((r: any) => {
        // Ensure id is a string consistently
        const idStr = String(r.id);
        // Prefer explicit longitude/latitude fields, fall back to coordinates array if present
        const latitude = typeof r.latitude === 'number' ? r.latitude : (Array.isArray(r.coordinates) ? r.coordinates[0] : undefined);
        const longitude = typeof r.longitude === 'number' ? r.longitude : (Array.isArray(r.coordinates) ? r.coordinates[1] : undefined);
        return {
          id: idStr,
            title: r.title || r.name || 'Untitled',
            description: r.description || '',
            location: r.location || '',
            coordinates: [longitude, latitude],
            latitude,
            longitude,
            severity: r.severity || r.priority || 'medium',
            priority: r.priority || 'medium',
            created_at: r.created_at || r.dateTime || new Date().toISOString()
        } as Report;
  }).filter((r: Report) => typeof r.longitude === 'number' && typeof r.latitude === 'number');
      console.log('[Map] Loaded reports:', normalized.length, normalized.slice(0,3));
      setReports(normalized);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  // Setup map layers and data source (with feature-state based highlighting)
  useEffect(() => {
    if (!isStyleLoaded || !map.current || reports.length === 0) return;

    const mapInstance = map.current;

    const geojson: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
      type: 'FeatureCollection',
      features: reports.map(report => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [report.longitude, report.latitude],
        },
        properties: {
          id: report.id,
          title: report.title,
          description: report.description,
          severity: report.severity,
        },
      }))
    };

  const existingSource = mapInstance.getSource('reports') as mapboxgl.GeoJSONSource | undefined;
    if (existingSource) {
      existingSource.setData(geojson);
    } else {
      mapInstance.addSource('reports', {
        type: 'geojson',
        data: geojson,
        promoteId: 'id' // allow feature-state keyed by id
      });

      // Glow / halo layer (below main circles)
      mapInstance.addLayer({
        id: 'reports-glow',
        type: 'circle',
        source: 'reports',
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            22,
            0
          ],
          'circle-color': '#2563eb',
            'circle-opacity': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              0.45,
              0
            ],
          'circle-blur': 0.6
        }
      });

      // Main points layer
      mapInstance.addLayer({
        id: 'reports-layer',
        type: 'circle',
        source: 'reports',
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            11,
            6
          ],
          'circle-color': [
            'match',
            ['get', 'severity'],
            'low', '#4ade80',
            'medium', '#fb923c',
            'high', '#ef4444',
            '#ef4444'
          ],
          'circle-stroke-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            3,
            1
          ],
          'circle-stroke-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#ffffff',
            '#ffffff'
          ]
        }
      });

      // Interactivity
      mapInstance.on('click', 'reports-layer', (e) => {
        if (!e.features?.length) return;
        const id = e.features[0].properties?.id;
        if (id && onMarkerClick) onMarkerClick(String(id));
      });

      // Disable default double-click zoom so we can control it
      try { mapInstance.doubleClickZoom.disable(); } catch {}

      // Double-click: select (if not already) and zoom in further
      mapInstance.on('dblclick', 'reports-layer', (e) => {
        if (!e.features?.length) return;
        const feature = e.features[0];
        const id = feature.properties?.id;
        if (id && onMarkerClick) onMarkerClick(String(id));
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        const currentZoom = mapInstance.getZoom();
        const targetZoom = currentZoom < 15 ? 15 : Math.min(currentZoom + 1.5, 18); // clamp
        mapInstance.easeTo({
          center: coords,
          zoom: targetZoom,
          duration: 800,
          curve: 1.4,
          easing: (t) => t
        });
      });

      mapInstance.on('mouseenter', 'reports-layer', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (!e.features?.length) return;
        const feature = e.features[0];
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice();
        const { title, description, severity } = feature.properties as any;
        popupRef.current = new mapboxgl.Popup({
          offset: 15,
          closeButton: false,
          maxWidth: '300px'
        })
          .setLngLat(coordinates as [number, number])
          .setHTML(`
            <div class="p-2">
              <h3 class="font-bold text-gray-900">${title}</h3>
              <p class="text-sm text-gray-600">${description}</p>
              <div class="mt-2 text-xs text-gray-500">
                <span class="inline-flex items-center">
                  <span style="background-color: ${getSeverityColor(severity)}" class="w-2 h-2 rounded-full mr-1"></span>
                  ${severity.toUpperCase()} Severity
                </span>
              </div>
            </div>`)
          .addTo(mapInstance);
      });

      mapInstance.on('mouseleave', 'reports-layer', () => {
        mapInstance.getCanvas().style.cursor = '';
        popupRef.current?.remove();
      });
    }
  }, [reports, isStyleLoaded, onMarkerClick]);

  // Highlight logic using feature-state
  useEffect(() => {
    if (!isStyleLoaded || !map.current) return;
    const mapInstance = map.current;
    if (!mapInstance.getSource('reports')) return;

    // Clear previous selection feature-state
    const prevId = prevHighlightedIdRef.current;
    if (prevId) {
      try { mapInstance.setFeatureState({ source: 'reports', id: prevId }, { selected: false }); } catch {}
    }

    const coercedId = highlightedEventId != null ? String(highlightedEventId) : null;
    if (coercedId) {
      try {
        mapInstance.setFeatureState({ source: 'reports', id: coercedId }, { selected: true });
        const target = reports.find(r => r.id === coercedId);
        if (target) {
          console.log('[Map] Highlighting + recenter', highlightedEventId, target.longitude, target.latitude);
          // Compute padding so point is visible (not hidden under sidebar + reports panel)
          const sidebarWidth = sidebarCollapsed ? 64 : 256; // matches layout logic
            // Reports panel approx width (hard-coded to match page.tsx width). If collapsed -> 0
          const reportsPanelWidth = reportsPanelCollapsed ? 0 : 400; 
          const leftPadding = sidebarWidth + reportsPanelWidth + 24; // extra breathing space
          // Stop any current camera movement to ensure new animation applies
          try { mapInstance.stop(); } catch {}
          const currentZoom = mapInstance.getZoom();
          const targetZoom = currentZoom < 13.5 ? 14 : currentZoom; // preserve if user already zoomed in
          mapInstance.easeTo({
            center: [target.longitude, target.latitude],
            zoom: targetZoom,
            duration: 900,
            curve: 1.3,
            padding: { left: leftPadding, right: 32, top: 32, bottom: 32 },
            essential: true
          });
        }
      } catch {}
    }
    prevHighlightedIdRef.current = coercedId;
  }, [highlightedEventId, highlightSeq, reports, isStyleLoaded, sidebarCollapsed, reportsPanelCollapsed]);

  // Debug effect to confirm when highlightedEventId changes vs report ids present
  useEffect(() => {
    if (!highlightedEventId) return;
    const exists = reports.some(r => r.id === highlightedEventId || String(r.id) === highlightedEventId);
    if (!exists) {
      console.warn('[Map] highlightedEventId not found among reports', highlightedEventId, reports.map(r => r.id));
    }
  }, [highlightedEventId, reports]);


  // Handle resize and panel collapse
  useEffect(() => {
    if (!map.current) return;

    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      if (!map.current) return;
      map.current.resize();
    };

    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    handleResize();
    window.addEventListener('resize', debouncedResize);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedResize);
    };
  }, [sidebarCollapsed, reportsPanelCollapsed]);

  return (
    <div className="h-full w-full absolute inset-0">
      <div
        ref={mapContainer}
        className="absolute inset-0 w-full h-full"
        style={{
          transition: 'all 0.3s ease-in-out',
        }}
      />
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-4 py-2 text-sm font-medium text-gray-800 z-10">
        <span className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          Reports: {reports.length}
        </span>
      </div>
    </div>
  );
}
