"use client";
import React, { useRef } from "react";
import { FaMapMarkerAlt, FaWhatsapp, FaInfoCircle, FaShieldAlt, FaBars } from "react-icons/fa";
import { org, whatsappLink } from "@/config/org";

function NavItem({
  icon,
  text,
  href,
  isActive = false,
  navCollapsed,
}: {
  icon: React.ReactNode;
  text: string;
  href?: string;
  isActive?: boolean;
  navCollapsed: boolean;
}) {
  const cls = `flex min-h-[44px] items-center gap-3 rounded-xl px-3 transition-colors ${
    navCollapsed ? "justify-center" : ""
  } ${isActive ? "bg-forest-50 font-semibold text-forest-800" : "text-ink-2 hover:bg-paper-2"}`;
  const content = (
    <>
      <span className={`text-lg ${isActive ? "text-forest-700" : "text-ink-3"}`}>{icon}</span>
      {!navCollapsed && <span className="text-sm">{text}</span>}
    </>
  );
  return href ? (
    <a href={href} className={cls} title={navCollapsed ? text : undefined} aria-label={navCollapsed ? text : undefined}>
      {content}
    </a>
  ) : (
    <div className={cls} aria-current={isActive ? "page" : undefined}>
      {content}
    </div>
  );
}

export default function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (c: boolean) => void }) {
  // Track whether we auto-expanded due to hover, so we only auto-collapse in that case
  const autoHoverExpandedRef = useRef(false);

  const handleMouseEnter = () => {
    if (collapsed) {
      setCollapsed(false);
      autoHoverExpandedRef.current = true;
    }
  };

  const handleMouseLeave = () => {
    if (autoHoverExpandedRef.current) {
      setCollapsed(true);
      autoHoverExpandedRef.current = false;
    }
  };

  return (
    <aside
      className={`flex h-full flex-col bg-card ${collapsed ? "w-16 min-w-[64px]" : "w-64 min-w-[220px]"} border-r border-line transition-all duration-300`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-4 py-5`}>
        {!collapsed && (
          <span className="leading-none">
            <span className="block font-serif text-2xl font-semibold text-ink">Jirani</span>
            <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3">Majirani Wetu</span>
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-2 text-lg text-ink-2 hover:bg-paper-2"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <FaBars />
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-3" aria-label="Map navigation">
        <NavItem icon={<FaMapMarkerAlt />} text="Live map" isActive navCollapsed={collapsed} />
        <NavItem icon={<FaWhatsapp />} text="Report on WhatsApp" href={whatsappLink} navCollapsed={collapsed} />
        <NavItem icon={<FaInfoCircle />} text="How Jirani works" href={`${org.mainUrl}/how-it-works`} navCollapsed={collapsed} />
        <NavItem icon={<FaShieldAlt />} text="Safety principles" href={`${org.mainUrl}/safety`} navCollapsed={collapsed} />
      </nav>

      {!collapsed && (
        <div className="mt-auto space-y-3 border-t border-line p-4 text-xs text-ink-3">
          <p className="rounded-lg bg-clay-50 p-3 leading-relaxed text-clay-700">
            Not an emergency service. In Kenya call <strong>999</strong> or <strong>112</strong>. Reports are unverified.
          </p>
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            <a className="hover:text-forest-700 hover:underline" href={`${org.mainUrl}/privacy`}>Privacy</a>
            <a className="hover:text-forest-700 hover:underline" href={`${org.mainUrl}/terms`}>Terms</a>
            <a className="hover:text-forest-700 hover:underline" href={`${org.mainUrl}/cookies`}>Cookies</a>
          </p>
        </div>
      )}
    </aside>
  );
}
