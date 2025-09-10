"use client";
import { useState } from "react";
import Sidebar from "./Sidebar";
import ReportsPanel from "./ReportsPanel";
import TestMapComponent from "./TestMapComponent";
// import MapComponent from "./MapComponent";


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
    <div className="flex flex-col h-screen w-screen">
      {/* EMERGENCY TEST - You should see this message if deployment worked */}
      <div className="bg-red-500 text-white p-4 text-center font-bold">
        🚨 DEPLOYMENT TEST - If you see this, the new code is live! 🚨
      </div>
      <div className="flex flex-1 w-full h-full overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
        <div className="flex flex-1 h-full w-full overflow-hidden">
          {!reportsPanelCollapsed && (
            <div className="flex flex-col flex-shrink-0 min-w-[320px] max-w-[480px] w-full md:w-[400px] h-full overflow-y-auto">
              <ReportsPanel 
                collapsed={reportsPanelCollapsed} 
                setCollapsed={setReportsPanelCollapsed} 
                sidebarCollapsed={sidebarCollapsed} 
                onEventClick={handleEventClick}
                highlightedEventId={highlightedEventId}
              />
            </div>
          )}
          {reportsPanelCollapsed && (
            <ReportsPanel 
              collapsed={reportsPanelCollapsed} 
              setCollapsed={setReportsPanelCollapsed} 
              sidebarCollapsed={sidebarCollapsed} 
              onEventClick={handleEventClick}
              highlightedEventId={highlightedEventId}
            />
          )}
          <div className="flex-1 h-full w-full overflow-hidden">
            <TestMapComponent />
          </div>
        </div>
      </div>
    </div>
  );
}
