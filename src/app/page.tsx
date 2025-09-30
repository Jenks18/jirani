"use client";
import { useState } from "react";
import Sidebar from "./Sidebar";
import ReportsPanel from "./ReportsPanel";
import MapComponent from "./MapComponent";

export default function HomePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reportsPanelCollapsed, setReportsPanelCollapsed] = useState(false);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [filteredEventId, setFilteredEventId] = useState<string | null>(null);
  const [highlightSeq, setHighlightSeq] = useState(0); // increments every selection to force map recenter

  const handleEventClick = (eventId: string) => {
    // If reports panel is collapsed, expand it first
    if (reportsPanelCollapsed) {
      setReportsPanelCollapsed(false);
    }
    
    setHighlightedEventId(eventId);
    setFilteredEventId(eventId); // Filter to show only this event
  setHighlightSeq(s => s + 1); // force downstream effects even if same id
  };

  const handleClearFilter = () => {
    setFilteredEventId(null);
    setHighlightedEventId(null);
  };

  // Sidebar width
  const sidebarWidth = sidebarCollapsed ? 64 : 256;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <div
        className={`h-full z-40 bg-white shadow-lg transition-all duration-300 flex-shrink-0 ease-in-out`}
        style={{ width: sidebarWidth, minWidth: sidebarCollapsed ? 64 : 220, transitionProperty: 'width, min-width' }}
      >
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      </div>
      {/* Reports Panel - Render conditionally */}
      {!reportsPanelCollapsed && (
        <div
          className="h-full z-30 transition-all duration-300 flex-shrink-0 bg-white shadow-xl ease-in-out"
          style={{ width: 400, minWidth: 320, maxWidth: 480 }}
        >
          <ReportsPanel
            collapsed={reportsPanelCollapsed}
            setCollapsed={setReportsPanelCollapsed}
            sidebarCollapsed={sidebarCollapsed}
            onEventClick={handleEventClick}
            highlightedEventId={highlightedEventId}
            filteredEventId={filteredEventId}
            onClearFilter={handleClearFilter}
          />
        </div>
      )}
      
      {/* Collapsed Reports Panel - Floating Button */}
      {reportsPanelCollapsed && (
        <ReportsPanel
          collapsed={reportsPanelCollapsed}
          setCollapsed={setReportsPanelCollapsed}
          sidebarCollapsed={sidebarCollapsed}
          onEventClick={handleEventClick}
          highlightedEventId={highlightedEventId}
          filteredEventId={filteredEventId}
          onClearFilter={handleClearFilter}
        />
      )}
      {/* Map fills remaining space */}
      <div className="h-full flex-grow overflow-hidden transition-all duration-300 ease-in-out">
        <MapComponent
          highlightedEventId={highlightedEventId}
          highlightSeq={highlightSeq}
          sidebarCollapsed={sidebarCollapsed}
          reportsPanelCollapsed={reportsPanelCollapsed}
          onMarkerClick={(eventId) => {
            handleEventClick(eventId);
            // Ensure reports panel is open
            if (reportsPanelCollapsed) {
              setReportsPanelCollapsed(false);
            }
          }}
        />
      </div>
    </div>
  );
}
