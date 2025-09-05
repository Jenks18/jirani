import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// LLM provider configurations
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'gemini';
const RULES_PATH = path.join(process.cwd(), 'rules', 'agent.txt');

// Default rules if file doesn't exist
const DEFAULT_RULES = `You are a helpful safety reporting assistant for Kenya. 
Your job is to analyze user messages and determine if they contain information about safety incidents, crimes, or emergencies.

If the message contains enough information to create a safety report, respond with a JSON object containing:
{
  "event": {
    "type": "Crime Type (e.g., Theft, Violence, Emergency)",
    "severity": 1-5,
    "location": "Location mentioned",
    "description": "Brief description of the incident",
    "timestamp": "When it happened (if mentioned)",
    "coordinates": null
  },
  "reply": "Thank you for the report. We have recorded this incident."
}

If the message doesn't contain enough information for a report, ask clarifying questions to help gather more details.
Always respond in a helpful and empathetic manner.`;

async function callOpenAILLM(prompt: string, rules: string) {
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
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response from OpenAI';
}

async function callGeminiLLM(prompt: string, rules: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${rules}\n\nUser message: ${prompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || 'No response from Gemini';
}

async function callOllamaLLM(prompt: string, rules: string) {
  const response = await fetch(process.env.OLLAMA_URL || 'http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      model: 'llama2',
      prompt: `${rules}\n\nUser: ${prompt}`,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.response || 'No response from Ollama';
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, provider } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Load rules from file or use default
    let rules = DEFAULT_RULES;
    try {
      rules = await fs.readFile(RULES_PATH, 'utf8');
    } catch (error) {
      // File doesn't exist or is empty, start with empty array
      console.log('Using default rules - agent.txt not found:', error);
    }

    const selectedProvider = provider || LLM_PROVIDER;
    console.log(`Processing with ${selectedProvider}: ${prompt.substring(0, 100)}...`);

    let result: string;

    switch (selectedProvider.toLowerCase()) {
      case 'openai':
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OpenAI API key not configured');
        }
        result = await callOpenAILLM(prompt, rules);
        break;

      case 'gemini':
        if (!process.env.GOOGLE_API_KEY) {
          throw new Error('Google API key not configured');
        }
        result = await callGeminiLLM(prompt, rules);
        break;

      case 'ollama':
        result = await callOllamaLLM(prompt, rules);
        break;

      default:
        throw new Error(`Unsupported LLM provider: ${selectedProvider}`);
    }

    // Try to parse JSON response from LLM
    let parsedResult;
    try {
      parsedResult = JSON.parse(result);
    } catch (error) {
      // If not JSON, check if it's a JSON string that needs cleaning
      console.log('Could not parse LLM response as JSON:', error);
      
      // Clean up the result - handle markdown code blocks and extra whitespace
      let cleanedResult = result.trim();
      
      // Remove markdown code block formatting if present
      if (cleanedResult.startsWith('```json')) {
        cleanedResult = cleanedResult.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResult.startsWith('```')) {
        cleanedResult = cleanedResult.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Remove JSON comments (// comments)
      cleanedResult = cleanedResult.replace(/\/\/.*$/gm, '');
      
      // Remove multi-line comments (/* comments */)
      cleanedResult = cleanedResult.replace(/\/\*[\s\S]*?\*\//g, '');
      
      // Clean up extra whitespace and trailing commas
      cleanedResult = cleanedResult.replace(/,(\s*[}\]])/g, '$1');
      
      // Trim again after removing comments
      cleanedResult = cleanedResult.trim();
      
      // Try to parse the cleaned version
      if (cleanedResult.startsWith('{') && cleanedResult.endsWith('}')) {
        try {
          parsedResult = JSON.parse(cleanedResult);
          console.log('Successfully parsed JSON after cleaning markdown formatting and comments');
        } catch (secondError) {
          // Still not JSON, treat as plain text
          console.log('JSON parsing failed even after cleanup:', secondError);
          parsedResult = { reply: cleanedResult };
        }
      } else {
        // Definitely not JSON, treat as plain text
        parsedResult = { reply: cleanedResult };
      }
    }

    console.log(`${selectedProvider} response:`, parsedResult);

    return NextResponse.json({ 
      success: true,
      result: parsedResult,
      provider: selectedProvider 
    });

  } catch (error) {
    console.error('LLM processing error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Allow GET for testing
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const testPrompt = searchParams.get('test') || 'Hello, this is a test message';
  
  return NextResponse.json({
    message: 'LLM API is working',
    availableProviders: ['openai', 'gemini', 'ollama'],
    currentProvider: LLM_PROVIDER,
    testPrompt
  });
}
