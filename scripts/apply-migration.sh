#!/bin/bash
# Apply migration to clean database and create reports table

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ Error: Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

# Extract project ref from URL (e.g., kaziyangu from https://kaziyangu.supabase.co)
PROJECT_REF=$(echo "$SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co|\1|')

echo "🗄️  Applying migration to clean database..."
echo "Project: $PROJECT_REF"

# Read the migration SQL
MIGRATION_SQL=$(cat supabase/migrations/20251201000000_create_reports_table.sql)

# Execute via REST API
curl -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$MIGRATION_SQL" | jq -Rs .)}"

echo ""
echo "✅ Migration applied - database cleaned and reports table created"
