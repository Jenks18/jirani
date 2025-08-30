import React, { useEffect, useState } from "react";
import { FaEllipsisV, FaChevronLeft } from "react-icons/fa";

type Report = {
  _id: string;
  dateTime: string;
  coordinates: { type: string; coordinates: [number, number] };
  type: string;
  severity: number;
  summary: string;
  sourceType: string;
};

function ReportItem({ report }: { report: Report }) {
  return (
    <div className="bg-white border-t border-[#DEE2E6] px-6 py-5 flex flex-col gap-2 transition-colors duration-200 hover:bg-[#F1F3F5]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {report.type.toLowerCase().includes("violent") && (
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2 border border-white shadow" />
          )}
          <h3 className="font-semibold text-[#495057] text-base">{report.type}</h3>
        </div>
        <FaEllipsisV className="text-[#ADB5BD] text-lg cursor-pointer" />
      </div>
      <p className="text-[#495057] text-sm leading-snug mt-1">{report.summary}</p>
      <span className="text-xs text-[#6C757D] mt-2">{new Date(report.dateTime).toLocaleString()}</span>
    </div>
  );
}



interface ReportsPanelProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  sidebarCollapsed: boolean;
}

function ReportsPanel({ collapsed, setCollapsed, sidebarCollapsed }: ReportsPanelProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/reports")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch reports");
        return res.json();
      })
      .then((data) => {
        setReports(data.reports || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (collapsed) {
    // Only render the floating chevron button, positioned on the map area (not over Jirani sidebar)
    const sidebarWidth = sidebarCollapsed ? 64 : 256; // 64px when collapsed, 256px when expanded
    return (
      <button
        aria-label="Expand reports panel"
        className="fixed top-6 z-50 border border-[#DEE2E6] shadow rounded-full p-2 flex items-center justify-center hover:bg-[#F1F3F5] transition-colors duration-200 bg-white"
        onClick={() => setCollapsed(false)}
        style={{ 
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          left: `${sidebarWidth + 24}px` // Sidebar width + 24px padding
        }}
      >
        <FaChevronLeft className="text-[#ADB5BD] text-xl rotate-180" />
      </button>
    );
  }

  // When expanded, render the full panel
  return (
    <div className="bg-[#F8F9FA] h-full overflow-y-auto shadow p-0 border-r border-[#DEE2E6] transition-all duration-300" style={{ minWidth: 320, maxWidth: 480, width: 400 }}>
      <div className="flex items-center px-6 py-5 border-b border-[#DEE2E6] bg-white">
        <FaChevronLeft
          className="text-[#ADB5BD] text-xl mr-4 cursor-pointer transition-transform duration-300 rotate-0"
          onClick={() => setCollapsed(true)}
        />
        <h2 className="text-2xl font-bold text-[#343A40]">Reports</h2>
      </div>
      <div>
        {loading && <div className="p-6 text-[#6C757D]">Loading reports...</div>}
        {error && <div className="p-6 text-red-500">{error}</div>}
        {!loading && !error && reports.length === 0 && <div className="p-6 text-[#6C757D]">No reports found.</div>}
        {reports.map((report) => (
          <ReportItem key={report._id} report={report} />
        ))}
      </div>
    </div>
  );
}

export default ReportsPanel;
