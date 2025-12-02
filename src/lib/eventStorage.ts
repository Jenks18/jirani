import { promises as fs } from 'fs';
import path from 'path';
import { supabase, supabaseEnabled, ensureSupabaseAvailable, supabaseTable } from './supabaseClient';
import type { Database } from './database.types';
import { extractCoordinates } from './locationUtils';

// Simple in-memory storage for events (will be replaced with database)
interface StoredEvent {
  id: string;
  type: string;
  severity: number;
  location: string;
  description: string;
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

// Path to the events file
const EVENTS_FILE = path.join(process.cwd(), 'data', 'events.json');

// In-memory storage (will persist during server runtime)
let events: StoredEvent[] = [];

// Load events from file on startup
async function loadEventsFromFile(): Promise<StoredEvent[]> {
  try {
    const fileContent = await fs.readFile(EVENTS_FILE, 'utf8');
    const data = JSON.parse(fileContent);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.log('No existing events file found, starting with empty array');
    return [];
  }
}

// Save events to file
async function saveEventsToFile(eventsToSave: StoredEvent[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(EVENTS_FILE), { recursive: true });
    await fs.writeFile(EVENTS_FILE, JSON.stringify(eventsToSave, null, 2));
    console.log(`Saved ${eventsToSave.length} events to file`);
  } catch (error) {
    console.error('Error saving events to file:', error);
  }
}

// Initialize events from file
let eventsInitialized = false;
async function initializeEvents(): Promise<void> {
  if (!eventsInitialized) {
    events = await loadEventsFromFile();
    eventsInitialized = true;
    console.log(`Loaded ${events.length} events from file`);
  }
}

// Use Groq to rewrite a raw incident into a concise, professional, privacy-safe summary.
async function rewriteDescriptionWithGroq(event: EventData): Promise<string> {
  const raw = (event.description || '').trim();
  const type = event.type || 'Incident';
  const when = event.timestamp || new Date().toISOString();
  const where = event.location || 'unspecified location';

  // If no API key, fallback immediately
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return `${type} reported near ${where}. Approx time: ${when}. Summary: ${raw ? raw.slice(0, 180) : 'No details provided.'}`;
  }

  // System prompt to ensure generalization and PII removal
  const systemPrompt = `You are a civic safety report formatter. Rewrite the input into a concise, professional, crowdsourced incident summary.

Rules:
- 1–2 sentences, third-person, neutral tone.
- Keep incident type, general area, and approximate time.
- Remove or generalize PII and sensitive data: names, phone numbers, IMEI, exact addresses, plate numbers, exact shop names; replace with general terms (e.g., "a rider", "a shop", "near Kikuyu").
- Avoid first person; no promises; no internal details.
- Do NOT invent facts. If unknown, omit.
- Prefer phrases like: "reported near <area> around <time>".

Return only the summary text.`;

  const userContent = `Raw Description: ${raw || 'n/a'}\nType: ${type}\nWhere: ${where}\nWhen: ${when}`;

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'groq/compound',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.5,
        max_tokens: 160,
        top_p: 0.9
      })
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error('Groq rewrite failed:', t);
      return `${type} reported near ${where}. Approx time: ${when}. Summary: ${raw ? raw.slice(0, 180) : 'No details provided.'}`;
    }
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return `${type} reported near ${where}. Approx time: ${when}. Summary: ${raw ? raw.slice(0, 180) : 'No details provided.'}`;
    }
    return text;
  } catch (err) {
    console.error('Groq rewrite exception:', err);
    return `${type} reported near ${where}. Approx time: ${when}. Summary: ${raw ? raw.slice(0, 180) : 'No details provided.'}`;
  }
}

export async function storeEvent(event: EventData, from: string, images?: string[]): Promise<StoredEvent> {
  // Always sanitize and standardize the free-text description before saving
  const sanitizedDescription = await rewriteDescriptionWithGroq(event);
  
  // If coordinates not provided but location is, MUST geocode it
  let coordinates = event.coordinates;
  if (!coordinates && event.location && event.location !== 'Unknown location' && event.location !== 'Location not specified') {
    console.log(`🗺️  Geocoding location: "${event.location}"`);
    coordinates = await extractCoordinates(event.location);
    if (coordinates) {
      console.log(`✅ Geocoded to: [${coordinates[0]}, ${coordinates[1]}]`);
    } else {
      console.error(`❌ Geocoding failed for: "${event.location}" - report will have null coordinates`);
    }
  }
  
  // Try Supabase first
  try {
    const supabaseReady = await ensureSupabaseAvailable();
    if (!supabaseReady) {
      throw new Error('Supabase temporarily disabled by server (probe)');
    }
    // If we've previously flagged Supabase as unavailable due to schema errors or other problems,
    // only attempt again after backoff expires.
    const insertPayload: Database['public']['Tables']['events']['Insert'] = {
      type: event.type || 'Unknown',
      severity: event.severity || 1,
      location: event.location || 'Unknown location',
      description: sanitizedDescription || 'No description provided',
      event_timestamp: event.timestamp || new Date().toISOString(),
      longitude: coordinates ? coordinates[0] : null,
      latitude: coordinates ? coordinates[1] : null,
      from_phone: from,
      images: images && images.length ? images : null,
      source: 'whatsapp'
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from(supabaseTable || 'events').insert(insertPayload).select('*').single();
    if (error) throw error;

    const storedEvent: StoredEvent = {
      id: data.id,
      type: data.type,
      severity: data.severity,
      location: data.location,
      description: data.description,
      timestamp: data.event_timestamp,
      coordinates: data.longitude != null && data.latitude != null ? [data.longitude, data.latitude] : null,
      from: data.from_phone || from,
      createdAt: data.created_at,
      images: data.images || []
    };
    console.log('Event stored in Supabase:', storedEvent.id);
    return storedEvent;
  } catch (dbError) {
    // `ensureSupabaseAvailable()` is responsible for detecting schema errors and
    // toggling availability. Ensure we attempt another probe on the next call.
    try { /* noop - leaving for compatibility */ } catch (e) { /* noop */ }

    console.error('Supabase insert failed, falling back to file storage:', dbError);
    // Fallback to file system path
    await initializeEvents();
    const storedEvent: StoredEvent = {
      id: generateId(),
      type: event.type || 'Unknown',
      severity: event.severity || 1,
      location: event.location || 'Unknown location',
      description: sanitizedDescription || 'No description provided',
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
  // If Supabase is not configured, immediately use file fallback to avoid noisy errors.
  if (!supabaseEnabled || !supabase) {
    console.warn('Supabase not enabled - returning file-stored events');
    await initializeEvents();
    return events;
  }
  // Check whether Supabase has the expected schema and is available right now.
  const supabaseReady = await ensureSupabaseAvailable();
  if (!supabaseReady) {
    console.warn('Supabase not enabled - returning file-stored events');
    await initializeEvents();
    return events;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from(supabaseTable || 'events').select('*').order('event_timestamp', { ascending: false }).limit(500);
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      location: row.location,
      description: row.description,
      timestamp: row.event_timestamp,
      coordinates: row.longitude != null && row.latitude != null ? [row.longitude, row.latitude] : null,
      from: row.from_phone || 'unknown',
      createdAt: row.created_at,
      images: row.images || []
    }));
  } catch (err) {
    // Delegate schema detection to ensureSupabaseAvailable; log and fallback.
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
    const { data, error } = await (supabase as any).from(supabaseTable || 'events').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) return undefined;
    return {
      id: data.id,
      type: data.type,
      severity: data.severity,
      location: data.location,
      description: data.description,
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
