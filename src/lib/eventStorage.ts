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

// In-memory storage (will persist during server runtime)
const events: StoredEvent[] = [];

export function storeEvent(event: EventData, from: string, images?: string[]): StoredEvent {
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
  return storedEvent;
}

export function getEvents(): StoredEvent[] {
  return events;
}

export function getEventById(id: string): StoredEvent | undefined {
  return events.find(event => event.id === id);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
