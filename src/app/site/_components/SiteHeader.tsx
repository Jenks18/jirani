import Image from "next/image";
import Link from "next/link";
import { org } from "@/config/org";

const nav = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/safety-net", label: "Safety net" },
  { href: "/safety", label: "Safety" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:rounded-full focus:bg-forest-800 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6 md:px-12">
        <div className="flex items-center gap-4">
          <a href={org.parentUrl} aria-label="The 6.25 Movement">
            <Image src="/brand/625-movement-logo.webp" alt="The 6.25 Movement" width={64} height={64} className="h-14 w-auto" priority />
          </a>
          <span className="hidden h-8 w-px bg-ink/25 sm:block" aria-hidden="true" />
          <Link href="/" aria-label="Jirani home" className="leading-none">
            <span className="block font-serif text-4xl text-ink">Jirani</span>
            <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">Majirani Wetu</span>
          </Link>
        </div>
        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-[17px] text-ink hover:underline hover:underline-offset-4">
              {n.label}
            </Link>
          ))}
          <a
            href={org.mapsUrl}
            className="rounded-full border-2 border-forest-800 bg-forest-800 px-7 py-3 text-[15px] text-white transition hover:border-forest-900 hover:bg-forest-900"
          >
            Open live map
          </a>
        </nav>
        <details className="group relative lg:hidden">
          <summary
            className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border-2 border-ink bg-transparent [&::-webkit-details-marker]:hidden"
            aria-label="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 5h12M3 9h12M3 13h12" />
            </svg>
          </summary>
          <div className="absolute right-0 top-14 w-64 rounded-lg border border-line bg-card p-3 shadow-lift">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-md px-4 py-3 text-base text-ink hover:bg-paper-2">
                {n.label}
              </Link>
            ))}
            <a href={org.mapsUrl} className="mt-2 block rounded-full bg-forest-800 px-4 py-3 text-center text-[15px] text-white">
              Open live map
            </a>
          </div>
        </details>
      </div>
    </header>
  );
}
