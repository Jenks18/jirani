'use client';

import { useState } from 'react';

export default function TestLLM() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testLLM = async () => {
    setLoading(true);
    setResult('Testing...');
    
    try {
      const response = await fetch('/api/process-llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: 'Someone was shot in Nairobi',
          provider: 'gemini'
        })
      });
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Testing LLM Processing</h1>
      <button onClick={testLLM} disabled={loading}>
        {loading ? 'Testing...' : 'Test Process LLM'}
      </button>
      <pre style={{ marginTop: '20px', whiteSpace: 'pre-wrap' }}>
        {result}
      </pre>
    </div>
  );
}
