import Link from "next/link";
import Logo from "./Logo";
import { org } from "@/config/org";

const cols = [
  {
    title: "Product",
    links: [
      { href: org.mapsUrl, label: "Live map", external: true },
      { href: "/how-it-works", label: "How it works" },
      { href: "/safety", label: "Safety & responsible use" },
    ],
  },
  {
    title: "Organization",
    links: [
      { href: "/about", label: "About" },
      { href: org.parentUrl, label: "The 6.25 Movement", external: true },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
      { href: "/cookies", label: "Cookie policy" },
      { href: "/data-deletion", label: "Delete my data" },
      { href: "/accessibility", label: "Accessibility" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="bg-forest-950 text-forest-100">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo light />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-forest-100/75">
              Jirani is a Majirani Wetu program of {org.legalName}, a U.S. nonprofit advocating for the dignity and wellbeing of
              Kenyans and the African diaspora.
            </p>
            <p className="mt-5 max-w-xs rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-forest-100/80">
              Jirani is not an emergency service. In an emergency in Kenya call <strong className="text-white">999</strong> or{" "}
              <strong className="text-white">112</strong>.
            </p>
          </div>
          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">{c.title}</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {"external" in l && l.external ? (
                      <a href={l.href} className="text-forest-100/85 transition hover:text-white">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="text-forest-100/85 transition hover:text-white">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-forest-100/60 md:flex-row md:items-center md:justify-between">
          <p>© 2025–{new Date().getFullYear()} {org.legalName}. All rights reserved.</p>
          <p>
            <a href={`mailto:${org.email}`} className="hover:text-white">{org.email}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
