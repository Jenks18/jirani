import { promises as fs } from 'fs';
import path from 'path';
import { supabase } from './supabaseClient';
import type { Database } from './database.types';

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

export async function storeEvent(event: EventData, from: string, images?: string[]): Promise<StoredEvent> {
  // Try Supabase first
  try {
    const insertPayload: Database['public']['Tables']['events']['Insert'] = {
      type: event.type || 'Unknown',
      severity: event.severity || 1,
      location: event.location || 'Unknown location',
      description: event.description || 'No description provided',
      event_timestamp: event.timestamp || new Date().toISOString(),
      longitude: event.coordinates ? event.coordinates[0] : null,
      latitude: event.coordinates ? event.coordinates[1] : null,
      from_phone: from,
      images: images && images.length ? images : null,
      source: 'whatsapp'
    };

    const { data, error } = await supabase.from('events').insert(insertPayload).select('*').single();
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
    console.error('Supabase insert failed, falling back to file storage:', dbError);
    // Fallback to file system path
    await initializeEvents();
    const storedEvent: StoredEvent = {
      id: generateId(),
      type: event.type || 'Unknown',
      severity: event.severity || 1,
      location: event.location || 'Unknown location',
      description: event.description || 'No description provided',
      timestamp: event.timestamp || new Date().toISOString(),
      coordinates: event.coordinates || null,
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
  try {
    const { data, error } = await supabase.from('events').select('*').order('event_timestamp', { ascending: false }).limit(500);
    if (error) throw error;
    return (data || []).map(row => ({
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
    console.error('Supabase fetch failed, using file fallback:', err);
    await initializeEvents();
    return events;
  }
}

export async function getEventById(id: string): Promise<StoredEvent | undefined> {
  try {
    const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
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
