import Image from "next/image";
import Link from "next/link";
import { org, parentNav, parentContact } from "@/config/org";

const productNav = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/safety-net", label: "Safety net" },
  { href: "/safety", label: "Safety" },
  { href: "/about", label: "About Jirani" },
  { href: "/contact", label: "Contact" },
];

const linkCls = "text-[16px] text-ink hover:underline hover:underline-offset-4";

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
        <a href={org.parentUrl} aria-label="The 6.25 Movement home">
          <Image src="/brand/625-movement-logo.webp" alt="The 6.25 Movement" width={64} height={64} className="h-14 w-auto" priority />
        </a>
        <nav aria-label="The 6.25 Movement" className="hidden items-center gap-6 xl:flex">
          {parentNav.map((n) =>
            "children" in n ? (
              <div key={n.label} className="group relative">
                <button type="button" className={`${linkCls} inline-flex items-center gap-1.5`} aria-haspopup="true">
                  {n.label}
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                    <path d="M2 4.5l4 4 4-4" />
                  </svg>
                </button>
                <div className="invisible absolute left-1/2 top-full z-10 w-52 -translate-x-1/2 pt-3 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <div className="rounded-lg border border-line bg-card p-2 shadow-lift">
                    {n.children.map((c) => (
                      <a key={c.href} href={c.href} className="block rounded-md px-3 py-2 text-[15px] text-ink hover:bg-paper-2">
                        {c.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <a
                key={n.label}
                href={n.href}
                aria-current={"current" in n && n.current ? "page" : undefined}
                className={`${linkCls} ${"current" in n && n.current ? "underline underline-offset-4" : ""}`}
              >
                {n.label}
              </a>
            )
          )}
          <a
            href={parentContact.href}
            className="rounded-full border-2 border-forest-800 bg-forest-800 px-6 py-2.5 text-[14px] text-white transition hover:border-forest-900 hover:bg-forest-900"
          >
            {parentContact.label}
          </a>
        </nav>
        <details className="group relative xl:hidden">
          <summary
            className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border-2 border-ink bg-transparent [&::-webkit-details-marker]:hidden"
            aria-label="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 5h12M3 9h12M3 13h12" />
            </svg>
          </summary>
          <div className="absolute right-0 top-14 max-h-[80vh] w-72 overflow-y-auto rounded-lg border border-line bg-card p-3 shadow-lift">
            <p className="px-4 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-3">The 6.25 Movement</p>
            {parentNav.map((n) =>
              "children" in n ? (
                <div key={n.label}>
                  <p className="px-4 pb-1 pt-3 text-sm font-medium text-ink-3">{n.label}</p>
                  {n.children.map((c) => (
                    <a key={c.href} href={c.href} className="block rounded-md px-6 py-2.5 text-base text-ink hover:bg-paper-2">
                      {c.label}
                    </a>
                  ))}
                </div>
              ) : (
                <a key={n.label} href={n.href} className="block rounded-md px-4 py-2.5 text-base text-ink hover:bg-paper-2">
                  {n.label}
                </a>
              )
            )}
            <p className="mt-2 border-t border-line px-4 pb-1 pt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-3">Jirani</p>
            {productNav.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-md px-4 py-2.5 text-base text-ink hover:bg-paper-2">
                {n.label}
              </Link>
            ))}
            <a href={org.mapsUrl} className="mt-2 block rounded-full bg-forest-800 px-4 py-3 text-center text-[15px] text-white">
              Open live map
            </a>
          </div>
        </details>
      </div>
      <div className="hidden border-y border-line bg-paper-2 lg:block">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-6 md:px-12">
          <Link href="/" aria-label="Jirani home" className="font-serif text-3xl leading-none text-forest-800">
            Jirani
          </Link>
          <nav aria-label="Jirani" className="flex items-center gap-7">
            {productNav.map((n) => (
              <Link key={n.href} href={n.href} className={linkCls}>
                {n.label}
              </Link>
            ))}
            <a
              href={org.mapsUrl}
              className="rounded-full border-2 border-clay-600 bg-clay-600 px-5 py-1.5 text-[14px] text-white transition hover:border-clay-700 hover:bg-clay-700"
            >
              Open live map
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
