# 🚀 Quick Deployment Guide - Location Extraction Feature

## ✅ Changes Made
1. **AI-Powered Location Extraction**: Uses Groq AI to extract location from WhatsApp messages
2. **Mapbox Geocoding**: Converts location names to coordinates automatically
3. **Database Integration**: Auto-saves coordinates to Supabase events table

## 📋 Deployment Checklist

### 1. Verify Environment Variables in Vercel
Go to: https://vercel.com/[your-team]/[project-name]/settings/environment-variables

Ensure these variables exist:
- ✅ `GROQ_API_KEY` (already exists)
- ✅ `TWILIO_ACCOUNT_SID` (already exists)
- ✅ `TWILIO_AUTH_TOKEN` (already exists)
- ✅ `TWILIO_WHATSAPP_NUMBER` (already exists)
- ✅ `NEXT_PUBLIC_SUPABASE_URL` (already exists)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (already exists)
- ⚠️ **`NEXT_PUBLIC_MAPBOX_TOKEN`** - ADD THIS IF MISSING

### 2. Add Mapbox Token (if not already present)
**Value**: `pk.eyJ1IjoieWF6enlqZW5rcyIsImEiOiJjbWU2b2o0eXkxNDFmMm1vbGY3dWt5aXViIn0.8hEu3t-bv3R3kGsBb_PIcw`

**Scope**: Production, Preview, Development (all three)

**Steps**:
1. Click "Add Environment Variable"
2. Name: `NEXT_PUBLIC_MAPBOX_TOKEN`
3. Value: (paste token above)
4. Select all environments: Production ✓ Preview ✓ Development ✓
5. Click "Save"

### 3. Deploy to Production
The changes are already pushed to branch `fix/supabase-twilio-fallback`.

**Option A: Auto-Deploy (if configured)**
- Vercel will auto-deploy from GitHub push
- Check: https://vercel.com/[your-team]/[project-name]/deployments

**Option B: Manual Deploy**
```bash
vercel --prod
```

### 4. Test the Feature

#### Test 1: Send WhatsApp Message
Send to your Twilio WhatsApp number:
```
I was robbed at CBD near Archives this morning
```

Expected behavior:
- ✅ AI extracts: "CBD near Archives"
- ✅ Geocodes to: [36.8219, -1.2884]
- ✅ Saves to database with coordinates
- ✅ Appears on map with pin

#### Test 2: Check Logs
```bash
vercel logs --production --follow
```

Look for:
```
🎯 AI extracted location: "CBD near Archives"
🗺️  Geocoding: "CBD near Archives"
✅ Geocoded to: [36.8219, -1.2884] - CBD, Nairobi, Kenya
```

#### Test 3: Verify on Map
1. Go to https://maps.majiraniwetu.org
2. Check if new incident shows on map
3. Verify pin is in correct location

### 5. Monitor for Issues

#### Check Geocoding Success Rate
```bash
vercel logs --production | grep "Geocoded to"
```

#### Check for Errors
```bash
vercel logs --production | grep "❌"
```

Common errors:
- `❌ MAPBOX_TOKEN not configured` → Add environment variable
- `❌ Groq location extraction failed` → Check GROQ_API_KEY
- `⚠️ No geocoding results` → Location too vague or not in Kenya

## 🔍 Troubleshooting

### Coordinates still showing as null
1. **Check environment variable**: `NEXT_PUBLIC_MAPBOX_TOKEN` must be set
2. **Redeploy**: After adding env var, redeploy the app
3. **Clear database cache**: Delete test entries with null coordinates

### Location not extracted
1. **Check AI logs**: Should see "🎯 AI extracted location: ..."
2. **Message format**: Ensure message includes location keywords (near, at, in, etc.)
3. **Test message**: "I was robbed at Westlands Mall" (clear location)

### Geocoding fails
1. **Check Mapbox quota**: Free tier = 100,000 requests/month
2. **Check location format**: Must be recognizable place in Kenya
3. **Test manually**: Use test script `npx tsx test-location-extraction.ts`

## 📊 Expected Performance
- **Location Extraction**: ~200-500ms (Groq AI call)
- **Geocoding**: ~300-800ms (Mapbox API call)
- **Total Processing**: ~500-1300ms per incident report
- **Cost**: ~$0.0001 per report (mostly Groq AI)

## ✅ Success Indicators
1. Logs show: `🎯 AI extracted location: "..."`
2. Logs show: `✅ Geocoded to: [..., ...]`
3. Database events have non-null longitude/latitude
4. Map displays incident pins correctly
5. No `❌` errors in logs related to geocoding

## 🔄 Rollback Plan (if needed)
```bash
# Go back to previous version
git checkout 4d9be00  # Previous commit before location extraction
vercel --prod
```

## 📞 Support
If issues persist:
1. Check full error logs: `vercel logs --production > logs.txt`
2. Verify all environment variables are set
3. Test with simple location: "I was robbed at Nairobi CBD"

