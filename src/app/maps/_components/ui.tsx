export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg bg-paper-2" />
      ))}
    </div>
  );
}

export const ErrorNote = () => (
  <p role="alert" className="rounded-lg border border-clay-500/30 bg-clay-50 p-4 text-sm text-clay-700">
    We couldn&apos;t load this right now. Please try again shortly.
  </p>
);

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-line bg-card p-5 shadow-soft ${className}`}>{children}</div>;
}
