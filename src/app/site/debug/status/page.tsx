"use client";
import { useEffect, useState } from 'react';

export default function StatusPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setStatus({ error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStatus(); }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Runtime Status</h2>
      <p>This page calls `/api/status` and displays the response. If your status endpoint requires an admin token, the response will be limited unless you're authenticated.</p>
      <button onClick={fetchStatus} disabled={loading} style={{ marginBottom: 12 }}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      <pre style={{ whiteSpace: 'pre-wrap', background: '#f6f6f6', padding: 12 }}>{JSON.stringify(status, null, 2)}</pre>
    </div>
  );
}
