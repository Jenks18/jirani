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

export default function MapComponent({
  highlightedEventId,
  sidebarCollapsed,
  reportsPanelCollapsed,
  onMarkerClick,
}: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [reports, setReports] = useState<Report[]>([]);

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

    // Add navigation controls with compass in the middle-right
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
        showCompass: true,
      }),
      'right'
    );

    // Add scale control
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
    }
  };

  // Add markers when reports change
  useEffect(() => {
    if (!map.current || !reports.length) return;

    reports.forEach(report => {
      const el = document.createElement('div');
      el.className = 'marker';
      
      // Style the marker
      Object.assign(el.style, {
        backgroundColor: getSeverityColor(report.severity),
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        border: '3px solid white',
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
        el.style.transform = 'scale(1.5) translateZ(0)';
        el.style.zIndex = '1000';
        popup.addTo(map.current!);
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1) translateZ(0)';
        el.style.zIndex = '1';
        popup.remove();
      });

      // Add click handler
      if (onMarkerClick) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Fly to the marker location with animation
          map.current?.flyTo({
            center: report.coordinates,
            zoom: 15,
            speed: 0.8,
            curve: 1.4,
            essential: true
          });
          
          onMarkerClick(report.id);
        });
      }

      // Create and add the marker to the map
      new mapboxgl.Marker(el)
        .setLngLat(report.coordinates)
        .addTo(map.current!);
    });
  }, [reports, onMarkerClick]);

  // Handle sidebar/panel collapse with debounced resize
  useEffect(() => {
    if (!map.current) return;

    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      if (!map.current) return;

      map.current.resize();

      // Calculate paddings based on sidebar states
      const padding = {
        left: sidebarCollapsed ? 50 : 300,
        right: reportsPanelCollapsed ? 50 : 300,
        top: 50,
        bottom: 50
      };

      // Get current center and zoom before resize
      const center = map.current.getCenter();
      const zoom = map.current.getZoom();

      // Apply the new padding and restore the view
      map.current.setPadding(padding);
      map.current.setCenter(center);
      map.current.setZoom(zoom);
    };

    // Debounced resize handler
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    // Initial resize
    handleResize();

    // Add event listener
    window.addEventListener('resize', debouncedResize);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedResize);
    };
  }, [sidebarCollapsed, reportsPanelCollapsed]);

  const getSeverityColor = (severity: string) => {
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
