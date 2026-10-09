"use client";
import Link from "next/link";
import { useMemo } from "react";
import AppShell from "../_components/AppShell";
import { useApi } from "../_components/useApi";
import { Card, ErrorNote, Skeleton } from "../_components/ui";
import type { Area } from "@/lib/platform";

type AreaRow = Area & { reports30d: number; reportsTotal: number };
const LEVEL_LABEL: Record<Area["level"], string> = { country: "Country", county: "County", subcounty: "Sub-county", neighborhood: "Neighborhood" };
const ZOOM: Record<Area["level"], number> = { country: 6, county: 10, subcounty: 12, neighborhood: 14 };

function Node({ area, tree, depth }: { area: AreaRow; tree: Map<string | null, AreaRow[]>; depth: number }) {
  const kids = tree.get(area.id) ?? [];
  return (
    <li>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl px-3 py-3 hover:bg-paper" style={{ marginLeft: depth * 20 }}>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{area.name}</p>
          <p className="text-xs text-ink-3">{LEVEL_LABEL[area.level]}</p>
        </div>
        <p className="text-sm tabular-nums text-ink-2"><strong className="text-ink">{area.reports30d}</strong> in 30 days · {area.reportsTotal} total</p>
        <Link href={`/#ll=${area.center_lat},${area.center_lng},${ZOOM[area.level]}`} className="text-sm font-semibold text-forest-700 hover:underline">View on map</Link>
      </div>
      {kids.length > 0 && <ul>{kids.map((k) => <Node key={k.id} area={k} tree={tree} depth={depth + 1} />)}</ul>}
    </li>
  );
}

export default function AreasPage() {
  const { data, error, loading } = useApi<{ areas: AreaRow[] }>("/api/areas");
  const { roots, tree } = useMemo(() => {
    const map = new Map<string | null, AreaRow[]>();
    for (const a of data?.areas ?? []) map.set(a.parent_id, [...(map.get(a.parent_id) ?? []), a]);
    return { roots: map.get(null) ?? [], tree: map };
  }, [data]);

  return (
    <AppShell title="Areas" subtitle="Browse reports by place, from country down to neighborhood. Counts use each area's approximate radius.">
      {error && <ErrorNote />}
      {loading && <Skeleton rows={5} />}
      {data && (
        <Card className="p-2">
          {roots.length === 0 ? <p className="p-4 text-ink-2">No areas have been set up yet.</p> : <ul>{roots.map((r) => <Node key={r.id} area={r} tree={tree} depth={0} />)}</ul>}
        </Card>
      )}
    </AppShell>
  );
}
