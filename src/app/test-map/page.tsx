'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Event {
  id: string;
  type: string;
  location: string;
  severity: number;
  coordinates: [number, number] | null;
  description: string;
  createdAt: string;
  from: string;
}

interface TestMapResult {
  events: Event[];
  success?: boolean;
  error?: string;
  event?: Event;
  totalEvents?: number;
}

export default function CreateTestIncident() {
  const [result, setResult] = useState<TestMapResult | null>(null)
  const [loading, setLoading] = useState(false)

  const createIncident = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      // Create the test incident
      const response = await fetch('/api/manual-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      console.log('Manual test response:', data)
      
      setResult(data)
      
    } catch (error) {
      console.error('Test failed:', error)
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const checkEvents = async () => {
    try {
      const response = await fetch('/api/manual-test')
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Check failed:', error)
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🗺️ Test Map Integration</h1>
      
      <div className="flex gap-4 mb-6">
        <button 
          onClick={createIncident}
          disabled={loading}
          className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 disabled:opacity-50 font-semibold"
        >
          {loading ? 'Creating...' : '🚨 Create Test Incident'}
        </button>
        
        <button 
          onClick={checkEvents}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 font-semibold"
        >
          📊 Check Current Events
        </button>
        
        <Link 
          href="/"
          className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 font-semibold"
        >
          🗺️ View Map
        </Link>
      </div>
      
      {result && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">📋 Results:</h2>
          
          {(result as any)?.success && (result as any)?.event && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ Event Created Successfully!</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>ID:</strong> {(result as any).event.id}</div>
                <div><strong>Type:</strong> {(result as any).event.type}</div>
                <div><strong>Location:</strong> {(result as any).event.location}</div>
                <div><strong>Severity:</strong> {(result as any).event.severity}</div>
                <div><strong>Coordinates:</strong> {(result as any).event.coordinates ? `[${(result as any).event.coordinates[0]}, ${(result as any).event.coordinates[1]}]` : 'None'}</div>
                <div><strong>From:</strong> {(result as any).event.from}</div>
              </div>
              <div className="mt-2"><strong>Description:</strong> {(result as any).event.description}</div>
            </div>
          )}
          
          {(result as any)?.totalEvents !== undefined && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
              <h3 className="font-semibold text-blue-800 mb-2">📊 Total Events in Storage: {(result as any).totalEvents}</h3>
            </div>
          )}
          
          {(result as any)?.events && (result as any).events.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">📋 All Events:</h3>
              <div className="space-y-3">
                {(result as any).events.map((event: any, index: number) => (
                  <div key={index} className="border border-gray-300 p-3 rounded bg-white">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><strong>ID:</strong> {event.id}</div>
                      <div><strong>Type:</strong> {event.type}</div>
                      <div><strong>Location:</strong> {event.location}</div>
                      <div><strong>Severity:</strong> {event.severity}</div>
                      <div><strong>Coordinates:</strong> {event.coordinates ? `[${event.coordinates[0]}, ${event.coordinates[1]}]` : 'None'}</div>
                      <div><strong>Created:</strong> {new Date(event.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="mt-2 text-sm"><strong>Description:</strong> {event.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {(result as any)?.error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <h3 className="font-semibold text-red-800">❌ Error:</h3>
              <p className="text-red-700">{(result as any).error}</p>
            </div>
          )}
          
          <div className="mt-4">
            <details className="bg-gray-50 p-4 rounded-lg">
              <summary className="font-semibold cursor-pointer">🔍 Raw Response Data</summary>
              <pre className="bg-gray-100 p-4 rounded mt-2 text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">📝 Instructions:</h3>
        <ol className="text-yellow-700 text-sm space-y-1">
          <li>1. Click &quot;Create Test Incident&quot; to add a phone theft at Westlands</li>
          <li>2. Click &quot;View Map&quot; to see if the incident appears as a marker</li>
          <li>3. The map should auto-update and show the new incident within 15 seconds</li>
          <li>4. Click on the marker to see incident details</li>
        </ol>
      </div>
    </div>
  )
}
