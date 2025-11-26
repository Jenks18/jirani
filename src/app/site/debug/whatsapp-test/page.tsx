"use client";
import { useState } from 'react';

export default function WhatsAppTestPage() {
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('I was robbed near the mall');
  const [send, setSend] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function runTest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message, send }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>WhatsApp Test</h2>
      <p>Use this form to call the `/api/whatsapp/test` route on this deployment.</p>
      <form onSubmit={runTest} style={{ display: 'grid', gap: 8, maxWidth: 600 }}>
        <label>
          To (E.164):<br />
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="+2547..." style={{ width: '100%' }} />
        </label>
        <label>
          Message:<br />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} style={{ width: '100%' }} />
        </label>
        <label>
          <input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} /> Attempt Twilio send
        </label>
        <div>
          <button type="submit" disabled={loading || !to} style={{ marginRight: 8 }}>
            {loading ? 'Running…' : 'Run Test'}
          </button>
        </div>
      </form>

      <section style={{ marginTop: 20 }}>
        <h3>Result</h3>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f6f6f6', padding: 12 }}>{JSON.stringify(result, null, 2)}</pre>
      </section>
    </div>
  );
}
