'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { KENYA_BOUNDS, MAPBOX_TOKEN, NAIROBI } from '@/lib/mapConfig';
import { SEVERITIES, formatWhen, type Report } from '@/lib/reports';

interface Props {
  reports: Report[];
  selectedId: string | null;
  selectSeq: number;
  onSelect: (id: string | null) => void;
  insets: { left: number; bottom: number };
  focus?: { lat: number; lng: number; zoom: number; seq: number } | null;
}

const SOURCE = 'reports';
const severityColorExpr: mapboxgl.ExpressionSpecification = [
  'match',
  ['get', 'severity'],
  1, SEVERITIES[1].color,
  2, SEVERITIES[2].color,
  3, SEVERITIES[3].color,
  4, SEVERITIES[4].color,
  5, SEVERITIES[5].color,
  SEVERITIES[3].color,
];

function toGeoJSON(reports: Report[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: reports
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.longitude as number, r.latitude as number] },
        properties: { id: r.id, severity: r.severity },
      })),
  };
}

function buildPopup(report: Report): HTMLElement {
  const root = document.createElement('div');
  root.className = 'jirani-popup';

  const head = document.createElement('div');
  head.className = 'jirani-popup-head';
  const dot = document.createElement('span');
  dot.className = 'jirani-popup-dot';
  dot.style.background = SEVERITIES[report.severity].color;
  const title = document.createElement('strong');
  title.textContent = report.type;
  head.append(dot, title);

  const body = document.createElement('p');
  body.textContent = report.summary;

  const meta = document.createElement('div');
  meta.className = 'jirani-popup-meta';
  meta.textContent = `${SEVERITIES[report.severity].label} · ${report.location} · ${formatWhen(report.createdAt)}`;

  root.append(head, body, meta);
  return root;
}

export default function MapComponent({ reports, selectedId, selectSeq, onSelect, insets, focus }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [ready, setReady] = useState(false);

  const onSelectRef = useRef(onSelect);
  const reportsRef = useRef(reports);
  const insetsRef = useRef(insets);
  const fittedRef = useRef(false);
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    onSelectRef.current = onSelect;
    reportsRef.current = reports;
    insetsRef.current = insets;
  });

  useEffect(() => {
    if (!container.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: container.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: NAIROBI,
      zoom: 10,
      maxBounds: [
        [KENYA_BOUNDS[0][0] - 8, KENYA_BOUNDS[0][1] - 8],
        [KENYA_BOUNDS[1][0] + 8, KENYA_BOUNDS[1][1] + 8],
      ],
      attributionControl: false,
      cooperativeGestures: false,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(
      new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }),
      'top-right'
    );
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 80, unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      map.addSource(SOURCE, {
        type: 'geojson',
        data: toGeoJSON([]),
        promoteId: 'id',
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 13,
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SOURCE,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#0a3d26',
          'circle-opacity': 0.92,
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 26],
          'circle-stroke-width': 3,
          'circle-stroke-color': 'rgba(255,255,255,0.9)',
        },
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SOURCE,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 13,
        },
        paint: { 'text-color': '#ffffff' },
      });
      map.addLayer({
        id: 'report-halo',
        type: 'circle',
        source: SOURCE,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 22, 0],
          'circle-color': severityColorExpr,
          'circle-opacity': 0.28,
          'circle-blur': 0.5,
        },
      });
      map.addLayer({
        id: 'report-points',
        type: 'circle',
        source: SOURCE,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 11, 7],
          'circle-color': severityColorExpr,
          'circle-stroke-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3, 2],
          'circle-stroke-color': '#ffffff',
        },
      });

      map.on('click', 'clusters', (e) => {
        const feature = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
        const clusterId = feature?.properties?.cluster_id as number | undefined;
        if (clusterId == null) return;
        (map.getSource(SOURCE) as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return;
          map.easeTo({ center: (feature.geometry as GeoJSON.Point).coordinates as [number, number], zoom: zoom + 0.5 });
        });
      });
      map.on('click', 'report-points', (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id != null) onSelectRef.current(String(id));
      });
      map.on('click', (e) => {
        const hit = map.queryRenderedFeatures(e.point, { layers: ['clusters', 'report-points'] });
        if (hit.length === 0) onSelectRef.current(null);
      });
      for (const layer of ['clusters', 'report-points']) {
        map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'));
        map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''));
      }

      setReady(true);
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container.current);

    return () => {
      ro.disconnect();
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      fittedRef.current = false;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource(SOURCE) as mapboxgl.GeoJSONSource | undefined)?.setData(toGeoJSON(reports));

    const located = reports.filter((r) => r.latitude != null && r.longitude != null);
    if (!fittedRef.current && located.length > 0) {
      fittedRef.current = true;
      const bounds = new mapboxgl.LngLatBounds();
      located.forEach((r) => bounds.extend([r.longitude as number, r.latitude as number]));
      const { clientWidth: w, clientHeight: h } = map.getContainer();
      const side = Math.max(0, Math.min(48, Math.floor(w / 4)));
      const top = Math.max(0, Math.min(64, Math.floor(h / 6)));
      const bottom = Math.max(0, Math.min(insetsRef.current.bottom + 48, Math.floor(h / 2.5)));
      try {
        map.fitBounds(bounds, { padding: { left: side, right: side, top, bottom }, maxZoom: 13, duration: 0 });
      } catch {
        map.jumpTo({ center: bounds.getCenter(), zoom: 11 });
      }
    }
  }, [reports, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const prev = prevSelectedRef.current;
    if (prev) map.setFeatureState({ source: SOURCE, id: prev }, { selected: false });
    popupRef.current?.remove();
    prevSelectedRef.current = selectedId;
    if (!selectedId) return;

    const report = reportsRef.current.find((r) => r.id === selectedId);
    if (!report || report.latitude == null || report.longitude == null) return;

    map.setFeatureState({ source: SOURCE, id: selectedId }, { selected: true });
    const lngLat: [number, number] = [report.longitude, report.latitude];

    popupRef.current = new mapboxgl.Popup({ offset: 16, closeButton: true, maxWidth: '300px', className: 'jirani-popup-wrap' })
      .setLngLat(lngLat)
      .setDOMContent(buildPopup(report))
      .addTo(map);
    popupRef.current.on('close', () => {
      if (prevSelectedRef.current === selectedId) onSelectRef.current(null);
    });

    const { clientHeight: h } = map.getContainer();
    const bottom = Math.min(insetsRef.current.bottom + 24, Math.floor(h / 2.5));
    map.stop();
    map.easeTo({
      center: lngLat,
      zoom: Math.max(map.getZoom(), 14),
      duration: 700,
      padding: { left: 24, right: 24, top: 24, bottom },
      essential: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectSeq, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !focus) return;
    fittedRef.current = true;
    map.stop();
    map.easeTo({
      center: [focus.lng, focus.lat],
      zoom: focus.zoom,
      duration: 900,
      padding: { left: 24, right: 24, top: 24, bottom: Math.min(insetsRef.current.bottom + 24, Math.floor(map.getContainer().clientHeight / 2.5)) },
      essential: true,
    });
  }, [focus, ready]);

  return (
    <div className="absolute inset-0">
      <div ref={container} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} role="application" aria-label="Interactive map of community reports" />
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-14 left-3 hidden rounded-lg border border-line bg-card/95 px-3 py-2 text-[11px] text-ink-2 shadow-soft backdrop-blur md:block">
      <div className="mb-1 font-semibold uppercase tracking-wider text-ink-3">Severity</div>
      <ul className="flex gap-3">
        {([1, 2, 3, 4, 5] as const).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEVERITIES[s].color }} />
            {SEVERITIES[s].label}
          </li>
        ))}
      </ul>
    </div>
  );
}
