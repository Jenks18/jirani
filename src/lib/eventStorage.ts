import { debug } from './log';
import { promises as fs } from 'fs';
import path from 'path';
import { supabase, supabaseEnabled, ensureSupabaseAvailable } from './supabaseClient';
import { extractCoordinates } from './locationUtils';
import { chat } from './llm';

interface StoredEvent {
  id: string;
  type: string;
  severity: number;
  location: string;
  summary: string;
  timestamp: string;
  coordinates: [number, number] | null;
  from: string;
  createdAt: string;
  images?: string[];
}

interface EventData {
  type?: string;
  severity?: number;
  location?: string;
  description?: string;
  timestamp?: string;
  coordinates?: [number, number] | null;
}

const EVENTS_FILE = path.join(process.cwd(), 'data', 'events.json');

let events: StoredEvent[] = [];

async function loadEventsFromFile(): Promise<StoredEvent[]> {
  try {
    const fileContent = await fs.readFile(EVENTS_FILE, 'utf8');
    const data = JSON.parse(fileContent);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    debug('No existing events file found, starting with empty array');
    return [];
  }
}

async function saveEventsToFile(eventsToSave: StoredEvent[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(EVENTS_FILE), { recursive: true });
    await fs.writeFile(EVENTS_FILE, JSON.stringify(eventsToSave, null, 2));
    debug(`Saved ${eventsToSave.length} events to file`);
  } catch (error) {
    console.error('Error saving events to file:', error);
  }
}

let eventsInitialized = false;
async function initializeEvents(): Promise<void> {
  if (!eventsInitialized) {
    events = await loadEventsFromFile();
    eventsInitialized = true;
    debug(`Loaded ${events.length} events from file`);
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

async function summarizeIncident(event: EventData): Promise<string> {
  const type = event.type || 'Incident';
  const where = event.location || 'an unspecified location';
  const safeFallback = `${type} reported near ${where}.`;
  const raw = (event.description || '').trim();
  if (!raw) return safeFallback;

  try {
    const text = await chat({
      messages: [
        { role: 'system', content: SUMMARY_PROMPT },
        { role: 'user', content: `Raw description: ${raw}\nType: ${type}\nWhere: ${where}\nWhen: ${event.timestamp || new Date().toISOString()}` },
      ],
      temperature: 0.3,
      maxTokens: 300,
    });
    return text;
  } catch (err) {
    console.error('Summary generation failed, using a safe generic summary:', err);
    return safeFallback;
  }
}

export async function storeEvent(event: EventData, from: string, images?: string[]): Promise<StoredEvent> {
  const sanitizedDescription = await summarizeIncident(event);
  
  let coordinates = event.coordinates;
  if (!coordinates && event.location && event.location !== 'Unknown location' && event.location !== 'Location not specified') {
    debug(`🗺️  Geocoding location: "${event.location}"`);
    coordinates = await extractCoordinates(event.location);
    if (coordinates) {
      debug(`✅ Geocoded to: [${coordinates[0]}, ${coordinates[1]}]`);
    } else {
      console.error(`❌ Geocoding failed for: "${event.location}" - report will have null coordinates`);
    }
  }
  
  try {
    const supabaseReady = await ensureSupabaseAvailable();
    if (!supabaseReady) {
      throw new Error('Supabase temporarily disabled by server (probe)');
    }
    const insertPayload = {
      type: event.type || 'Unknown',
      severity: event.severity || 1,
      location: event.location || 'Unknown location',
      summary: sanitizedDescription || 'No description provided',
      event_timestamp: event.timestamp || new Date().toISOString(),
      longitude: coordinates ? coordinates[0] : null,
      latitude: coordinates ? coordinates[1] : null,
      from_phone: from,
      images: images && images.length ? images : null,
      source: 'whatsapp'
    };

    debug('📤 Inserting to Supabase reports:', { type: insertPayload.type, location: insertPayload.location, coords: [insertPayload.longitude, insertPayload.latitude] });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from('reports').insert(insertPayload).select('*').single();
    if (error) {
      console.error('❌ Supabase insert error:', error);
      throw error;
    }

    debug('✅ Supabase insert successful:', data.id);

    const storedEvent: StoredEvent = {
      id: data.id,
      type: data.type,
      severity: data.severity,
      location: data.location,
      summary: data.summary,
      timestamp: data.event_timestamp,
      coordinates: data.longitude != null && data.latitude != null ? [data.longitude, data.latitude] : null,
      from: data.from_phone || from,
      createdAt: data.created_at,
      images: data.images || []
    };
    debug('Event stored in Supabase:', storedEvent.id);
    return storedEvent;
  } catch (dbError) {
    try { /* noop - leaving for compatibility */ } catch (e) { /* noop */ }

    console.error('Supabase insert failed, falling back to file storage:', dbError);
    await initializeEvents();
    const storedEvent: StoredEvent = {
      id: generateId(),
      type: event.type || 'Unknown',
      severity: event.severity || 1,
      location: event.location || 'Unknown location',
      summary: sanitizedDescription || 'No description provided',
      timestamp: event.timestamp || new Date().toISOString(),
      coordinates: coordinates || null,
      from,
      createdAt: new Date().toISOString(),
      images: images || []
    };
    events.push(storedEvent);
    saveEventsToFile(events).catch(err => console.error('Failed to save events to file:', err));
    return storedEvent;
  }
}

export async function getEvents(): Promise<StoredEvent[]> {
  if (!supabaseEnabled || !supabase) {
    console.warn('Supabase not enabled - returning file-stored events');
    await initializeEvents();
    return events;
  }
  const supabaseReady = await ensureSupabaseAvailable();
  if (!supabaseReady) {
    console.warn('Supabase not enabled - returning file-stored events');
    await initializeEvents();
    return events;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error} = await (supabase as any).from('reports').select('*').order('event_timestamp', { ascending: false }).limit(500);
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      location: row.location,
      summary: row.summary,
      timestamp: row.event_timestamp,
      coordinates: row.longitude != null && row.latitude != null ? [row.longitude, row.latitude] : null,
      from: row.from_phone || 'unknown',
      createdAt: row.created_at,
      images: row.images || []
    }));
  } catch (err) {
    console.error('Supabase fetch failed, using file fallback:', err);
    await initializeEvents();
    return events;
  }
}

export async function getEventById(id: string): Promise<StoredEvent | undefined> {
  try {
    const supabaseReady = await ensureSupabaseAvailable();
    if (!supabaseReady) throw new Error('Supabase temporarily disabled by server (probe)');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from('reports').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) return undefined;
    return {
      id: data.id,
      type: data.type,
      severity: data.severity,
      location: data.location,
      summary: data.summary,
      timestamp: data.event_timestamp,
      coordinates: data.longitude != null && data.latitude != null ? [data.longitude, data.latitude] : null,
      from: data.from_phone || 'unknown',
      createdAt: data.created_at,
      images: data.images || []
    };
  } catch (err) {
    console.error('Supabase single fetch failed, using file fallback:', err);
    await initializeEvents();
    return events.find(event => event.id === id);
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
