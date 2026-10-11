const DEFAULT_TILES = 'https://fika-data.kachalabs.com/r2026-09-23.1-r2';

interface Row {
  kind: string;
  name: string;
  lon: number;
  lat: number;
  buildings: number;
  county: string;
  subcounty: string;
  tokens: string[];
}

interface Index {
  rows: Row[];
  areaNames: Map<string, { county?: string; subcounty?: string }>;
}

const STOP = new Set([
  'near', 'at', 'the', 'a', 'an', 'in', 'on', 'of', 'opposite', 'opp', 'next', 'to', 'along', 'off', 'around', 'behind',
  'by', 'beside', 'area', 'estate', 'town', 'county', 'kenya', 'and', 'for', 'from', 'side', 'close', 'ke', 'road', 'rd',
]);

const norm = (s: string): string[] =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

let indexPromise: Promise<Index> | null = null;

function load(): Promise<Index> {
  if (!indexPromise) {
    const base = (process.env.FIKA_TILES || DEFAULT_TILES).replace(/\/$/, '');
    indexPromise = fetch(`${base}/meta/search.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`search index ${r.status}`);
        return r.json() as Promise<{ cols: string[]; rows: unknown[][] }>;
      })
      .then(({ cols, rows }) => {
        const ix = Object.fromEntries(cols.map((c, i) => [c, i]));
        const out: Row[] = [];
        const areaNames = new Map<string, { county?: string; subcounty?: string }>();
        for (const r of rows) {
          const name = String(r[ix.name] ?? '');
          const row: Row = {
            kind: String(r[ix.kind]),
            name,
            lon: Number(r[ix.lon]),
            lat: Number(r[ix.lat]),
            buildings: Number(r[ix.buildings] ?? 0),
            county: String(r[ix.county] ?? ''),
            subcounty: String(r[ix.subcounty] ?? ''),
            tokens: norm(name).filter((t) => !STOP.has(t)),
          };
          if (row.kind === 'county') areaNames.set(row.name.toLowerCase(), { county: row.name });
          else if (row.kind === 'subcounty' && !areaNames.has(row.name.toLowerCase())) areaNames.set(row.name.toLowerCase(), { county: row.county, subcounty: row.name });
          out.push(row);
        }
        return { rows: out, areaNames };
      })
      .catch((e) => {
        indexPromise = null;
        throw e;
      });
  }
  return indexPromise;
}

export interface PlaceHit {
  name: string;
  county: string;
  subcounty: string;
  lng: number;
  lat: number;
}

export async function findPlace(text: string, opts: { areaFallback?: boolean } = {}): Promise<PlaceHit | null> {
  const { rows, areaNames } = await load();
  const words = norm(text).filter((w) => !STOP.has(w));
  if (!words.length) return null;

  const phrase = words.join(' ');
  const counties = new Set<string>();
  const subcounties = new Set<string>();
  const content: string[] = [];
  for (const w of words) {
    const a = areaNames.get(w);
    if (a?.subcounty) subcounties.add(a.subcounty.toLowerCase());
    if (a?.county) counties.add(a.county.toLowerCase());
    if (!a) content.push(w);
  }
  const hasHint = counties.size > 0 || subcounties.size > 0;
  if (!content.length) {
    const hit = rows.find((r) => (r.kind === 'subcounty' || r.kind === 'county') && r.name.toLowerCase() === phrase);
    return hit ? { name: hit.name, county: hit.county, subcounty: hit.subcounty, lng: hit.lon, lat: hit.lat } : null;
  }

  const inArea = (r: Row) => {
    if (subcounties.size) return subcounties.has(r.subcounty.toLowerCase());
    if (counties.size) return counties.has(r.county.toLowerCase());
    return true;
  };

  const areaCentroid = (): PlaceHit | null => {
    for (const kind of ['subcounty', 'county'] as const) {
      const set = kind === 'subcounty' ? subcounties : counties;
      for (const w of set) {
        const hit = rows.find((r) => r.kind === kind && r.name.toLowerCase() === w);
        if (hit) return { name: hit.name, county: hit.county, subcounty: hit.subcounty, lng: hit.lon, lat: hit.lat };
      }
    }
    return null;
  };

  let best: { row: Row; score: number } | null = null;
  for (const r of rows) {
    if (r.kind === 'county' || r.kind === 'subcounty' || !inArea(r)) continue;
    const joined = r.tokens.join(' ');
    let all = true;
    for (const w of content) {
      if (!r.tokens.some((t) => t === w || (w.length >= 4 && t.startsWith(w)))) {
        all = false;
        break;
      }
    }
    if (!all) continue;
    const extra = r.tokens.length - content.length;
    let score = 50 - Math.min(extra, 10) * 3 + Math.min(r.buildings, 5);
    if (joined === content.join(' ')) score += 40;
    else if (joined.startsWith(content.join(' '))) score += 15;
    if (r.kind === 'landmark') score += 8;
    else if (r.kind === 'place') score += 4;
    if (!best || score > best.score) best = { row: r, score };
  }
  if (best) return { name: best.row.name, county: best.row.county, subcounty: best.row.subcounty, lng: best.row.lon, lat: best.row.lat };
  return opts.areaFallback && hasHint ? areaCentroid() : null;
}
