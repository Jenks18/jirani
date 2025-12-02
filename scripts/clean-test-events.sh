#!/bin/bash
# Clean up test events with null coordinates from Supabase

echo "🧹 Cleaning up test events from Supabase..."

# Get Supabase credentials from environment
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "❌ Error: Supabase credentials not found in environment"
  echo "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
  exit 1
fi

# Delete events with null coordinates
curl -X DELETE \
  "${SUPABASE_URL}/rest/v1/events?longitude=is.null&latitude=is.null" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Prefer: return=minimal"

echo ""
echo "✅ Deleted test events with null coordinates"
echo ""
echo "📊 Current events:"
curl -s "${SUPABASE_URL}/rest/v1/events?select=id,type,location,longitude,latitude&order=created_at.desc&limit=5" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" | python3 -m json.tool
