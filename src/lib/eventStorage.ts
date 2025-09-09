import { promises as fs } from 'fs';
import path from 'path';

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
  console.log('Event stored:', storedEvent);
  
  // Save to file asynchronously (don't wait for it)
  saveEventsToFile(events).catch(error => 
    console.error('Failed to save events to file:', error)
  );
  
  return storedEvent;
}

export async function getEvents(): Promise<StoredEvent[]> {
  await initializeEvents();
  return events;
}

export async function getEventById(id: string): Promise<StoredEvent | undefined> {
  await initializeEvents();
  return events.find(event => event.id === id);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
