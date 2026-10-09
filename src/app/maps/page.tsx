'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaListUl, FaWhatsapp } from 'react-icons/fa';
import Sidebar from '../Sidebar';
import ReportsPanel from '../ReportsPanel';
import MapComponent from '../MapComponent';
import { useReports } from './useReports';
import { whatsappLink } from '@/config/org';
import { DEFAULT_FILTERS, filterReports, type Filters } from '@/lib/reports';

const SIDEBAR_OPEN = 256;
const SIDEBAR_CLOSED = 64;
const PANEL_WIDTH = 400;

function useIsDesktop() {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return desktop;
}

export default function MapPage() {
  const { reports, status, updatedAt, refresh } = useReports();
  const desktop = useIsDesktop();
  const [vh, setVh] = useState(800);
  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectSeq, setSelectSeq] = useState(0);

  const visible = useMemo(() => filterReports(reports, filters), [reports, filters]);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      setSelectSeq((s) => s + 1);
      history.replaceState(null, '', `#r=${encodeURIComponent(id)}`);
    } else {
      history.replaceState(null, '', location.pathname + location.search);
    }
  }, []);

  // Deep link: /#r=<id>
  const [deepLinked, setDeepLinked] = useState(false);
  useEffect(() => {
    if (deepLinked || status !== 'ready') return;
    setDeepLinked(true);
    const id = new URLSearchParams(location.hash.slice(1)).get('r');
    if (id && reports.some((r) => r.id === id)) select(id);
  }, [status, reports, deepLinked, select]);

  // Escape clears selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && select(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [select]);

  const handleSelect = (id: string | null) => {
    select(id);
    if (id && !desktop) setPanelOpen(false); // reveal the map on phones
  };

  const insets = {
    left: desktop ? (sidebarCollapsed ? SIDEBAR_CLOSED : SIDEBAR_OPEN) + (panelOpen ? PANEL_WIDTH : 0) : 0,
    bottom: !desktop && panelOpen ? Math.round(vh * 0.55) : 0,
  };

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-paper">
      {desktop && (
        <div className="z-40 h-full shrink-0" style={{ width: sidebarCollapsed ? SIDEBAR_CLOSED : SIDEBAR_OPEN, transition: 'width 300ms' }}>
          <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
        </div>
      )}

      {/* Reports: side panel on desktop, bottom sheet on phones */}
      {panelOpen && (
        <div
          className={
            desktop
              ? 'z-30 h-full shrink-0 border-r border-line shadow-soft'
              : 'fixed inset-x-0 bottom-0 z-40 h-[55dvh] overflow-hidden rounded-t-3xl border-t border-line shadow-lift'
          }
          style={desktop ? { width: PANEL_WIDTH } : undefined}
        >
          <ReportsPanel
            reports={visible}
            totalCount={reports.length}
            status={status}
            updatedAt={updatedAt}
            filters={filters}
            onFiltersChange={setFilters}
            selectedId={selectedId}
            onSelect={handleSelect}
            onRefresh={refresh}
            onCollapse={() => setPanelOpen(false)}
          />
        </div>
      )}

      <main className="relative h-full min-w-0 flex-1">
        <MapComponent reports={visible} selectedId={selectedId} selectSeq={selectSeq} onSelect={select} insets={insets} />

        {!panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            className="absolute bottom-6 left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-forest-800 px-5 py-3 text-sm font-semibold text-white shadow-lift hover:bg-forest-900 md:bottom-auto md:left-4 md:top-4 md:translate-x-0"
          >
            <FaListUl /> Reports
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{visible.length}</span>
          </button>
        )}

        {!desktop && (
          <a
            href={whatsappLink}
            className="absolute right-3 top-3 z-30 inline-flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-xs font-semibold text-forest-800 shadow-soft"
          >
            <FaWhatsapp className="text-base" /> Report
          </a>
        )}
      </main>
    </div>
  );
}
