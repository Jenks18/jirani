import React, { useEffect, useState } from "react";

console.log("ReportsPanel: mounted");
import { FaChevronLeft, FaClock } from "react-icons/fa";

// Simplified report shape for transformation
interface SourceReport {
  id: string | number;
  dateTime?: string;
  timestamp?: string;
  createdAt?: string;
  coordinates?: { type?: string; coordinates?: [number, number] } | [number, number];
  type?: string; title?: string;
  severity?: number;
  summary?: string; description?: string;
  sourceType?: string;
  location?: string;
  images?: string[];
  latitude?: number; longitude?: number;
}

type Event = {
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
};

function EventItem({ event, onEventClick, isHighlighted }: { 
  event: Event; 
  onEventClick?: (eventId: string) => void;
  isHighlighted?: boolean;
}) {
  const eventRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to highlighted event to bring it to the top of the list
  useEffect(() => {
    if (isHighlighted && eventRef.current) {
      // Delay to ensure panel transitions are complete
      setTimeout(() => {
        if (eventRef.current) {
          // Find the scrollable container
          const scrollContainer = eventRef.current.closest('.overflow-y-auto');
          
          if (scrollContainer) {
            // Scroll to position the highlighted item at the top of the visible area
            const elementTop = eventRef.current.offsetTop;
            const containerPadding = 16; // Account for padding
            
            scrollContainer.scrollTo({
              top: Math.max(0, elementTop - containerPadding),
              behavior: 'smooth'
            });
          }
        }
      }, 400);
    }
  }, [isHighlighted]);
  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 1: return 'bg-green-500';
      case 2: return 'bg-yellow-500';
      case 3: return 'bg-orange-500';
      case 4: return 'bg-red-500';
      case 5: return 'bg-red-700';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityText = (severity: number) => {
    switch (severity) {
      case 1: return 'Low';
      case 2: return 'Medium';
      case 3: return 'High';
      case 4: return 'Critical';
      case 5: return 'Emergency';
      default: return 'Unknown';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffMs = now.getTime() - eventTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatFullDate = (timestamp: string) => {
    const eventTime = new Date(timestamp);
    return eventTime.toLocaleDateString('en-KE', {
      weekday: 'short',
      year: 'numeric', 
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div 
      ref={eventRef}
      className={`transition-all duration-200 cursor-pointer border-b border-gray-100 ${
        isHighlighted 
          ? 'bg-blue-50 shadow-md' 
          : 'bg-white hover:bg-gray-50'
      }`} 
      onClick={() => onEventClick?.(event.id)}
    >
      <div className="px-6 py-5">
        {/* Header with severity indicator */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-1 h-8 rounded-full ${getSeverityColor(event.severity)} flex-shrink-0`} />
            <div>
              <h3 className="font-bold text-gray-900 text-lg leading-tight">{event.type}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {getSeverityText(event.severity).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Description */}
        <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">{event.description}</p>
        
        {/* Footer with date and location */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="font-medium">{formatFullDate(event.createdAt)}</span>
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate max-w-[150px]">{event.location}</span>
          </div>
        </div>
      </div>
    </div>
  );
}


interface ReportsPanelProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  sidebarCollapsed: boolean;
  onEventClick?: (eventId: string) => void;
  highlightedEventId?: string | null;
  filteredEventId?: string | null;
  onClearFilter?: () => void;
}

function ReportsPanel({ collapsed, setCollapsed, sidebarCollapsed, onEventClick, highlightedEventId, filteredEventId, onClearFilter }: ReportsPanelProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch new events
  const fetchEvents = async () => {
    try {
      // Prefer new events endpoint
      let response = await fetch('/api/events');
      if (!response.ok) {
        console.warn('Primary /api/events failed, falling back to /api/reports');
        response = await fetch('/api/reports');
      }
      if (!response.ok) throw new Error('Failed to fetch events');
      
      const data = await response.json();
      const reports: SourceReport[] = data.events || data.reports || [];
  console.log('ReportsPanel: fetched reports from API:', reports);
      
      // Transform API data to match Event interface
  const transformedEvents = reports.map((report: SourceReport) => {
        // Support both flat shape (latitude/longitude) and nested geojson-like shape
        let coords: [number, number] | null = null;
        if (Array.isArray(report.coordinates) && report.coordinates.length === 2) {
          // If plain array assume [lat, lng]
          const [lat, lng] = report.coordinates as [number, number];
          coords = [lng, lat];
        } else if (!Array.isArray(report.coordinates) && report.coordinates && 'coordinates' in report.coordinates && Array.isArray(report.coordinates.coordinates)) {
          const arr = (report.coordinates as { coordinates?: [number, number] }).coordinates!;
          if (arr.length === 2) {
            coords = [arr[0], arr[1]]; // assume already [lng, lat]
          }
        } else if (typeof report.longitude === 'number' && typeof report.latitude === 'number') {
          coords = [report.longitude, report.latitude];
        }
        return {
          id: String(report.id),
          type: report.type || report.title || 'Incident',
          severity: typeof report.severity === 'number' ? report.severity : 3,
          location: report.location || 'Unknown location',
          description: report.summary || report.description || 'No description provided',
          timestamp: report.dateTime || report.timestamp || report.createdAt || new Date().toISOString(),
          coordinates: coords,
          from: report.sourceType || 'Unknown',
          createdAt: report.dateTime || report.createdAt || report.timestamp || new Date().toISOString(),
          images: report.images || []
        } as Event;
      });
  console.log('ReportsPanel: transformed events:', transformedEvents);
      
      // Sort events by creation time (newest first)
      const sortedEvents = transformedEvents.sort((a: Event, b: Event) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  console.log('ReportsPanel: sorted events:', sortedEvents);
      
      setEvents(sortedEvents);
      setError(null);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchEvents();
  }, []);

  // Set up polling for new events every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEvents();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Real-time event count
  const eventCount = events.length;
  const recentCount = events.filter(event => {
    const eventTime = new Date(event.createdAt);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return eventTime > oneHourAgo;
  }).length;

  if (collapsed) {
    // Floating expand button with event count
    const sidebarWidth = sidebarCollapsed ? 64 : 256;
    return (
      <button
        aria-label="Expand reports panel"
        className="fixed top-6 z-50 border border-[#DEE2E6] shadow-lg rounded-lg p-3 flex items-center justify-center hover:bg-[#F1F3F5] transition-all duration-200 bg-white group"
        onClick={() => setCollapsed(false)}
        style={{ 
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          left: `${sidebarWidth + 24}px`
        }}
      >
        <div className="flex items-center gap-2">
          <FaChevronLeft className="text-[#ADB5BD] text-lg rotate-180 group-hover:text-[#495057] transition-colors" />
          {eventCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
              {eventCount > 99 ? '99+' : eventCount}
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="bg-white h-full overflow-hidden shadow-xl border-r border-gray-200 transition-all duration-300 flex flex-col" style={{ minWidth: 320, maxWidth: 480, width: 400 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-4">
          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            onClick={() => setCollapsed(true)}
          >
            <FaChevronLeft className="text-gray-400 text-lg" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
            <p className="text-sm text-gray-500 mt-1">
              {eventCount} total incidents
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
          {loading && (
            <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
          )}
        </div>
      </div>

      {/* Events Container */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {loading && events.length === 0 && (
          <div className="p-6 text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
            <button 
              onClick={fetchEvents}
              className="mt-2 text-xs text-red-700 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}
        
        {!loading && !error && events.length === 0 && (
          <div className="p-8 text-center">
            <FaClock className="text-4xl text-[#ADB5BD] mx-auto mb-3" />
            <p className="text-[#6C757D] font-medium">No reports yet</p>
            <p className="text-xs text-[#ADB5BD] mt-1">New incidents will appear here automatically</p>
          </div>
        )}
        
        {filteredEventId && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700 font-medium">Showing filtered result</span>
              <button 
                onClick={onClearFilter}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Show all reports
              </button>
            </div>
          </div>
        )}
        
        {(filteredEventId ? events.filter(event => event.id === filteredEventId) : events).map((event, index) => (
          <div key={event.id} style={{ animationDelay: `${index * 50}ms` }}>
            <EventItem 
              event={event} 
              onEventClick={onEventClick} 
              isHighlighted={highlightedEventId === event.id}
            />
          </div>
        ))}
      </div>
      
      {/* Footer */}
      {events.length > 0 && (
        <div className="px-4 py-2 bg-white border-t border-[#DEE2E6] text-xs text-[#6C757D] text-center">
          Auto-refreshing every 10 seconds
        </div>
      )}
    </div>
  );
}

export default ReportsPanel;
