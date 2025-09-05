'use client';

import { useState } from 'react';

export default function TestAPIPage() {
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('');
  const [provider, setProvider] = useState('gemini');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [testType, setTestType] = useState('llm'); // 'llm' or 'message'

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

  const testMessage = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: message,
          location: location
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
            Location (optional):
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Westlands, Nairobi, Kisumu..."
            className="w-full p-3 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Test Type:
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="llm"
                checked={testType === 'llm'}
                onChange={(e) => setTestType(e.target.value)}
                className="mr-2"
              />
              LLM Only
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="message"
                checked={testType === 'message'}
                onChange={(e) => setTestType(e.target.value)}
                className="mr-2"
              />
              Full Message Flow
            </label>
          </div>
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
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="ollama">Ollama (Local)</option>
          </select>
        </div>

        <div className="flex gap-4">
          {testType === 'llm' && (
            <button
              onClick={testLLM}
              disabled={loading || !message}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test LLM Only'}
            </button>
          )}
          
          {testType === 'message' && (
            <button
              onClick={testMessage}
              disabled={loading || !message}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Full Message Flow'}
            </button>
          )}
          
          <button
            onClick={simulateWhatsApp}
            disabled={loading || !message}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Simulate WhatsApp'}
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
              onClick={() => {
                setMessage("Someone stole my phone at the bus stop around 3 PM today");
                setLocation("Westlands");
              }}
              className="block text-left text-blue-600 hover:underline"
            >
              &quot;Someone stole my phone at the bus stop around 3 PM today&quot; in Westlands
            </button>
            <button 
              onClick={() => {
                setMessage("I witnessed a car accident near the roundabout");
                setLocation("Uhuru Highway");
              }}
              className="block text-left text-blue-600 hover:underline"
            >
              &quot;I witnessed a car accident near the roundabout&quot; on Uhuru Highway
            </button>
            <button 
              onClick={() => {
                setMessage("There was a house break-in yesterday night");
                setLocation("Karen");
              }}
              className="block text-left text-blue-600 hover:underline"
            >
              &quot;There was a house break-in yesterday night&quot; in Karen
            </button>
            <button 
              onClick={() => {
                setMessage("Hello, how are you doing today?");
                setLocation("");
              }}
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
