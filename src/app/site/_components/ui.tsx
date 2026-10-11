import Link from "next/link";
import type { ReactNode } from "react";

export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${light ? "text-sun-500" : "text-forest-700"}`}>{children}</p>
  );
}

export function Button({
  href,
  children,
  variant = "primary",
  external = false,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost-light";
  external?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold transition focus-visible:outline-offset-4";
  const styles = {
    primary: "bg-forest-800 text-white shadow-soft hover:bg-forest-900",
    secondary: "border border-ink/15 bg-card text-ink hover:border-ink/30 hover:bg-paper-2",
    "ghost-light": "border border-white/25 text-white hover:bg-white/10",
  }[variant];
  const cls = `${base} ${styles}`;
  return external ? (
    <a href={href} className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function Prose({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-3xl px-5 pb-24 pt-14 md:pt-20">
        <h1 className="font-serif text-4xl  tracking-tight text-ink md:text-5xl">{title}</h1>
        {intro && <p className="mt-5 text-lg leading-relaxed text-ink-2">{intro}</p>}
        {updated && <p className="mt-4 text-sm text-ink-3">Last updated: {updated}</p>}
        <div
          className="mt-10 space-y-5 leading-relaxed text-ink-2
          [&_h2]:mt-12 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]: [&_h2]:text-ink
          [&_h3]:mt-8 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink
          [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6
          [&_a]:font-medium [&_a]:text-forest-700 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-forest-900
          [&_strong]:text-ink
          [&_table]:w-full [&_table]:text-left [&_table]:text-sm [&_th]:border-b [&_th]:border-line [&_th]:py-2 [&_th]:pr-4 [&_th]:font-semibold [&_th]:text-ink
          [&_td]:border-b [&_td]:border-line/70 [&_td]:py-3 [&_td]:pr-4 [&_td]:align-top"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
