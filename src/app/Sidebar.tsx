// ...existing code...
import {
  FaTachometerAlt, FaMapMarkerAlt, FaFileAlt, FaChartBar, FaBell, FaCog, FaUserCircle,
  FaExclamationTriangle, FaMapMarkedAlt, FaComments, FaUsers, FaBars
} from "react-icons/fa";

const menuItems = [
  { icon: <FaMapMarkerAlt />, text: "Live Map", path: "/map" },
  { icon: <FaFileAlt />, text: "Reports", path: "/reports", active: true },
  { icon: <FaChartBar />, text: "Analytics", path: "/analytics" },
  { icon: <FaBell />, text: "News", path: "/news" },
];

const jiraniMenu = [
  { icon: <FaExclamationTriangle />, text: "Alerts", path: "/alerts" },
  { icon: <FaMapMarkedAlt />, text: "Areas", path: "/areas" },
  { icon: <FaComments />, text: "Chat History", path: "/chat" },
  { icon: <FaUsers />, text: "Communities", path: "/communities" },
];

function NavItem({ icon, text, isActive, navCollapsed }: {
  icon: React.ReactNode;
  text: string;
  isActive: boolean;
  navCollapsed: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-all duration-200 relative
        ${isActive ? "bg-white font-bold" : "hover:bg-[#F1F3F5]"} ${navCollapsed ? "justify-center" : ""}`}
      style={{ minHeight: "44px" }}>
      {icon && <span className={`text-xl ${isActive ? "text-black" : "text-gray-400"}`}>{icon}</span>}
      {!navCollapsed && <span className={`text-base ${isActive ? "font-bold text-black" : "text-gray-600"}`}>{text}</span>}
    </div>
  );
}

export default function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (c: boolean) => void }) {
  return (
    <aside className={`bg-white h-full flex flex-col ${collapsed ? "w-16 min-w-[64px]" : "w-64 min-w-[220px]"} shadow-lg transition-all duration-300`}>
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} py-6 px-6`}>
        {!collapsed && <span className="font-bold text-2xl text-black">Jirani</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="text-xl text-black focus:outline-none">
          <FaBars />
        </button>
      </div>
      <div className="flex flex-col gap-0 mt-2">
        {/* Overview Section Header */}
        {!collapsed && (
          <div className="px-6 text-xs text-[#6C757D] font-bold uppercase tracking-wide mb-2">Overview</div>
        )}
        <nav className={`flex flex-col gap-1 ${collapsed ? "" : "pl-4"}`}>
          <NavItem icon={<FaMapMarkerAlt />} text="Live Map" isActive={false} navCollapsed={collapsed} />
          <NavItem icon={<FaFileAlt />} text="Reports" isActive={true} navCollapsed={collapsed} />
          <NavItem icon={<FaChartBar />} text="Analytics" isActive={false} navCollapsed={collapsed} />
          <NavItem icon={<FaBell />} text="News" isActive={false} navCollapsed={collapsed} />
        </nav>
        {/* My Jirani Section Header */}
        {!collapsed && (
          <div className="mt-8 mb-2 px-6 text-xs text-[#6C757D] font-bold uppercase tracking-wide">My Jirani</div>
        )}
        <nav className={`flex flex-col gap-1 ${collapsed ? "" : "pl-4"}`}>
          <NavItem icon={<FaExclamationTriangle />} text="Alerts" isActive={false} navCollapsed={collapsed} />
          <NavItem icon={<FaMapMarkedAlt />} text="Areas" isActive={false} navCollapsed={collapsed} />
          <NavItem icon={<FaComments />} text="Chat History" isActive={false} navCollapsed={collapsed} />
          <NavItem icon={<FaUsers />} text="Communities" isActive={false} navCollapsed={collapsed} />
        </nav>
        {/* Settings Section Header */}
        {!collapsed && (
          <div className="mt-8 mb-2 px-6 text-xs text-[#6C757D] font-bold uppercase tracking-wide">Settings</div>
        )}
        <nav className={`flex flex-col gap-1 mb-6 ${collapsed ? "" : "pl-4"}`}>
          <NavItem icon={<FaUserCircle />} text="Account" isActive={false} navCollapsed={collapsed} />
        </nav>
      </div>
    </aside>
  );
}
