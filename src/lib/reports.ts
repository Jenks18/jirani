/** Shared, client-safe report model for the live map and the list panel. */

export interface Report {
  id: string;
  type: string;
  /** 1 (low) … 5 (emergency) */
  severity: Severity;
  location: string;
  summary: string;
  /** When the incident happened (ISO) */
  timestamp: string;
  /** When it was reported (ISO) */
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
}

export type Severity = 1 | 2 | 3 | 4 | 5;

export const SEVERITIES: Record<Severity, { label: string; color: string }> = {
  1: { label: 'Low', color: '#2f9e63' },
  2: { label: 'Moderate', color: '#e8b13a' },
  3: { label: 'High', color: '#e07a2f' },
  4: { label: 'Critical', color: '#cf3b2c' },
  5: { label: 'Emergency', color: '#8f1d12' },
};

export function toSeverity(value: unknown): Severity {
  const n = typeof value === 'number' ? Math.round(value) : Number.parseInt(String(value), 10);
  if (n >= 1 && n <= 5) return n as Severity;
  return 3;
}

export type TimeRange = '24h' | '7d' | '30d' | 'all';
export type SeverityFilter = 'all' | 'high' | 'critical';

export interface Filters {
  range: TimeRange;
  severity: SeverityFilter;
  query: string;
}

export const DEFAULT_FILTERS: Filters = { range: 'all', severity: 'all', query: '' };

const RANGE_MS: Record<Exclude<TimeRange, 'all'>, number> = {
  '24h': 24 * 3600_000,
  '7d': 7 * 24 * 3600_000,
  '30d': 30 * 24 * 3600_000,
};

export function filterReports(reports: Report[], f: Filters, now = Date.now()): Report[] {
  const q = f.query.trim().toLowerCase();
  const minSeverity = f.severity === 'critical' ? 4 : f.severity === 'high' ? 3 : 1;
  return reports.filter((r) => {
    if (r.severity < minSeverity) return false;
    if (f.range !== 'all' && now - new Date(r.createdAt).getTime() > RANGE_MS[f.range]) return false;
    if (q && !`${r.type} ${r.location} ${r.summary}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function timeAgo(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 1) return 'just now';
  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute');
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) > 30) {
    return new Date(iso).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', year: 'numeric' });
  }
  return rtf.format(days, 'day');
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-KE', {
    timeZone: 'Africa/Nairobi',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
