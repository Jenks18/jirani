# WhatsApp Integration Setup Guide

> **Note:** This project now uses **Twilio WhatsApp API** for improved reliability and production features.
> See [TWILIO_PRODUCTION_SETUP.md](./TWILIO_PRODUCTION_SETUP.md) for the complete production guide.

---

## Legacy: WhatsApp Cloud API Setup

This guide is kept for reference. **For new deployments, use Twilio instead.**

## Step 1: WhatsApp Business API Setup

1. **Go to Meta Developer Console**
   - Visit: https://developers.facebook.com/
   - Create a new app or use existing app
   - Add "WhatsApp Business API" product

2. **Get Your Phone Number ID**
   - Go to WhatsApp > API Setup
   - Note down your Phone Number ID

3. **Generate Access Token**
   - Go to WhatsApp > API Setup
   - Generate a permanent access token
   - Copy this token for your `.env.local`

## Step 2: Configure Webhook

### Webhook URL
```
https://jirani-opal.vercel.app/api/whatsapp
```

### Verify Token
- Set any secure string as your verify token
- Add it to your `.env.local` as `WHATSAPP_VERIFY_TOKEN`
- Use the same token in Meta Developer Console

### Webhook Fields to Subscribe
Check these fields in your webhook subscription:
- `messages`
- `message_deliveries` (optional)
- `message_reads` (optional)

## Step 3: Environment Variables

Add these to your Vercel environment variables (and `.env.local` for local testing):

```bash
# WhatsApp Configuration
WHATSAPP_VERIFY_TOKEN=your_unique_verify_token_here
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here

# LLM Provider (choose one)
LLM_PROVIDER=openai

# API Keys (add the one you're using)
OPENAI_API_KEY=sk-your-openai-key-here
GOOGLE_API_KEY=your-google-api-key-here

# App Configuration
NEXT_PUBLIC_BASE_URL=https://jirani-opal.vercel.app
```

## Step 4: Test the Setup

### 1. Test Webhook Verification
Visit: https://jirani-opal.vercel.app/api/whatsapp

If configured correctly, you should see a "Method not allowed" message (because we need POST for actual messages).

### 2. Test LLM Processing
Visit: https://jirani-opal.vercel.app/test

Try sending sample messages to verify your AI is working.

### 3. Send a WhatsApp Message
Once webhook is configured in Meta Developer Console, send a message to your WhatsApp Business number.

## Step 5: Monitor Logs

Check your Vercel function logs:
1. Go to Vercel Dashboard
2. Select your project (jirani-opal)
3. Go to "Functions" tab
4. Click on any function to see logs

## Troubleshooting

### Common Issues:

1. **Webhook verification fails**
   - Check that `WHATSAPP_VERIFY_TOKEN` matches in both Vercel and Meta Console
   - Ensure webhook URL is exactly: `https://jirani-opal.vercel.app/api/whatsapp`

2. **LLM not responding**
   - Check your API key is valid
   - Verify `LLM_PROVIDER` is set correctly
   - Check Vercel function logs for errors

3. **Messages not received**
   - Verify webhook subscription includes `messages` field
   - Check that access token has required permissions
   - Look at Vercel function logs

## Security Notes

- Never commit API keys to Git
- Use environment variables for all sensitive data
- Regularly rotate your access tokens
- Monitor usage to prevent unexpected charges
