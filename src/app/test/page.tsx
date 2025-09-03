'use client';

import { useState } from 'react';

export default function TestAPIPage() {
  const [message, setMessage] = useState('');
  const [provider, setProvider] = useState('openai');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const testLLM = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/process-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: message,
          provider: provider
        })
      });
      
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const simulateWhatsApp = async () => {
    setLoading(true);
    try {
      const mockWhatsAppPayload = {
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '254712345678',
                text: { body: message },
                timestamp: Date.now().toString()
              }]
            }
          }]
        }]
      };

      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockWhatsAppPayload)
      });
      
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Jirani Safety API Testing</h1>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Test Message:
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter a safety report message to test..."
            className="w-full p-3 border border-gray-300 rounded-md h-24"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            LLM Provider:
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="p-2 border border-gray-300 rounded-md"
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Google Gemini</option>
            <option value="ollama">Ollama (Local)</option>
          </select>
        </div>

        <div className="flex gap-4">
          <button
            onClick={testLLM}
            disabled={loading || !message}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test LLM Only'}
          </button>
          
          <button
            onClick={simulateWhatsApp}
            disabled={loading || !message}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Simulate WhatsApp Message'}
          </button>
        </div>

        {response && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Response:</h3>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
              {response}
            </pre>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="font-semibold mb-2">API Configuration:</h3>
          <p className="text-sm">
            Make sure to set your API keys in <code>.env.local</code>:
          </p>
          <ul className="text-sm mt-2 list-disc list-inside">
            <li><code>OPENAI_API_KEY</code> - For OpenAI GPT models</li>
            <li><code>GOOGLE_API_KEY</code> - For Google Gemini</li>
            <li><code>LLM_PROVIDER</code> - Set to &apos;openai&apos;, &apos;gemini&apos;, or &apos;ollama&apos;</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-semibold mb-2">Sample Test Messages:</h3>
          <div className="space-y-2 text-sm">
            <button 
              onClick={() => setMessage("Someone stole my phone at the bus stop in Westlands around 3 PM today")}
              className="block text-left text-blue-600 hover:underline"
            >
              &quot;Someone stole my phone at the bus stop in Westlands around 3 PM today&quot;
            </button>
            <button 
              onClick={() => setMessage("I witnessed a car accident on Uhuru Highway near the roundabout")}
              className="block text-left text-blue-600 hover:underline"
            >
              &quot;I witnessed a car accident on Uhuru Highway near the roundabout&quot;
            </button>
            <button 
              onClick={() => setMessage("Hello, how are you doing today?")}
              className="block text-left text-blue-600 hover:underline"
            >
              &quot;Hello, how are you doing today?&quot; (non-safety message)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
