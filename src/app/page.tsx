"use client";
import { useState } from "react";
import Sidebar from "./Sidebar";
import ReportsPanel from "./ReportsPanel";
import MapComponent from "./MapComponent";

export default function HomePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reportsPanelCollapsed, setReportsPanelCollapsed] = useState(false);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);

  const handleEventClick = (eventId: string) => {
    setHighlightedEventId(eventId);
    setTimeout(() => setHighlightedEventId(null), 3000);
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      {/* Sidebar */}
      <div className="h-full flex-shrink-0 z-40">
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      </div>

      {/* Live Reports Panel */}
      <div className="h-full flex-shrink-0 bg-white shadow-lg z-30" style={{ width: 400 }}>
        <ReportsPanel
          collapsed={reportsPanelCollapsed}
          setCollapsed={setReportsPanelCollapsed}
          sidebarCollapsed={sidebarCollapsed}
          onEventClick={handleEventClick}
          highlightedEventId={highlightedEventId}
        />
      </div>

      {/* Map Container - takes remaining space */}
      <div className="h-full flex-1 relative z-20 min-w-0">
        <MapComponent
          highlightedEventId={highlightedEventId}
          sidebarCollapsed={sidebarCollapsed}
          reportsPanelCollapsed={reportsPanelCollapsed}
          onMarkerClick={handleEventClick}
        />
      </div>
    </div>
  );
}
