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
    // Clear highlight after 3 seconds
    setTimeout(() => setHighlightedEventId(null), 3000);
  };
  
  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Fixed sidebar with animated width */}
      <div className={`fixed top-0 left-0 h-full z-40 bg-white shadow-lg transition-all duration-300 ${sidebarCollapsed ? 'w-16 min-w-[64px]' : 'w-64 min-w-[220px]'}`} style={{ transitionProperty: 'width, min-width' }}>
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      </div>
      {/* Main content with animated margin-left */}
      <div
        className="h-full w-full overflow-hidden relative transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? 64 : 256 }}
      >
        {/* Map always fills the space next to sidebar */}
        <MapComponent highlightedEventId={highlightedEventId} sidebarCollapsed={sidebarCollapsed} reportsPanelCollapsed={reportsPanelCollapsed} />
        {/* ReportsPanel overlays on top of map */}
        <div className={`absolute top-0 left-0 h-full z-30 pointer-events-none`} style={{ width: 'min(100vw, 400px)', maxWidth: 480, minWidth: 320 }}>
          <div className={`transition-transform duration-300 h-full ${reportsPanelCollapsed ? "-translate-x-full" : "translate-x-0"} pointer-events-auto`}>
            <ReportsPanel 
              collapsed={reportsPanelCollapsed} 
              setCollapsed={setReportsPanelCollapsed} 
              sidebarCollapsed={sidebarCollapsed} 
              onEventClick={handleEventClick}
              highlightedEventId={highlightedEventId}
            />
          </div>
          {/* Floating expand button always visible */}
          {reportsPanelCollapsed && (
            <div className="absolute top-6 left-0 z-40 pointer-events-auto">
              <ReportsPanel 
                collapsed={true}
                setCollapsed={setReportsPanelCollapsed}
                sidebarCollapsed={sidebarCollapsed}
                onEventClick={handleEventClick}
                highlightedEventId={highlightedEventId}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
