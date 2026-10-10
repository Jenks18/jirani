'use client';
import { useEffect, useRef } from 'react';
import { FaChevronLeft, FaRedo, FaSearch, FaWhatsapp } from 'react-icons/fa';
import { whatsappLink } from '@/config/org';
import {
  SEVERITIES,
  timeAgo,
  type Filters,
  type Report,
  type SeverityFilter,
  type TimeRange,
} from '@/lib/reports';

interface Props {
  reports: Report[];
  totalCount: number;
  status: 'loading' | 'ready' | 'error';
  updatedAt: Date | null;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  onCollapse: () => void;
}

const RANGES: { value: TimeRange; label: string }[] = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All time' },
];
const SEVERITY_CHIPS: { value: SeverityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'high', label: 'High +' },
  { value: 'critical', label: 'Critical +' },
];

function ReportItem({ report, selected, onSelect }: { report: Report; selected: boolean; onSelect: (id: string) => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected]);

  const sev = SEVERITIES[report.severity];
  return (
    <li>
      <button
        ref={ref}
        onClick={() => onSelect(report.id)}
        aria-pressed={selected}
        className={`block w-full border-b border-line/70 px-5 py-4 text-left transition-colors ${
          selected ? 'bg-forest-50' : 'bg-card hover:bg-paper'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: sev.color }} aria-hidden="true" />
          <span className="font-semibold text-ink">{report.type}</span>
          <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[11px] font-medium text-ink-2">{sev.label}</span>
          <time className="ml-auto text-xs text-ink-3" dateTime={report.createdAt}>
            {timeAgo(report.createdAt)}
          </time>
        </div>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-2">{report.summary}</p>
        <p className="mt-2 truncate text-xs text-ink-3">📍 {report.location}</p>
      </button>
    </li>
  );
}

export default function ReportsPanel({
  reports,
  totalCount,
  status,
  updatedAt,
  filters,
  onFiltersChange,
  selectedId,
  onSelect,
  onRefresh,
  onCollapse,
}: Props) {
  const filtersActive = filters.range !== 'all' || filters.severity !== 'all' || filters.query !== '';

  return (
    <section aria-label="Reports" className="flex h-full min-h-0 flex-col bg-card">
      <header className="border-b border-line px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl  text-ink">Reports</h2>
            <p className="mt-0.5 text-sm text-ink-3" aria-live="polite">
              {status === 'loading'
                ? 'Loading…'
                : filtersActive
                  ? `${reports.length} of ${totalCount} shown`
                  : `${totalCount} ${totalCount === 1 ? 'report' : 'reports'}`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onRefresh} className="rounded-full p-2.5 text-ink-3 hover:bg-paper-2" aria-label="Refresh reports">
              <FaRedo className={status === 'loading' ? 'animate-spin' : ''} />
            </button>
            <button onClick={onCollapse} className="rounded-full p-2.5 text-ink-3 hover:bg-paper-2" aria-label="Hide reports panel">
              <FaChevronLeft className="hidden md:block" />
              <span className="md:hidden text-lg leading-none">×</span>
            </button>
          </div>
        </div>

        <label className="relative mt-4 block">
          <span className="sr-only">Search reports</span>
          <FaSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-ink-3" />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
            placeholder="Search place or incident"
            className="w-full rounded-lg border border-line bg-paper py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-3 focus:border-forest-600 focus:outline-none"
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Severity" className="flex rounded-full border border-line bg-paper p-0.5">
            {SEVERITY_CHIPS.map((c) => (
              <button
                key={c.value}
                onClick={() => onFiltersChange({ ...filters, severity: c.value })}
                aria-pressed={filters.severity === c.value}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filters.severity === c.value ? 'bg-forest-800 text-white' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <label>
            <span className="sr-only">Time range</span>
            <select
              value={filters.range}
              onChange={(e) => onFiltersChange({ ...filters, range: e.target.value as TimeRange })}
              className="rounded-full border border-line bg-paper px-3 py-2 text-xs font-medium text-ink-2"
            >
              {RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-paper">
        {status === 'error' && (
          <div role="alert" className="m-4 rounded-lg border border-clay-500/30 bg-clay-50 p-4 text-sm text-clay-700">
            We couldn&apos;t load reports.{' '}
            <button onClick={onRefresh} className="font-semibold underline">
              Try again
            </button>
          </div>
        )}

        {status === 'loading' && reports.length === 0 && (
          <div className="space-y-3 p-5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-lg bg-card p-4">
                <div className="h-3 w-1/2 rounded bg-paper-2" />
                <div className="mt-3 h-3 w-full rounded bg-paper-2" />
                <div className="mt-2 h-3 w-3/4 rounded bg-paper-2" />
              </div>
            ))}
          </div>
        )}

        {status === 'ready' && reports.length === 0 && (
          <div className="p-8 text-center">
            <p className="font-serif text-lg  text-ink">
              {filtersActive ? 'No reports match these filters' : 'No reports yet'}
            </p>
            <p className="mt-2 text-sm text-ink-2">
              {filtersActive ? (
                <button className="font-semibold text-forest-700 underline" onClick={() => onFiltersChange({ range: 'all', severity: 'all', query: '' })}>
                  Clear filters
                </button>
              ) : (
                'New reports from the community appear here.'
              )}
            </p>
          </div>
        )}

        <ul>
          {reports.map((r) => (
            <ReportItem key={r.id} report={r} selected={r.id === selectedId} onSelect={onSelect} />
          ))}
        </ul>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-line bg-card px-5 py-3 text-xs text-ink-3">
        <span>{updatedAt ? `Updated ${timeAgo(updatedAt.toISOString())}` : ' '}</span>
        <a href={whatsappLink} className="inline-flex items-center gap-1.5 font-semibold text-forest-700 hover:underline">
          <FaWhatsapp /> Report an incident
        </a>
      </footer>
    </section>
  );
}
