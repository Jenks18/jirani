export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const DEFAULT_MODEL = 'openai/gpt-oss-120b';

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

export const chat: ChatFn = async ({ messages, json = false, maxTokens = 600, temperature = 0.5, timeoutMs = 20_000 }) => {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new LlmError('GROQ_API_KEY is not configured');
  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_completion_tokens: maxTokens,
      ...(model.includes('gpt-oss') ? { reasoning_effort: 'low' } : {}),
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new LlmError(`Model call failed (${res.status}): ${detail.slice(0, 200)}`, res.status);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new LlmError('Model returned no text');
  return text;
};
