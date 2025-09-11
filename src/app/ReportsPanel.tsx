import React, { useEffect, useState } from "react";
import { FaChevronLeft, FaMapMarkerAlt, FaClock } from "react-icons/fa";

interface Report {
  id: string;
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
      className={`bg-white border-b border-[#DEE2E6] px-4 py-4 transition-all duration-200 cursor-pointer ${
        isHighlighted 
          ? 'bg-blue-50 border-l-4 border-l-blue-500 shadow-lg' 
          : 'hover:bg-[#F8F9FA]'
      } animate-slideIn`} 
      onClick={() => onEventClick?.(event.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-3 h-3 rounded-full ${getSeverityColor(event.severity)} border border-white shadow-sm flex-shrink-0 mt-0.5`} />
          <h3 className="font-semibold text-[#495057] text-sm leading-tight">{event.type}</h3>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-xs px-2 py-1 rounded-full text-white ${getSeverityColor(event.severity)} font-medium`}>
            {getSeverityText(event.severity)}
          </span>
        </div>
      </div>
      
      <p className="text-[#495057] text-sm leading-relaxed mb-3 line-clamp-3">{event.description}</p>
      
      <div className="flex flex-col gap-1.5 text-xs text-[#6C757D]">
        <div className="flex items-center gap-1.5">
          <FaMapMarkerAlt className="text-[#6C757D] flex-shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FaClock className="text-[#6C757D] flex-shrink-0" />
          <div className="flex flex-col">
            <span>{formatTimeAgo(event.createdAt)}</span>
            <span className="text-[10px] text-[#ADB5BD]">{formatFullDate(event.createdAt)}</span>
          </div>
        </div>
        {event.images && event.images.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-blue-600 font-medium">{event.images.length} image(s)</span>
          </div>
        )}
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
}

function ReportsPanel({ collapsed, setCollapsed, sidebarCollapsed, onEventClick, highlightedEventId }: ReportsPanelProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch new events
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/reports');
      if (!response.ok) throw new Error('Failed to fetch events');
      
      const data = await response.json();
      const reports = data.reports || [];
      
      // Transform API data to match Event interface
      const transformedEvents = reports.map((report: Report) => ({
  id: report.id,
        type: report.type,
        severity: report.severity,
        location: report.location || 'Unknown location',
        description: report.summary,
        timestamp: report.dateTime,
        coordinates: report.coordinates?.coordinates ? 
          [report.coordinates.coordinates[1], report.coordinates.coordinates[0]] : null,
        from: report.sourceType,
        createdAt: report.dateTime,
        images: report.images || []
      }));
      
      // Sort events by creation time (newest first)
      const sortedEvents = transformedEvents.sort((a: Event, b: Event) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
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
    <div className="bg-[#F8F9FA] h-full overflow-hidden shadow-xl border-r border-[#DEE2E6] transition-all duration-300 flex flex-col" style={{ minWidth: 320, maxWidth: 480, width: 400 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#DEE2E6] bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <FaChevronLeft
            className="text-[#ADB5BD] text-lg cursor-pointer transition-all duration-200 hover:text-[#495057] hover:scale-110"
            onClick={() => setCollapsed(true)}
          />
          <div>
            <h2 className="text-xl font-bold text-[#343A40]">Live Reports</h2>
            <p className="text-xs text-[#6C757D]">
              {eventCount} total • {recentCount} in last hour
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="w-3 h-3 border-2 border-[#DEE2E6] border-t-blue-500 rounded-full animate-spin"></div>
          )}
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        </div>
      </div>

      {/* Events Container */}
      <div className="flex-1 overflow-y-auto">
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
        
        {events.map((event, index) => (
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
