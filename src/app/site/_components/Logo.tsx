export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" role="img" className="shrink-0">
      <rect width="40" height="40" rx="8" fill="#0c643a" />
      <path
        d="M20 8.5c-5.1 0-9 3.9-9 8.8 0 6.2 7.3 13 8.1 13.7.5.4 1.3.4 1.8 0 .8-.7 8.1-7.5 8.1-13.7 0-4.9-3.9-8.8-9-8.8Z"
        fill="#ebebe3"
      />
      <path d="M14.8 17.6 20 13.2l5.2 4.4v5.1h-3.4v-3.2h-3.6v3.2h-3.4v-5.1Z" fill="#0c643a" />
      <circle cx="30.5" cy="10" r="3" fill="#bf2a2c" />
    </svg>
  );
}

export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="leading-none">
        <span className={`block font-serif text-3xl ${light ? "text-white" : "text-ink"}`}>Jirani</span>
        <span className={`mt-0.5 block text-[10px] font-medium uppercase tracking-[0.16em] ${light ? "text-white/70" : "text-ink-3"}`}>
          Majirani Wetu
        </span>
      </span>
    </span>
  );
}
