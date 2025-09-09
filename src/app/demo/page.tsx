'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function DemoPage() {
  const [manualResult, setManualResult] = useState<unknown>(null)
  const [whatsappResult, setWhatsappResult] = useState<unknown>(null)
  const [manualLoading, setManualLoading] = useState(false)
  const [whatsappLoading, setWhatsappLoading] = useState(false)

  const createManualIncident = async () => {
    setManualLoading(true)
    setManualResult(null)
    
    try {
      const response = await fetch('/api/manual-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      setManualResult(data)
      
    } catch (error) {
      setManualResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setManualLoading(false)
    }
  }

  const simulateWhatsAppConversation = async () => {
    setWhatsappLoading(true)
    setWhatsappResult(null)
    
    try {
      const response = await fetch('/api/simulate-whatsapp-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      setWhatsappResult(data)
      
    } catch (error) {
      setWhatsappResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setWhatsappLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-8 text-center">🚨 Jirani Safety System Demo</h1>
      
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Manual Test Section */}
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4 text-blue-800">🔧 Direct Incident Creation</h2>
          <p className="text-blue-700 mb-4">
            Test the incident storage and map display directly by creating an incident programmatically.
          </p>
          
          <button 
            onClick={createManualIncident}
            disabled={manualLoading}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-semibold w-full mb-4"
          >
            {manualLoading ? 'Creating...' : '🚨 Create Direct Incident'}
          </button>
          
          {manualResult && (
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold mb-2">Results:</h3>
              {(manualResult as any)?.success ? (
                <div className="text-green-700">
                  ✅ Incident created successfully!<br/>
                  <strong>ID:</strong> {(manualResult as any)?.event?.id}<br/>
                  <strong>Total Events:</strong> {(manualResult as any)?.totalEvents}
                </div>
              ) : (
                <div className="text-red-700">
                  ❌ Error: {(manualResult as any)?.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* WhatsApp Simulation Section */}
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4 text-green-800">📱 WhatsApp Conversation Simulation</h2>
          <p className="text-green-700 mb-4">
            Simulate a complete WhatsApp conversation including the confirmation step.
          </p>
          
          <button 
            onClick={simulateWhatsAppConversation}
            disabled={whatsappLoading}
            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 font-semibold w-full mb-4"
          >
            {whatsappLoading ? 'Simulating...' : '💬 Simulate WhatsApp Chat'}
          </button>
          
          {whatsappResult && (
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold mb-2">Results:</h3>
              {(whatsappResult as any)?.success ? (
                <div className="text-green-700">
                  ✅ Conversation completed!<br/>
                  <strong>Final Events:</strong> {(whatsappResult as any)?.totalEvents}<br/>
                  <strong>Steps:</strong> {(whatsappResult as any)?.conversation?.length}
                </div>
              ) : (
                <div className="text-red-700">
                  ❌ Error: {(whatsappResult as any)?.error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-center gap-4 mb-8">
        <Link 
          href="/"
          className="bg-purple-500 text-white px-8 py-4 rounded-lg hover:bg-purple-600 font-semibold text-lg"
        >
          🗺️ View Map with Incidents
        </Link>
        
        <Link 
          href="/test-whatsapp"
          className="bg-orange-500 text-white px-8 py-4 rounded-lg hover:bg-orange-600 font-semibold text-lg"
        >
          📱 Manual WhatsApp Test
        </Link>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
        <h3 className="text-xl font-semibold text-yellow-800 mb-4">📝 How to Test the Complete System</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-yellow-700">
          <div>
            <h4 className="font-semibold mb-2">🔧 Direct Method:</h4>
            <ol className="space-y-1">
              <li>1. Click &quot;Create Direct Incident&quot;</li>
              <li>2. Click &quot;View Map with Incidents&quot;</li>
              <li>3. Look for a red marker at Westlands</li>
              <li>4. Click the marker to see details</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold mb-2">📱 WhatsApp Method:</h4>
            <ol className="space-y-1">
              <li>1. Click &quot;Simulate WhatsApp Chat&quot;</li>
              <li>2. This sends a crime report + confirmation</li>
              <li>3. Click &quot;View Map with Incidents&quot;</li>
              <li>4. Look for the WhatsApp-reported incident</li>
            </ol>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-yellow-100 rounded">
          <h4 className="font-semibold text-yellow-800 mb-2">🎯 Expected Results:</h4>
          <p className="text-yellow-700 text-sm">
            After running either test, you should see incident markers appear on the map within 15 seconds. 
            The map polls for new data automatically, so incidents should appear without refreshing the page.
            Each marker shows incident type, location, and severity with color coding.
          </p>
        </div>
      </div>

      {/* Debug Info */}
      {(manualResult || whatsappResult) && (
        <div className="mt-8">
          <details className="bg-gray-50 p-4 rounded-lg">
            <summary className="font-semibold cursor-pointer">🔍 Debug Information</summary>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {manualResult && (
                <div>
                  <h4 className="font-semibold mb-2">Direct Test Results:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(manualResult, null, 2)}
                  </pre>
                </div>
              )}
              {whatsappResult && (
                <div>
                  <h4 className="font-semibold mb-2">WhatsApp Test Results:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(whatsappResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
