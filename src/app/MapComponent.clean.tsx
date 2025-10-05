'use client';

import { useEffect, useRef, useState } from "react";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Report {
  id: number;
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
  sidebarCollapsed?: boolean;
  reportsPanelCollapsed?: boolean;
  onMarkerClick?: (eventId: string) => void;
}

export default function MapComponent({ 
  highlightedEventId, 
  sidebarCollapsed, 
  reportsPanelCollapsed, 
  onMarkerClick 
}: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [reports, setReports] = useState<Report[]>([]);

  // Fetch reports from API
  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports');
      const data = await response.json();
      setReports(data.reports || []);
      console.log('Loaded reports:', data.reports?.length || 0);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      setReports([]);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    const initMap = async () => {
      try {
        const mapboxgl = await import('mapbox-gl');
        mapboxgl.default.accessToken = "pk.eyJ1IjoieWF6enlqZW5rcyIsImEiOiJjbWU2b2o0eXkxNDFmMm1vbGY3dWt5aXViIn0.8hEu3t-bv3R3kGsBb_PIcw";

        const map = new mapboxgl.default.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [36.8219, -1.2921], // Nairobi
          zoom: 12
        });

        const nav = new mapboxgl.default.NavigationControl();
        map.addControl(nav, 'top-right');

        mapRef.current = map;

        map.on('load', () => {
          console.log('Map loaded');
          map.resize();
        });

      } catch (error) {
        console.error('Map initialization failed:', error);
      }
    };

    initMap();
  }, []);

  // Add markers for reports
  useEffect(() => {
    if (!mapRef.current || !reports.length) return;

    const addMarkers = async () => {
      try {
        const mapboxgl = await import('mapbox-gl');

        // Clear existing markers
        Object.values(markersRef.current).forEach(marker => marker.remove());
        markersRef.current = {};

        // Add new markers
        reports.forEach(report => {
          if (!report.coordinates || report.coordinates.length !== 2) {
            console.warn('Invalid coordinates for report:', report.id);
            return;
          }

          // Create marker element
          const el = document.createElement('div');
          el.style.cssText = `
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: #ef4444;
            border: 2px solid white;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          `;

          // Add click handler
          el.addEventListener('click', () => {
            if (onMarkerClick) {
              onMarkerClick(report.id.toString());
            }
          });

          // Coordinates in data are [lat, lng], Mapbox expects [lng, lat]
          const lng = report.coordinates[1];
          const lat = report.coordinates[0];

          console.log(`Adding marker for report ${report.id} at [${lng}, ${lat}]`);

          const marker = new mapboxgl.default.Marker(el)
            .setLngLat([lng, lat])
            .addTo(mapRef.current!);

          markersRef.current[report.id] = marker;
        });

        console.log(`Added ${Object.keys(markersRef.current).length} markers`);
      } catch (error) {
        console.error('Failed to add markers:', error);
      }
    };

    addMarkers();
  }, [reports, onMarkerClick]);

  // Highlight selected marker
  useEffect(() => {
    if (!highlightedEventId) return;

    Object.entries(markersRef.current).forEach(([reportId, marker]) => {
      const el = marker.getElement();
      if (reportId === highlightedEventId) {
        el.style.transform = 'scale(1.5)';
        el.style.backgroundColor = '#dc2626';
        el.style.zIndex = '999';
      } else {
        el.style.transform = 'scale(1)';
        el.style.backgroundColor = '#ef4444';
        el.style.zIndex = '1';
      }
    });
  }, [highlightedEventId]);

  // Resize map when sidebar changes
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current?.resize(), 300);
    }
  }, [sidebarCollapsed, reportsPanelCollapsed]);

  // Load reports on mount
  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow px-3 py-2 text-sm">
        <span className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          Reports: {reports.length}
        </span>
      </div>
    </div>
  );
}
