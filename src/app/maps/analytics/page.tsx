"use client";
import Link from "next/link";
import AppShell from "../_components/AppShell";
import { useApi } from "../_components/useApi";
import { Card, ErrorNote, Skeleton } from "../_components/ui";
import { SEVERITIES } from "@/lib/reports";
import type { Analytics } from "@/lib/analytics";

function Kpi({ label, value, hint }: { label: string; value: number; hint?: React.ReactNode }) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <p className="mt-2 font-serif text-4xl  text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </Card>
  );
}

function Trend({ now, prev }: { now: number; prev: number }) {
  if (prev === 0 && now === 0) return <>No change</>;
  if (prev === 0) return <>New activity this week</>;
  const pct = Math.round(((now - prev) / prev) * 100);
  return <span className={pct > 0 ? "text-clay-600" : "text-forest-700"}>{pct > 0 ? "▲" : pct < 0 ? "▼" : "•"} {Math.abs(pct)}% vs previous 7 days</span>;
}

function DailyBars({ data }: { data: Analytics["byDay"] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const w = 600, h = 140, gap = 3, bw = (w - gap * (data.length - 1)) / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h + 22}`} className="w-full" role="img" aria-label="Reports per day, last 30 days">
      {data.map((d, i) => {
        const bh = Math.max(d.count ? 3 : 1, (d.count / max) * h);
        return (
          <g key={d.date}>
            <rect x={i * (bw + gap)} y={h - bh} width={bw} height={bh} rx={2} fill={d.count ? "#0f6b3e" : "#e3ddcf"}>
              <title>{`${d.date}: ${d.count}`}</title>
            </rect>
          </g>
        );
      })}
      <text x="0" y={h + 16} fontSize="10" fill="#66756c">{data[0]?.date.slice(5)}</text>
      <text x={w} y={h + 16} fontSize="10" fill="#66756c" textAnchor="end">{data[data.length - 1]?.date.slice(5)}</text>
    </svg>
  );
}

function HBars({ rows, color = "#0f6b3e" }: { rows: { label: string; count: number; color?: string }[]; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between text-sm"><span className="text-ink">{r.label}</span><span className="tabular-nums text-ink-3">{r.count}</span></div>
          <div className="mt-1 h-2 rounded-full bg-paper-2"><div className="h-2 rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: r.color ?? color }} /></div>
        </li>
      ))}
    </ul>
  );
}

function HourStrip({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  return (
    <div>
      <div className="grid grid-cols-24 gap-[3px]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }} role="img" aria-label="Reports by hour of day">
        {data.map((c, h) => (
          <div key={h} title={`${String(h).padStart(2, "0")}:00 — ${c}`} className="h-10 rounded-sm" style={{ background: c ? `rgba(15,107,62,${0.15 + 0.85 * (c / max)})` : "#e3ddcf" }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-3"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data, error, loading } = useApi<Analytics>("/api/analytics");
  return (
    <AppShell title="Analytics" subtitle="Patterns across anonymized community reports. Reports are unverified, so read trends as a guide, not a count of crime.">
      {error && <ErrorNote />}
      {loading && <Skeleton rows={4} />}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Kpi label="Last 24 hours" value={data.last24h} />
            <Kpi label="Last 7 days" value={data.last7d} hint={<Trend now={data.last7d} prev={data.prev7d} />} />
            <Kpi label="Last 30 days" value={data.last30d} />
            <Kpi label="All time" value={data.total} />
          </div>

          {data.total === 0 ? (
            <Card><p className="text-ink-2">No reports yet. When the community starts reporting, trends will appear here.</p></Card>
          ) : (
            <>
              <Card>
                <h2 className="font-serif text-xl  text-ink">Reports per day</h2>
                <p className="mb-4 text-sm text-ink-3">Last 30 days (Nairobi time)</p>
                <DailyBars data={data.byDay} />
              </Card>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <h2 className="mb-4 font-serif text-xl  text-ink">By severity</h2>
                  <HBars rows={([1, 2, 3, 4, 5] as const).map((s) => ({ label: SEVERITIES[s].label, count: data.bySeverity[s], color: SEVERITIES[s].color }))} />
                </Card>
                <Card>
                  <h2 className="mb-4 font-serif text-xl  text-ink">Most reported</h2>
                  <HBars rows={data.byType.map((t) => ({ label: t.type, count: t.count }))} />
                </Card>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <h2 className="font-serif text-xl  text-ink">Hotspots</h2>
                  <p className="mb-4 text-sm text-ink-3">Areas with the most reports, last 30 days</p>
                  {data.hotspots.length === 0 ? <p className="text-sm text-ink-2">No area has reports in the last 30 days.</p> : (
                    <ul className="divide-y divide-line">
                      {data.hotspots.map((h) => (
                        <li key={h.slug} className="flex items-center justify-between py-2.5 text-sm">
                          <Link href="/areas" className="font-medium text-ink hover:text-forest-700">{h.name}</Link>
                          <span className="tabular-nums text-ink-3">{h.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
                <Card>
                  <h2 className="font-serif text-xl  text-ink">Time of day</h2>
                  <p className="mb-4 text-sm text-ink-3">When reports happen, last 30 days</p>
                  <HourStrip data={data.byHour} />
                </Card>
              </div>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
