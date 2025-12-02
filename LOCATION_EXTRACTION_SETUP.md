# Location Extraction & Geocoding Setup

## Overview
The system now intelligently extracts locations from WhatsApp messages using AI and converts them to map coordinates using Mapbox Geocoding API.

## How It Works

### 1. AI-Powered Location Extraction
When a user reports an incident via WhatsApp (e.g., "I was robbed at CBD near Archives"), the system:

1. **Groq AI Extraction**: Uses Groq's `llama-3.3-70b-versatile` model to intelligently extract the location
   - Prompt: "Extract ONLY the location from the user message"
   - Example: "6 Am at cbd near archives" → extracts "CBD near Archives"

2. **Fallback Regex**: If AI fails, uses regex patterns to find location keywords
   - Matches: `near`, `at`, `in`, `on`, `by`, `around`, `outside` + location name

### 2. Mapbox Geocoding
Once location is extracted, it's converted to coordinates:

1. **Cache Lookup**: First checks hardcoded Kenya locations (fast)
2. **Mapbox API**: If not cached, queries Mapbox Geocoding API
   - Endpoint: `https://api.mapbox.com/geocoding/v5/mapbox.places/{location}, Kenya.json`
   - Returns: `[longitude, latitude]`
   - Country filter: `country=ke` (Kenya only)
3. **Cache Storage**: Saves geocoded result for future lookups
4. **Fallback**: Defaults to Nairobi CBD if geocoding fails

### 3. Database Storage
Coordinates are saved to Supabase `events` table:
- `longitude`: decimal
- `latitude`: decimal
- Enables map display of incidents

## Environment Configuration

### Required Environment Variable
Add to Vercel (already exists for maps):
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieWF6enlqZW5rcyIsImEiOiJjbWU2b2o0eXkxNDFmMm1vbGY3dWt5aXViIn0.8hEu3t-bv3R3kGsBb_PIcw
```

### Vercel Setup
1. Go to https://vercel.com/your-project/settings/environment-variables
2. Add `NEXT_PUBLIC_MAPBOX_TOKEN` with the value above
3. Redeploy: `vercel --prod`

### Local Development
Add to `.env.local`:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieWF6enlqZW5rcyIsImEiOiJjbWU2b2o0eXkxNDFmMm1vbGY3dWt5aXViIn0.8hEu3t-bv3R3kGsBb_PIcw
```

## API Usage Limits

### Mapbox Geocoding
- **Free Tier**: 100,000 requests/month
- **Current Usage**: ~2-5 requests per incident report
- **Expected Load**: ~10-50 reports/day = 300-1,500 requests/month
- **Cost**: FREE (well within limits)

### Groq AI (Location Extraction)
- **Cost per extraction**: ~$0.00001 (50 tokens @ $0.00002/1K tokens)
- **Estimated monthly**: $0.30 for 1,000 reports

## Testing

### Test Location Extraction
```bash
npx tsx test-location-extraction.ts
```

### Test Cases
- "CBD near Archives" → should geocode to Nairobi CBD area
- "Westlands Mall" → should geocode to Westlands
- "Kikuyu Road" → should geocode to Kikuyu
- "near Uhuru Park" → should geocode to Uhuru Park

### Expected Output
```
📍 Testing: "CBD near Archives"
🗺️  Geocoding: "CBD near Archives"
✅ Geocoded to: [36.8219, -1.2884] - CBD, Nairobi, Kenya
```

## Troubleshooting

### Coordinates showing as null
1. Check `NEXT_PUBLIC_MAPBOX_TOKEN` is set in Vercel
2. Check logs for geocoding errors: `vercel logs --production`
3. Verify location extraction: Should see `🎯 AI extracted location: "..."` in logs

### Geocoding fails
- **Symptom**: Events save with null coordinates
- **Cause**: Mapbox token not configured or API limit reached
- **Fix**: Add environment variable and redeploy

### Location not extracted
- **Symptom**: Location shows as "Unknown location"
- **Cause**: Message doesn't contain location keywords
- **Fix**: Prompt user to include location in their report

## Files Modified
1. `src/lib/locationUtils.ts`: Added `geocodeLocation()` and async `extractCoordinates()`
2. `src/lib/whatsappConversation.ts`: Added `extractLocationWithAI()` and `fallbackLocationExtraction()`
3. `src/lib/eventStorage.ts`: Auto-geocodes locations before saving to database

## Cost Analysis
| Service | Usage | Cost/Month |
|---------|-------|------------|
| Mapbox Geocoding | 1,500 requests | $0 (free tier) |
| Groq Location Extraction | 1,000 reports | $0.30 |
| **Total** | | **$0.30/month** |

## Next Steps
1. ✅ Deploy to production
2. ✅ Test with real WhatsApp messages
3. 🔄 Monitor geocoding accuracy
4. 🔄 Add more hardcoded locations for common areas (improves speed)

