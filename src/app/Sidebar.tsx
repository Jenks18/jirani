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

function NavItem({ 
  icon, 
  text, 
  isActive, 
  navCollapsed,
  disabled = false,
  comingSoon = false
}: {
  icon: React.ReactNode;
  text: string;
  isActive: boolean;
  navCollapsed: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  if (navCollapsed) {
    return (
      <div
        className={`
          flex items-center justify-center py-3 mx-2 rounded transition-all duration-200 relative
          ${isActive ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"}
          ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
        `}
        style={{ minHeight: "44px" }}
        title={comingSoon ? `${text} - Coming Soon` : text}>
        <span className="text-xl">
          {icon}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`
        flex items-center px-4 py-2 mx-2 rounded transition-all duration-200 relative
        ${isActive ? "bg-blue-50 text-blue-600 font-semibold" : "text-gray-600 hover:bg-gray-100"}
        ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
      `}
      style={{ minHeight: "44px" }}
      title={comingSoon ? `${text} - Coming Soon` : undefined}>
      <div className="flex items-center gap-3 flex-1">
        <span className={`text-xl ${isActive ? "text-blue-600" : "text-gray-400"}`}>
          {icon}
        </span>
        <span className="text-base">
          {text}
        </span>
      </div>
      {comingSoon && (
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
          Soon
        </span>
      )}
    </div>
  );
}

export default function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (c: boolean) => void }) {
  return (
    <aside className={`bg-white h-full flex flex-col ${collapsed ? "w-16" : "w-64"} shadow-lg transition-all duration-300 overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center py-4 ${collapsed ? "justify-center px-2" : "justify-between px-6"}`}>
        {!collapsed && <span className="font-bold text-2xl text-black">Jirani</span>}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className={`text-lg text-gray-600 hover:text-black focus:outline-none hover:bg-gray-100 p-2 rounded transition-colors ${collapsed ? "w-10 h-10" : ""}`}
        >
          <FaBars />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex flex-col flex-1 py-2">
        {/* Overview Section */}
        {!collapsed && (
          <div className="px-6 text-xs text-[#6C757D] font-bold uppercase tracking-wide mb-3">Overview</div>
        )}
        <nav className="flex flex-col gap-1 mb-4">
          <NavItem icon={<FaMapMarkerAlt />} text="Live Map" isActive={true} navCollapsed={collapsed} />
          <NavItem icon={<FaFileAlt />} text="Reports" isActive={false} navCollapsed={collapsed} />
          <NavItem icon={<FaChartBar />} text="Analytics" isActive={false} navCollapsed={collapsed} comingSoon={true} />
          <NavItem icon={<FaBell />} text="News" isActive={false} navCollapsed={collapsed} comingSoon={true} />
        </nav>

        {/* My Jirani Section */}
        {!collapsed && (
          <div className="px-6 text-xs text-[#6C757D] font-bold uppercase tracking-wide mb-3">My Jirani</div>
        )}
        <nav className="flex flex-col gap-1 mb-4">
          <NavItem icon={<FaExclamationTriangle />} text="Alerts" isActive={false} navCollapsed={collapsed} comingSoon={true} />
          <NavItem icon={<FaMapMarkedAlt />} text="Areas" isActive={false} navCollapsed={collapsed} comingSoon={true} />
          <NavItem icon={<FaComments />} text="Chat History" isActive={false} navCollapsed={collapsed} comingSoon={true} />
          <NavItem icon={<FaUsers />} text="Communities" isActive={false} navCollapsed={collapsed} comingSoon={true} />
        </nav>

        {/* Settings Section */}
        {!collapsed && (
          <div className="px-6 text-xs text-[#6C757D] font-bold uppercase tracking-wide mb-3">Settings</div>
        )}
        <nav className="flex flex-col gap-1">
          <NavItem icon={<FaUserCircle />} text="Account" isActive={false} navCollapsed={collapsed} comingSoon={true} />
        </nav>
      </div>
    </aside>
  );
}
