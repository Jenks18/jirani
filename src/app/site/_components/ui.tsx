import Link from "next/link";
import type { ReactNode } from "react";

export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p className={`text-sm uppercase tracking-[0.18em] ${light ? "text-white/80" : "text-ink-2"}`}>{children}</p>
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
  variant?: "primary" | "secondary" | "light" | "outline-light" | "red";
  external?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full border-2 px-7 py-3.5 text-[15px] font-normal transition focus-visible:outline-offset-4";
  const styles = {
    primary: "border-forest-800 bg-forest-800 text-white hover:border-forest-900 hover:bg-forest-900",
    secondary: "border-ink bg-transparent text-ink hover:bg-ink hover:text-white",
    light: "border-white bg-white text-forest-800 hover:bg-paper hover:border-paper",
    "outline-light": "border-white bg-transparent text-white hover:bg-white hover:text-forest-800",
    red: "border-clay-600 bg-clay-600 text-white hover:border-clay-700 hover:bg-clay-700",
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
        {intro && <p className="mt-5 text-xl leading-relaxed text-ink">{intro}</p>}
        {updated && <p className="mt-4 text-sm text-ink-3">Last updated: {updated}</p>}
        <div
          className="mt-10 space-y-5 leading-relaxed text-ink-2
          [&_h2]:mt-12 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]: [&_h2]:text-ink
          [&_h3]:mt-8 [&_h3]:text-2xl [&_h3]:text-ink
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
