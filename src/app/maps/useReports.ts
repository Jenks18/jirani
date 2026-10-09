'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Report } from '@/lib/reports';

type Status = 'loading' | 'ready' | 'error';

/** Fetches reports once, then polls while the tab is visible. */
export function useReports(pollMs = 60_000) {
  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch('/api/events', { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { reports?: Report[] };
      const list = (data.reports ?? []).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setReports(list);
      setStatus('ready');
      setUpdatedAt(new Date());
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setStatus((s) => (s === 'ready' ? 'ready' : 'error'));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const id = setInterval(tick, pollMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      abortRef.current?.abort();
    };
  }, [refresh, pollMs]);

  return { reports, status, updatedAt, refresh };
}
