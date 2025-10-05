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

  // Fetch reports
  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports');
      const data = await response.json();
      const reportsData = data.reports || [];
      console.log('Fetched reports:', reportsData.length);
      setReports(reportsData);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setReports([]);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    const initMap = async () => {
      try {
        const mapboxModule = await import('mapbox-gl');
        const mapboxgl = mapboxModule.default;
        
        mapboxgl.accessToken = "pk.eyJ1IjoieWF6enlqZW5rcyIsImEiOiJjbWU2b2o0eXkxNDFmMm1vbGY3dWt5aXViIn0.8hEu3t-bv3R3kGsBb_PIcw";

        const map = new mapboxgl.Map({
          container: mapContainer.current as HTMLDivElement,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [36.8219, -1.2921], // Nairobi [lng, lat]
          zoom: 12
        });

        mapRef.current = map;
        console.log('Map initialized');

        map.on('load', () => {
          console.log('Map loaded, adding markers');
          addMarkers();
        });

      } catch (error) {
        console.error('Map initialization error:', error);
      }
    };

    initMap();
  }, []);

  // Add markers function
  const addMarkers = () => {
    if (!mapRef.current || reports.length === 0) {
      console.log('No map or no reports to add markers');
      return;
    }

    console.log('Adding markers for reports:', reports.length);
    
    reports.forEach((report) => {
      if (!report.coordinates || report.coordinates.length !== 2) {
        console.warn('Invalid coordinates for report:', report.id);
        return;
      }

      const [lat, lng] = report.coordinates;
      
      // Create severity-colored dot marker
      const el = document.createElement('div');
      
      // Map severity to colors
      const getSeverityColor = (severity: string) => {
        switch (severity?.toLowerCase()) {
          case 'low': return '#4ade80'; // Green
          case 'medium': return '#fb923c'; // Orange
          case 'high': return '#ef4444'; // Red
          default: return '#ef4444'; // Default to red
        }
      };
      
      el.style.backgroundColor = getSeverityColor(report.severity || report.priority);
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.cursor = 'pointer';
      el.style.transition = 'all 0.2s ease';
      el.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
      // No innerHTML - just a plain colored dot

      // Add hover effects
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.5)';
        el.style.zIndex = '1000';
        el.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.zIndex = '1';
        el.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
      });

      // Add click handler
      el.addEventListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(report.id.toString());
        }
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat]) // Mapbox expects [lng, lat]
        .addTo(mapRef.current!);

      markersRef.current[report.id] = marker;
      
      console.log(`Added marker for report ${report.id} at [${lng}, ${lat}]`);
    });
  };

  // Fetch reports on component mount
  useEffect(() => {
    fetchReports();
  }, []);

  // Add markers when reports change
  useEffect(() => {
    if (mapRef.current && reports.length > 0) {
      console.log('Reports updated, adding markers');
      addMarkers();
    }
  }, [reports]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" style={{ width: '100%', height: '100%' }} />
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-4 py-2 text-sm font-medium text-gray-800 z-10">
        <span className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          Reports: {reports.length}
        </span>
      </div>
    </div>
  );
}
