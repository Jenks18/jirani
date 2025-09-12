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

  // Sidebar width
  const sidebarWidth = sidebarCollapsed ? 64 : 256;
  // Reports panel width (collapsed = 0)
  const reportsPanelWidth = reportsPanelCollapsed ? 0 : 400;

  return (
    <div className="h-screen w-screen flex flex-row overflow-hidden">
      {/* Sidebar */}
      <div
        className={`h-full z-40 bg-white shadow-lg transition-all duration-300 flex-shrink-0`}
        style={{ width: sidebarWidth, minWidth: sidebarCollapsed ? 64 : 220, transitionProperty: 'width, min-width' }}
      >
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      </div>
      {/* Reports Panel */}
      <div
        className={`h-full z-30 transition-all duration-300 flex-shrink-0 bg-white shadow-xl ${reportsPanelCollapsed ? 'overflow-hidden' : ''}`}
        style={{ width: reportsPanelWidth, minWidth: reportsPanelCollapsed ? 0 : 320, maxWidth: 480, transitionProperty: 'width, min-width' }}
      >
        <ReportsPanel
          collapsed={reportsPanelCollapsed}
          setCollapsed={setReportsPanelCollapsed}
          sidebarCollapsed={sidebarCollapsed}
          onEventClick={handleEventClick}
          highlightedEventId={highlightedEventId}
        />
      </div>
      {/* Map fills remaining space */}
      <div className="h-full flex-1 relative">
        <MapComponent
          highlightedEventId={highlightedEventId}
          sidebarCollapsed={sidebarCollapsed}
          reportsPanelCollapsed={reportsPanelCollapsed}
        />
      </div>
    </div>
  );
}
