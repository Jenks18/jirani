"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../Sidebar";
import MobileNav from "./MobileNav";

/** Sidebar + scrollable content frame shared by the secondary map-app pages. */
export default function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const u = () => setDesktop(mq.matches);
    u();
    mq.addEventListener("change", u);
    return () => mq.removeEventListener("change", u);
  }, []);

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-paper">
      {desktop && (
        <div className="z-40 h-full shrink-0" style={{ width: collapsed ? 64 : 256, transition: "width 300ms" }}>
          <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        </div>
      )}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-5 pb-24 pt-6 md:px-8 md:pt-10">
          {!desktop && <MobileNav className="mb-5" />}
          <h1 className="font-serif text-3xl  tracking-tight text-ink md:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-ink-2">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
