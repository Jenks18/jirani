import fs from 'fs';

// Select LLM provider via env or query ("ollama", "openai", etc.)
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'ollama';
const RULES_PATH = process.env.RULES_PATH || './rules/agent.txt';

async function callOllamaLLM(prompt, rules) {
  // Example: POST to local Ollama API
  const response = await fetch(process.env.OLLAMA_URL || 'http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: `${rules}\n${prompt}` })
  });
  return response.json();
}

async function callOpenAILLM(prompt, rules) {
  // Example: POST to OpenAI API
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: rules },
        { role: 'user', content: prompt }
      ]
    })
  });
  return response.json();
}

export default async function handler(req, res) {
  const { prompt, provider } = req.body;
  let rules = '';
  try {
    rules = fs.readFileSync(RULES_PATH, 'utf8');
  } catch (e) {
    rules = 'You are a helpful reporting assistant.';
  }

  let llm = provider || LLM_PROVIDER;
  let result;
  try {
    if (llm === 'ollama') {
      result = await callOllamaLLM(prompt, rules);
    } else if (llm === 'openai') {
      result = await callOpenAILLM(prompt, rules);
    } else {
      throw new Error('Unsupported LLM provider');
    }
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
