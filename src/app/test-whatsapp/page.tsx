'use client'

import { useState } from 'react'

interface Event {
  type: string;
  location: string;
  description: string;
  coordinates: [number, number] | null;
  from: string;
  createdAt: string;
}

interface TestResult {
  currentEvents: Event[];
  eventsCount: number;
  success?: boolean;
  error?: string;
  whatsappResponse?: unknown;
  reportsData?: unknown;
}

export default function TestWhatsAppPage() {
  const [result, setResult] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(false)

  const testWhatsApp = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      // Test direct WhatsApp endpoint
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entry: [{
            changes: [{
              value: {
                messages: [{
                  from: '+254712345678',
                  text: {
                    body: 'My phone was stolen at 3pm today near Westlands Shopping Mall. A guy on a motorbike grabbed it and rode off towards Sarit Centre. He was wearing a red shirt.'
                  }
                }]
              }
            }]
          }]
        })
      })
      
      const data = await response.json()
      console.log('WhatsApp response:', data)
      
      // Check current events
      const eventsResponse = await fetch('/api/reports')
      const eventsData = await eventsResponse.json()
      
      setResult({
        whatsappResponse: data,
        currentEvents: eventsData.events || [],
        eventsCount: eventsData.events?.length || 0,
        reportsData: eventsData
      })
      
    } catch (error) {
      console.error('Test failed:', error)
      setResult({ 
        currentEvents: [], 
        eventsCount: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test WhatsApp Integration</h1>
      
      <button 
        onClick={testWhatsApp}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Simulate WhatsApp Crime Report'}
      </button>
      
      {result && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Test Results:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
          
          {result.currentEvents && result.currentEvents.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-green-600">✅ Events Found ({result.eventsCount}):</h3>
              {result.currentEvents.map((event: Event, index: number) => (
                <div key={index} className="border p-3 mt-2 rounded">
                  <div><strong>Type:</strong> {event.type}</div>
                  <div><strong>Location:</strong> {event.location}</div>
                  <div><strong>Description:</strong> {event.description}</div>
                  <div><strong>Coordinates:</strong> {event.coordinates ? `[${event.coordinates[0]}, ${event.coordinates[1]}]` : 'None'}</div>
                  <div><strong>From:</strong> {event.from}</div>
                  <div><strong>Created:</strong> {event.createdAt}</div>
                </div>
              ))}
            </div>
          )}
          
          {(!result.currentEvents || result.currentEvents.length === 0) && !result.error && (
            <div className="mt-4 text-red-600">
              <h3>❌ No events found - something might be wrong with the flow</h3>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
