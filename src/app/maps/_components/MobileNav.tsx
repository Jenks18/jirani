"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, normalizePath } from "./nav";
import { org, whatsappLink } from "@/config/org";

/** Hamburger menu for phones, where the sidebar is hidden. */
export default function MobileNav({ className = "" }: { className?: string }) {
  const path = normalizePath(usePathname() ?? "/");
  return (
    <details className={`group relative ${className}`}>
      <summary
        className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-card shadow-soft [&::-webkit-details-marker]:hidden"
        aria-label="Menu"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 5h12M3 9h12M3 13h12" /></svg>
      </summary>
      <div className="absolute left-0 top-14 w-60 rounded-2xl border border-line bg-card p-2 shadow-lift">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`block rounded-xl px-4 py-3 text-sm font-medium ${path === n.href ? "bg-forest-50 text-forest-800" : "text-ink hover:bg-paper-2"}`}>
            {n.label}
          </Link>
        ))}
        <a href={whatsappLink} className="mt-1 block rounded-xl px-4 py-3 text-sm font-medium text-ink hover:bg-paper-2">Report on WhatsApp</a>
        <a href={`${org.mainUrl}/safety-net`} className="block rounded-xl px-4 py-3 text-sm font-medium text-ink hover:bg-paper-2">Safety net</a>
      </div>
    </details>
  );
}
