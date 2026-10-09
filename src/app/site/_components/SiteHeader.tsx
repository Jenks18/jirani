import Link from "next/link";
import Logo from "./Logo";
import { org } from "@/config/org";

const nav = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/safety", label: "Safety" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:rounded-lg focus:bg-forest-800 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" aria-label="Jirani home">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm font-medium text-ink-2 transition hover:text-forest-700">
              {n.label}
            </Link>
          ))}
          <a
            href={org.mapsUrl}
            className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-900"
          >
            Open live map
          </a>
        </nav>
        <details className="group relative md:hidden">
          <summary
            className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-card [&::-webkit-details-marker]:hidden"
            aria-label="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 5h12M3 9h12M3 13h12" />
            </svg>
          </summary>
          <div className="absolute right-0 top-12 w-64 rounded-2xl border border-line bg-card p-3 shadow-lift">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-xl px-4 py-3 text-sm font-medium text-ink hover:bg-paper-2">
                {n.label}
              </Link>
            ))}
            <a href={org.mapsUrl} className="mt-2 block rounded-xl bg-forest-800 px-4 py-3 text-center text-sm font-semibold text-white">
              Open live map
            </a>
          </div>
        </details>
      </div>
    </header>
  );
}
