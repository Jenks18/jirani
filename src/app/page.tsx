"use client";
import Header from "./Header";
import { useState } from "react";
import Sidebar from "./Sidebar";
import ReportsPanel from "./ReportsPanel";
import MapComponent from "./MapComponent";


export default function HomePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reportsPanelCollapsed, setReportsPanelCollapsed] = useState(false);
  
  return (
    <div className="flex flex-col h-screen w-screen">
      <div className="flex flex-1 w-full h-full overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
        <div className="flex flex-1 h-full w-full overflow-hidden">
          {!reportsPanelCollapsed && (
            <div className="flex flex-col flex-shrink-0 min-w-[320px] max-w-[480px] w-full md:w-[400px] h-full overflow-y-auto">
              <ReportsPanel collapsed={reportsPanelCollapsed} setCollapsed={setReportsPanelCollapsed} sidebarCollapsed={sidebarCollapsed} />
            </div>
          )}
          {reportsPanelCollapsed && (
            <ReportsPanel collapsed={reportsPanelCollapsed} setCollapsed={setReportsPanelCollapsed} sidebarCollapsed={sidebarCollapsed} />
          )}
          <div className="flex-1 h-full w-full overflow-hidden">
            <MapComponent />
          </div>
        </div>
      </div>
    </div>
  );
}
