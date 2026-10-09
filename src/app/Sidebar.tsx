"use client";
import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaMapMarkerAlt, FaChartBar, FaLayerGroup, FaBell, FaNewspaper, FaUsers, FaWhatsapp, FaShieldAlt, FaBars,
} from "react-icons/fa";
import { org, whatsappLink } from "@/config/org";
import { NAV, normalizePath } from "./maps/_components/nav";

const ICONS: Record<string, React.ReactNode> = {
  map: <FaMapMarkerAlt />, chart: <FaChartBar />, areas: <FaLayerGroup />, bell: <FaBell />, news: <FaNewspaper />, users: <FaUsers />,
};

function NavItem({ icon, text, href, external, isActive = false, navCollapsed }: {
  icon: React.ReactNode; text: string; href: string; external?: boolean; isActive?: boolean; navCollapsed: boolean;
}) {
  const cls = `flex min-h-[44px] items-center gap-3 rounded-xl px-3 transition-colors ${navCollapsed ? "justify-center" : ""} ${
    isActive ? "bg-forest-50 font-semibold text-forest-800" : "text-ink-2 hover:bg-paper-2"
  }`;
  const content = (
    <>
      <span className={`text-lg ${isActive ? "text-forest-700" : "text-ink-3"}`}>{icon}</span>
      {!navCollapsed && <span className="text-sm">{text}</span>}
    </>
  );
  const a11y = { title: navCollapsed ? text : undefined, "aria-label": navCollapsed ? text : undefined, "aria-current": isActive ? ("page" as const) : undefined };
  return external ? (
    <a href={href} className={cls} {...a11y}>{content}</a>
  ) : (
    <Link href={href} className={cls} {...a11y}>{content}</Link>
  );
}

export default function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (c: boolean) => void }) {
  const path = normalizePath(usePathname() ?? "/");
  const autoHoverExpandedRef = useRef(false);

  const handleMouseEnter = () => {
    if (collapsed) { setCollapsed(false); autoHoverExpandedRef.current = true; }
  };
  const handleMouseLeave = () => {
    if (autoHoverExpandedRef.current) { setCollapsed(true); autoHoverExpandedRef.current = false; }
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
        <button onClick={() => setCollapsed(!collapsed)} className="rounded-lg p-2 text-lg text-ink-2 hover:bg-paper-2" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <FaBars />
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-3" aria-label="Main">
        {NAV.map((n) => (
          <NavItem key={n.href} icon={ICONS[n.icon]} text={n.label} href={n.href} isActive={path === n.href} navCollapsed={collapsed} />
        ))}
      </nav>

      <nav className="mt-6 flex flex-col gap-1 border-t border-line px-3 pt-4" aria-label="More">
        <NavItem icon={<FaWhatsapp />} text="Report on WhatsApp" href={whatsappLink} external navCollapsed={collapsed} />
        <NavItem icon={<FaShieldAlt />} text="Safety net" href={`${org.mainUrl}/safety-net`} external navCollapsed={collapsed} />
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
