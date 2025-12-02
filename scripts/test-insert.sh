#!/bin/bash
# Test inserting directly into reports table

echo "🧪 Testing direct insert into reports table..."

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"

# Insert test report with POINT coordinates
curl -X POST "${SUPABASE_URL}/rest/v1/reports" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "type": "Test",
    "severity": 2,
    "summary": "Test report from script",
    "location": "Westlands",
    "coordinates": "POINT(36.8084 -1.2675)",
    "from_phone": "+254700000000",
    "source": "test"
  }' | python3 -m json.tool

echo ""
echo "✅ Test insert completed"
