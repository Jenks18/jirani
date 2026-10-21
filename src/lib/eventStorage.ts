import { debug } from './log';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { supabase, supabaseEnabled, ensureSupabaseAvailable } from './supabaseClient';
import { extractCoordinates } from './locationUtils';
import { chat } from './llm';
import { coarsenPoint, floorToHour, publicPlace, publicType, scrubText } from './anonymize';
import { areaForPoint, listAreas } from './platform';

export interface StoredEvent {
  id: string;
  type: string;
  severity: number;
  location: string;
  summary: string;
  timestamp: string;
  coordinates: [number, number] | null;
  createdAt: string;
}

interface EventData {
  type?: string;
  severity?: number;
  location?: string;
  description?: string;
  timestamp?: string;
  coordinates?: [number, number] | null;
}

const PUBLIC_COLUMNS = 'id, type, severity, location, summary, event_timestamp, latitude, longitude, created_at';

const EVENTS_FILE = path.join(os.tmpdir(), 'jirani-events.json');

let events: StoredEvent[] = [];

async function loadEventsFromFile(): Promise<StoredEvent[]> {
  try {
    const data = JSON.parse(await fs.readFile(EVENTS_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function saveEventsToFile(eventsToSave: StoredEvent[]): Promise<void> {
  try {
    await fs.writeFile(EVENTS_FILE, JSON.stringify(eventsToSave), { mode: 0o600 });
  } catch (error) {
    console.error('Error saving events to file:', error instanceof Error ? error.message : 'unknown');
  }
}

let eventsInitialized = false;
async function initializeEvents(): Promise<void> {
  if (!eventsInitialized) {
    events = await loadEventsFromFile();
    eventsInitialized = true;
  }
}

const SUMMARY_PROMPT = `You are a civic safety report formatter. Rewrite the input into a concise, professional, crowdsourced incident summary.

Rules:
- 1-2 sentences, third-person, neutral tone.
- Keep incident type, general area, and approximate time.
- Remove or generalize PII and sensitive data: names, phone numbers, IMEI, exact addresses, plate numbers, exact shop names; replace with general terms (for example "a rider", "a shop", "near Kikuyu").
- Avoid first person. No promises. No internal details.
- Do NOT invent facts. If unknown, omit.
- Prefer phrases like "reported near <area> around <time>".

Return only the summary text.`;

async function summarizeIncident(event: EventData, where: string): Promise<string> {
  const type = publicType(event.type);
  const safeFallback = `${type} reported near ${where}.`;
  const raw = (event.description || '').replace(/📍 Location shared:[^\n]*/g, '').trim();
  if (!raw) return safeFallback;

  try {
    const text = await chat({
      messages: [
        { role: 'system', content: SUMMARY_PROMPT },
        { role: 'user', content: `Raw description: ${raw}\nType: ${type}\nWhere: ${where}` },
      ],
      temperature: 0.3,
      maxTokens: 300,
    });
    return scrubText(text, 400) || safeFallback;
  } catch (err) {
    console.error('Summary generation failed, using a safe generic summary:', err instanceof Error ? err.message : 'unknown');
    return safeFallback;
  }
}

async function areaResolver(): Promise<(lat: number, lng: number) => string | null> {
  try {
    const areas = await listAreas();
    return (lat, lng) => areaForPoint(areas, lat, lng)?.name ?? null;
  } catch {
    return () => null;
  }
}

export async function storeEvent(event: EventData): Promise<StoredEvent> {
  let coordinates = event.coordinates ?? null;
  if (!coordinates && event.location && event.location !== 'Unknown location' && event.location !== 'Location not specified') {
    coordinates = await extractCoordinates(event.location);
    if (!coordinates) debug('Geocoding failed; report will have no coordinates');
  }

  const point = coordinates ? coarsenPoint(coordinates) : null;
  const resolveArea = await areaResolver();
  const location = publicPlace(event.location || 'Unknown location', coordinates ? { lat: coordinates[1], lng: coordinates[0] } : null, resolveArea);
  const summary = await summarizeIncident(event, location);
  const type = publicType(event.type);
  const severity = Math.min(Math.max(Math.round(event.severity || 1), 1), 5);
  const eventTime = floorToHour(event.timestamp);
  const recordedAt = floorToHour(null);

  try {
    const supabaseReady = await ensureSupabaseAvailable();
    if (!supabaseReady || !supabase) throw new Error('database unavailable');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('reports')
      .insert({
        type,
        severity,
        location,
        summary,
        event_timestamp: eventTime,
        created_at: recordedAt,
        longitude: point ? point[0] : null,
        latitude: point ? point[1] : null,
        source: 'whatsapp',
      })
      .select(PUBLIC_COLUMNS)
      .single();
    if (error) {
      console.error('Report insert failed:', error.code, error.message);
      throw new Error('insert failed');
    }
    return fromRow(data);
  } catch (dbError) {
    console.error('Database write failed, falling back to temporary storage:', dbError instanceof Error ? dbError.message : 'unknown');
    await initializeEvents();
    const stored: StoredEvent = {
      id: generateId(),
      type,
      severity,
      location,
      summary,
      timestamp: eventTime,
      coordinates: point,
      createdAt: recordedAt,
    };
    events.push(stored);
    void saveEventsToFile(events);
    return stored;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(row: any): StoredEvent {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    location: row.location,
    summary: row.summary,
    timestamp: row.event_timestamp,
    coordinates: row.longitude != null && row.latitude != null ? [row.longitude, row.latitude] : null,
    createdAt: row.created_at,
  };
}

export async function getEvents(): Promise<StoredEvent[]> {
  if (!supabaseEnabled || !supabase || !(await ensureSupabaseAvailable())) {
    await initializeEvents();
    return events;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from('reports').select(PUBLIC_COLUMNS).order('event_timestamp', { ascending: false }).limit(500);
    if (error) throw new Error(`${error.code} ${error.message}`);
    return (data || []).map(fromRow);
  } catch (err) {
    console.error('Report fetch failed, using temporary storage:', err instanceof Error ? err.message : 'unknown');
    await initializeEvents();
    return events;
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
