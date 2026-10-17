import { debug, maskPhone } from './log';
import { supabase } from './supabaseClient';
import { chat as defaultChat, type ChatFn, type ChatMessage } from './llm';

interface Message {
  id: string;
  timestamp: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface IncidentReport {
  type: string;
  description: string;
  location?: string;
  coordinates?: [number, number];
  timestamp: string;
  severity: number;
  confirmed: boolean;
}

export interface ConversationState {
  userId: string;
  messages: Message[];
  currentIncident?: IncidentReport;
  awaitingConfirmation: boolean;
  conversationPhase: 'greeting' | 'collecting' | 'confirming' | 'completed';
  lastActivity: Date;
  lastStoredAt?: Date;
}

export interface ConversationStore {
  load(userId: string): Promise<ConversationState | null>;
  save(state: ConversationState): Promise<void>;
  remove(userId: string): Promise<void>;
}

const MAX_STORED_MESSAGES = 50;
const PROMPT_MESSAGES = 14;
const PROMPT_WINDOW_MS = 24 * 60 * 60 * 1000;
const SHORT_REPLY_CHARS = 30;

const YES_RE = /^(y|yes|yep|yeah|yea|ndio|sawa|ok|okay|sure|confirm|confirmed|go ahead|file it|file|proceed|yes please)\b/i;
const NO_RE = /^(n|no|nope|hapana|cancel|stop|don'?t|do not)\b/i;

const FALLBACK_REPLY = "Sorry, I'm having a little trouble right now. Please send that again in a moment.";

const SYSTEM_PROMPT = `You are Jirani, a warm, brief community safety assistant for Kenya, run by The 6.25 Movement. You help people report safety incidents that are shown anonymously on a community map.

HOW TO TALK
- Natural Kenyan English with light Kiswahili touches ("Pole sana", "Sawa"). Use full Kiswahili only if the user writes in Kiswahili or asks for it.
- 1-3 short sentences. One question at a time.
- You are in an ongoing WhatsApp chat. Read the whole conversation. Never greet or introduce yourself again once the chat has started. Never ask for something the user already told you. Build on their last message.
- Stay on safety and incident reporting. Politely steer off-topic chat back. Do not discuss how you were built.
- If someone is in immediate danger, tell them to call 999 or 112 first.
- Do not ask for or repeat names, plate numbers, phone numbers or home addresses of people. Ask users to describe what happened, not to accuse individuals.

REPORTING
- To file a report you need: what happened, where, and roughly when. If "when" is missing, assume it just happened.
- Ask for whatever is missing, one thing at a time. For location say they can share a location pin or type the place and town.
- If the place name could be in several towns (for example Junction Mall, City Mall), ask which town.
- When you have what, where and when, set ask_confirmation to true and write a reply that summarizes the incident in one sentence and asks: Should I file this report? Reply "yes" to confirm.
- Never say a report is filed. Filing happens only after the user confirms.
- If the user is only chatting or asking something, set incident to null.

OUTPUT
Reply with ONLY a JSON object:
{"reply": "<message to the user>", "incident": null | {"type": "Theft|Robbery|Burglary|Assault|Harassment|Vandalism|Suspicious Activity|Other", "severity": 1-5, "location": "<exact place text the user gave, or null>", "summary": "<neutral one-sentence description>"}, "ask_confirmation": true|false}
Keep "incident" filled in on every turn once an incident has been described, updating it with new details.`;

class SupabaseStore implements ConversationStore {
  async load(userId: string): Promise<ConversationState | null> {
    if (!supabase) {
      console.error('Supabase client not available; conversation memory is disabled');
      return null;
    }
    const { data, error } = await supabase.from('conversations').select('*').eq('user_id', userId).maybeSingle();
    if (error) {
      console.error('Error loading conversation:', error.code, error.message);
      return null;
    }
    if (!data) return null;
    return {
      userId: data.user_id,
      messages: Array.isArray(data.messages) ? data.messages : [],
      currentIncident: data.current_incident ?? undefined,
      awaitingConfirmation: Boolean(data.awaiting_confirmation),
      conversationPhase: data.conversation_phase || 'greeting',
      lastActivity: new Date(data.last_activity),
      lastStoredAt: data.last_stored_at ? new Date(data.last_stored_at) : undefined,
    };
  }

  async save(c: ConversationState): Promise<void> {
    if (!supabase) return;
    const row: Record<string, unknown> = {
      user_id: c.userId,
      messages: c.messages,
      current_incident: c.currentIncident ?? null,
      awaiting_confirmation: c.awaitingConfirmation,
      conversation_phase: c.conversationPhase,
      last_activity: c.lastActivity.toISOString(),
    };
    if (c.lastStoredAt) row.last_stored_at = c.lastStoredAt.toISOString();
    const { error } = await supabase.from('conversations').upsert(row, { onConflict: 'user_id' });
    if (error) console.error('Conversation save failed:', error.code, error.message);
  }

  async remove(userId: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('conversations').delete().eq('user_id', userId);
    if (error) console.error('Conversation delete failed:', error.message);
  }
}

interface ModelTurn {
  reply: string;
  incident: { type?: string; severity?: number; location?: string | null; summary?: string } | null;
  askConfirmation: boolean;
}

function parseTurn(text: string): ModelTurn | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const j = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const reply = typeof j.reply === 'string' ? j.reply.trim() : '';
    if (!reply) return null;
    const inc = j.incident && typeof j.incident === 'object' ? (j.incident as Record<string, unknown>) : null;
    return {
      reply,
      incident: inc
        ? {
            type: typeof inc.type === 'string' ? inc.type : undefined,
            severity: typeof inc.severity === 'number' ? inc.severity : Number.parseInt(String(inc.severity), 10) || undefined,
            location: typeof inc.location === 'string' && inc.location.trim() && inc.location.trim().toLowerCase() !== 'null' ? inc.location.trim() : null,
            summary: typeof inc.summary === 'string' ? inc.summary : undefined,
          }
        : null,
      askConfirmation: j.ask_confirmation === true,
    };
  } catch {
    return null;
  }
}

const CONFIRM_LINE = 'Should I file this report? Reply "yes" to confirm.';

export class WhatsAppConversationManager {
  constructor(
    private readonly store: ConversationStore = new SupabaseStore(),
    private readonly llm: ChatFn = defaultChat
  ) {}

  private async load(userId: string): Promise<ConversationState> {
    const stored = await this.store.load(userId);
    if (stored) return stored;
    return { userId, messages: [], awaitingConfirmation: false, conversationPhase: 'greeting', lastActivity: new Date() };
  }

  private push(c: ConversationState, role: 'user' | 'assistant', content: string): void {
    c.messages.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), timestamp: new Date().toISOString(), role, content });
    if (c.messages.length > MAX_STORED_MESSAGES) c.messages = c.messages.slice(-MAX_STORED_MESSAGES);
    c.lastActivity = new Date();
  }

  private promptMessages(c: ConversationState): ChatMessage[] {
    const cutoff = Date.now() - PROMPT_WINDOW_MS;
    const recent = c.messages.filter((m) => new Date(m.timestamp).getTime() >= cutoff).slice(-PROMPT_MESSAGES);
    const known = c.currentIncident
      ? `Already collected for the current report: type=${c.currentIncident.type}; location=${c.currentIncident.location ?? 'unknown'}${c.currentIncident.coordinates ? ' (user shared a location pin)' : ''}; details=${c.currentIncident.description}.`
      : 'No incident has been described yet.';
    const turns: ChatMessage[] = recent.map((m) => ({ role: m.role, content: m.content }));
    return [{ role: 'system', content: `${SYSTEM_PROMPT}\n\nSTATE\n${known}${recent.length <= 1 ? '\nThis is the very first message of the conversation.' : ''}` }, ...turns];
  }

  private applyTurn(c: ConversationState, turn: ModelTurn, userMessage: string): string {
    let reply = turn.reply;
    if (turn.incident) {
      const prev = c.currentIncident;
      const type = turn.incident.type || prev?.type || 'Other';
      const severity = Math.min(Math.max(Math.round(turn.incident.severity ?? prev?.severity ?? 3), 1), 5);
      const description = [prev?.description, userMessage].filter(Boolean).join(' ').slice(0, 1200);
      c.currentIncident = {
        type,
        severity,
        description,
        location: prev?.coordinates ? prev.location : turn.incident.location ?? prev?.location,
        coordinates: prev?.coordinates,
        timestamp: prev?.timestamp ?? new Date().toISOString(),
        confirmed: false,
      };
      if (c.conversationPhase === 'greeting' || c.conversationPhase === 'completed') c.conversationPhase = 'collecting';
    }

    const hasWhere = Boolean(c.currentIncident?.location || c.currentIncident?.coordinates);
    if (turn.askConfirmation && c.currentIncident && hasWhere) {
      c.awaitingConfirmation = true;
      c.conversationPhase = 'confirming';
      reply = `${reply.replace(/should i file this report\??\s*(reply\s+["“”']?yes["“”']?\s*(to confirm)?\.?)?/gi, '').replace(/\s{2,}/g, ' ').trim()} ${CONFIRM_LINE}`;
    } else {
      c.awaitingConfirmation = false;
      if (c.conversationPhase === 'confirming') c.conversationPhase = 'collecting';
    }
    return reply;
  }

  private async modelTurn(c: ConversationState, userMessage: string): Promise<string> {
    try {
      const text = await this.llm({ messages: this.promptMessages(c), json: true, maxTokens: 700, temperature: 0.5 });
      const turn = parseTurn(text);
      if (!turn) {
        debug('Model reply was not valid JSON; using it as plain text');
        return text.replace(/^\{[\s\S]*\}$/, '').trim() || FALLBACK_REPLY;
      }
      return this.applyTurn(c, turn, userMessage);
    } catch (err) {
      console.error('AI call failed:', err);
      return FALLBACK_REPLY;
    }
  }

  public async processMessage(
    userId: string,
    message: string,
    coordinates?: [number, number]
  ): Promise<{ response: string; incident?: IncidentReport }> {
    const c = await this.load(userId);
    const text = message.trim();
    debug(`Message from ${maskPhone(userId)} (${text.length} chars), phase ${c.conversationPhase}`);

    this.push(c, 'user', text);

    if (coordinates && c.currentIncident && !c.currentIncident.confirmed) {
      c.currentIncident.coordinates = coordinates;
      c.currentIncident.location = `${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}`;
      c.awaitingConfirmation = true;
      c.conversationPhase = 'confirming';
      const reply = `📍 Sawa, got your location. ${CONFIRM_LINE}`;
      this.push(c, 'assistant', reply);
      await this.store.save(c);
      return { response: reply };
    }

    if (c.awaitingConfirmation && c.currentIncident) {
      const short = text.length <= SHORT_REPLY_CHARS;
      if (short && YES_RE.test(text)) {
        c.currentIncident.confirmed = true;
        c.awaitingConfirmation = false;
        c.conversationPhase = 'completed';
        const reply = '✅ Report filed. Thank you for looking out for your neighbors. Stay safe!';
        this.push(c, 'assistant', reply);
        await this.store.save(c);
        return { response: reply, incident: c.currentIncident };
      }
      if (short && NO_RE.test(text)) {
        c.currentIncident = undefined;
        c.awaitingConfirmation = false;
        c.conversationPhase = 'greeting';
        const reply = 'Sawa, I have cancelled that. Anything else I can help with?';
        this.push(c, 'assistant', reply);
        await this.store.save(c);
        return { response: reply };
      }
    }

    const reply = await this.modelTurn(c, text);
    this.push(c, 'assistant', reply);
    await this.store.save(c);
    return { response: reply };
  }

  public async getConversationHistory(userId: string): Promise<string> {
    const c = await this.load(userId);
    return c.messages.map((m) => `${m.role}: ${m.content}`).join('\n');
  }

  public async clearIncident(userId: string): Promise<void> {
    const c = await this.load(userId);
    c.currentIncident = undefined;
    c.awaitingConfirmation = false;
    c.conversationPhase = 'greeting';
    c.lastStoredAt = new Date();
    await this.store.save(c);
  }

  public async clearConversation(userId: string): Promise<void> {
    await this.store.remove(userId);
  }
}

export const conversationManager = new WhatsAppConversationManager();
export default conversationManager;
