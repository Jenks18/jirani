# CRITICAL: Vercel Deployment Protection Configuration

## Issue: 401 Unauthorized on `/api/whatsapp`

Your webhook endpoint is returning **401 Unauthorized** because Vercel Deployment Protection is enabled. This prevents external services like Twilio from accessing your API.

## Solution: Configure Vercel to Bypass Protection for Webhooks

### Option 1: Disable Deployment Protection (Recommended for Development)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **jirani**
3. Go to: **Settings** → **Deployment Protection**
4. **Disable** "Vercel Authentication" for your deployment
5. Click **Save**

### Option 2: Bypass Protection for Specific Routes (Recommended for Production)

Vercel Deployment Protection can be bypassed for specific routes using environment variables and custom logic.

#### Step 1: Add to your Vercel Environment Variables

```bash
# In Vercel Dashboard → Settings → Environment Variables
VERCEL_AUTOMATION_BYPASS_SECRET=your-random-secret-here-min-32-chars
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

#### Step 2: Configure Twilio Webhook with Bypass Token

Update your Twilio webhook URL to include the bypass token:

```
https://your-app.vercel.app/api/whatsapp?bypass=your-random-secret-here-min-32-chars
```

#### Step 3: Verify in Webhook Code

The webhook already validates Twilio signatures, so this adds an additional layer.

### Option 3: Use Vercel Protection Bypass Header (Production)

If you have Vercel Pro/Enterprise, you can configure bypass using the `x-vercel-protection-bypass` header.

1. Go to: **Settings** → **Deployment Protection**
2. Enable **Protection Bypass for Automation**
3. Copy the secret token
4. Configure Twilio to send this header:
   ```
   x-vercel-protection-bypass: your-bypass-token
   ```

## Quick Test After Configuration

After disabling protection or configuring bypass:

```bash
curl https://your-app.vercel.app/api/whatsapp
```

Expected response:
```json
{
  "status": "ok",
  "provider": "Twilio WhatsApp",
  "timestamp": "2025-12-01T..."
}
```

## Current Status

- ❌ Webhook endpoint returns 401
- ✅ Code is deployed correctly
- ✅ Environment variables are needed
- ❌ Deployment protection is blocking access

## Next Steps

1. **Disable Deployment Protection** (easiest for testing)
2. Set your environment variables in Vercel:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_MESSAGING_SERVICE_SID`
   - `GROQ_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Configure Twilio webhook URL
4. Test with a WhatsApp message

## Testing Without Disabling Protection

If you need to keep protection enabled, use the test endpoint from your local machine:

```bash
curl -X POST https://your-app.vercel.app/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_VERCEL_TOKEN" \
  -d '{
    "to": "+254712345678",
    "message": "Test message",
    "send": false
  }'
```

Or access it through the Vercel authenticated session in your browser:
```
https://your-app.vercel.app/api/whatsapp/test
```

## Documentation

For more details on Vercel Deployment Protection:
https://vercel.com/docs/security/deployment-protection
