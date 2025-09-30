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
  sidebarCollapsed,
  reportsPanelCollapsed,
  onMarkerClick,
}: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = 'pk.eyJ1IjoieWF6enlqZW5rcyIsImEiOiJjbWU2b2o0eXkxNDFmMm1vbGY3dWt5aXViIn0.8hEu3t-bv3R3kGsBb_PIcw';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [36.8219, -1.2921],
      zoom: 12,
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
      setReports(data.reports || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      // Fallback to test data if API fails
      const testReports: Report[] = [
        {
          id: '1',
          title: 'Suspicious Activity at Westlands',
          description: 'Group of individuals loitering around parked vehicles',
          location: 'The Westgate Mall, Westlands',
          coordinates: [36.8033, -1.2571],
          severity: 'medium',
          priority: 'medium',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Traffic Incident in CBD',
          description: 'Multiple vehicle collision causing traffic buildup',
          location: 'Moi Avenue, CBD',
          coordinates: [36.8219, -1.2855],
          severity: 'high',
          priority: 'high',
          created_at: new Date().toISOString()
        }
      ];
      setReports(testReports);
    }
  };

  // Add/update markers when reports or highlighted event changes
  useEffect(() => {
    if (!map.current || !reports.length) return;

    // Clear existing markers that are no longer in the reports
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      if (!reports.find(r => r.id === id)) {
        marker.remove();
        delete markersRef.current[id];
      }
    });

    reports.forEach(report => {
      const el = document.createElement('div');
      el.className = 'marker';
      el.id = `marker-${report.id}`;
      
      // Style the marker
      Object.assign(el.style, {
        backgroundColor: getSeverityColor(report.severity),
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        border: '2px solid white',
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.2s ease-in-out'
      });

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        maxWidth: '300px'
      }).setHTML(
        `<div class="p-2">
          <h3 class="font-bold text-gray-900">${report.title}</h3>
          <p class="text-sm text-gray-600">${report.description}</p>
          <div class="mt-2 text-xs text-gray-500">
            <span class="inline-flex items-center">
              <span style="background-color: ${getSeverityColor(report.severity)}" 
                    class="w-2 h-2 rounded-full mr-1"></span>
              ${report.severity.toUpperCase()} Severity
            </span>
          </div>
        </div>`
      );

      // Add hover effects
      el.addEventListener('mouseenter', () => {
        if (report.id !== highlightedEventId) {
          el.style.transform = 'scale(1.5)';
          el.style.zIndex = '1000';
          popup.addTo(map.current!);
        }
      });

      el.addEventListener('mouseleave', () => {
        if (report.id !== highlightedEventId) {
          el.style.transform = 'scale(1)';
          el.style.zIndex = '1';
          popup.remove();
        }
      });

      // Add click handler
      el.addEventListener('click', () => {
        map.current?.flyTo({
          center: report.coordinates,
          zoom: 13,
          speed: 0.6,
          curve: 1.2,
          essential: true
        });
        
        onMarkerClick?.(report.id);
      });

      // Remove existing marker if it exists
      markersRef.current[report.id]?.remove();

      // Create and add the new marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat(report.coordinates)
        .addTo(map.current!);

      markersRef.current[report.id] = marker;

      // Highlight active marker if it matches
      if (highlightedEventId === report.id) {
        el.style.transform = 'scale(1.5)';
        el.style.zIndex = '1000';
        popup.addTo(map.current!);
        
        // Center on highlighted marker
        map.current?.flyTo({
          center: report.coordinates,
          zoom: 13,
          speed: 0.6,
        });
      }
    });
  }, [reports, highlightedEventId, onMarkerClick]);

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
