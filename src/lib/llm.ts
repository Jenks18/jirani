export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export class LlmError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

export interface ChatOptions {
  messages: ChatMessage[];
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export type ChatFn = (opts: ChatOptions) => Promise<string>;

type Provider = 'groq' | 'gemini';
type Resolved = Required<Omit<ChatOptions, 'json'>> & { json: boolean };

interface Engine {
  id: string;
  provider: Provider;
  model: string;
  key?: string;
}

export const DEFAULT_GROQ_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
export const DEFAULT_GEMINI_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
const OVERALL_BUDGET_MS = 24_000;
const GEMINI_TIMEOUT_MS = 12_000;
const RATE_LIMIT_COOLDOWN_MS = 60_000;

const coolingUntil = new Map<string, number>();

const list = (raw: string | undefined, fallback: string[]) => {
  const items = (raw || '').split(',').map((s) => s.trim()).filter(Boolean);
  return items.length ? items : fallback;
};

function geminiKeys(): string[] {
  return [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3, process.env.GEMINI_API_KEY_4].filter(
    (k): k is string => Boolean(k && k.trim())
  );
}

function engines(): Engine[] {
  const order = list(process.env.AI_PROVIDER_ORDER, ['gemini', 'groq']).map((p) => p.toLowerCase());
  const out: Engine[] = [];
  for (const p of order) {
    if (p === 'gemini') {
      const models = list(process.env.GEMINI_MODELS || process.env.GEMINI_MODEL, DEFAULT_GEMINI_MODELS);
      geminiKeys().forEach((key, k) => {
        for (const model of models) out.push({ id: `gemini#${k + 1}:${model}`, provider: 'gemini', model, key });
      });
    }
    if (p === 'groq' && process.env.GROQ_API_KEY) {
      for (const model of list(process.env.GROQ_MODELS || process.env.GROQ_MODEL, DEFAULT_GROQ_MODELS)) out.push({ id: `groq:${model}`, provider: 'groq', model });
    }
  }
  return out;
}

function cooldownFor(err: unknown): number {
  const status = err instanceof LlmError ? err.status : undefined;
  if (status === 429) return RATE_LIMIT_COOLDOWN_MS;
  if (status === 404 || status === 400 || status === 401 || status === 403) return 10 * 60_000;
  return 30_000;
}

async function callGroq(model: string, o: Resolved): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    signal: AbortSignal.timeout(o.timeoutMs),
    body: JSON.stringify({
      model,
      messages: o.messages,
      temperature: o.temperature,
      max_completion_tokens: o.maxTokens,
      ...(model.includes('gpt-oss') ? { reasoning_effort: 'low' } : {}),
      ...(o.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) throw new LlmError(`groq ${model} ${res.status}: ${(await res.text().catch(() => '')).slice(0, 120)}`, res.status);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new LlmError(`groq ${model} returned no text`);
  return text;
}

function geminiThinking(model: string): Record<string, unknown> {
  if (/latest|gemini-3/.test(model) && !/lite/.test(model)) return { thinkingConfig: { thinkingLevel: 'low' } };
  if (model.includes('2.5-flash') && !model.includes('lite')) return { thinkingConfig: { thinkingBudget: 0 } };
  return {};
}

async function callGemini(model: string, key: string, o: Resolved): Promise<string> {
  const system = o.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const contents = o.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  if (!contents.length || contents[0].role !== 'user') contents.unshift({ role: 'user', parts: [{ text: '(start of conversation)' }] });

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    signal: AbortSignal.timeout(o.timeoutMs),
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      generationConfig: {
        temperature: o.temperature,
        maxOutputTokens: o.maxTokens,
        ...(o.json ? { responseMimeType: 'application/json' } : {}),
        ...geminiThinking(model),
      },
    }),
  });
  if (!res.ok) throw new LlmError(`gemini ${model} ${res.status}: ${(await res.text().catch(() => '')).replace(/AIza[\w-]+/g, '[key]').slice(0, 120)}`, res.status);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!text) throw new LlmError(`gemini ${model} returned no text`);
  return text;
}

export const lastProvider = { name: '' as string };

export const chat: ChatFn = async (opts) => {
  const base: Resolved = { json: false, maxTokens: 700, temperature: 0.5, timeoutMs: 20_000, ...opts };
  const all = engines();
  const started = Date.now();
  const ready = all.filter((e) => (coolingUntil.get(e.id) ?? 0) <= started);
  const errors: string[] = [];
  for (const e of ready.length ? ready : all) {
    const remaining = OVERALL_BUDGET_MS - (Date.now() - started);
    if (remaining < 2_000) {
      errors.push('time budget exhausted');
      break;
    }
    const timeoutMs = Math.min(base.timeoutMs, e.provider === 'gemini' ? GEMINI_TIMEOUT_MS : base.timeoutMs, remaining);
    try {
      const o = { ...base, timeoutMs };
      const text = await (e.provider === 'groq' ? callGroq(e.model, o) : callGemini(e.model, e.key as string, o));
      lastProvider.name = e.id;
      coolingUntil.delete(e.id);
      return text;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
      coolingUntil.set(e.id, Date.now() + cooldownFor(err));
    }
  }
  throw new LlmError(errors.length ? errors.join(' | ') : 'No AI provider is configured (set GEMINI_API_KEY or GROQ_API_KEY)');
};
