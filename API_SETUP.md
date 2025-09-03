# Jirani Safety API - Setup Guide

## Overview
Your WhatsApp safety reporting system has been refactored to work with Vercel serverless functions and supports multiple LLM providers (OpenAI and Google Gemini).

**Production URL**: https://jirani-opal.vercel.app/

## API Endpoints

### 1. WhatsApp Webhook (`/api/whatsapp`)
- **Production URL**: https://jirani-opal.vercel.app/api/whatsapp
- **GET**: WhatsApp verification endpoint
- **POST**: Receives WhatsApp messages and processes them

### 2. LLM Processing (`/api/process-llm`)
- **Production URL**: https://jirani-opal.vercel.app/api/process-llm
- **POST**: Processes text with AI and determines if it's a safety report
- **GET**: Status endpoint

### 3. Store Report (`/api/store-report`)
- **Production URL**: https://jirani-opal.vercel.app/api/store-report
- **POST**: Stores safety reports to JSON file (will be replaced with database)

### 4. Test Interface
- **Production URL**: https://jirani-opal.vercel.app/test
- Use this to test your APIs directly in production

## Environment Configuration

Update your `.env.local` file with the following:

```bash
# WhatsApp Cloud API
WHATSAPP_VERIFY_TOKEN=your_verify_token_here
WHATSAPP_ACCESS_TOKEN=your_access_token_here

# LLM Provider Selection (openai, gemini, ollama)
LLM_PROVIDER=openai

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo

# Google Gemini Configuration
GOOGLE_API_KEY=your_google_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# Base URL for internal API calls
NEXT_PUBLIC_BASE_URL=https://jirani-opal.vercel.app
```

## Getting API Keys

### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add it to your `.env.local` as `OPENAI_API_KEY`

### Google Gemini
1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key
3. Add it to your `.env.local` as `GOOGLE_API_KEY`

## Testing

1. **Local Development**: 
   - Start development server: `npm run dev`
   - Visit http://localhost:3000/test

2. **Production Testing**:
   - Visit https://jirani-opal.vercel.app/test
   - Try the sample messages to test different scenarios
   - Check the browser console for detailed logs

## WhatsApp Setup

For production, configure your WhatsApp Business API webhook to point to:
```
https://jirani-opal.vercel.app/api/whatsapp
```

**Verification Token**: Use the value you set in `WHATSAPP_VERIFY_TOKEN`

## Files Structure

```
src/app/api/
├── whatsapp/route.ts          # WhatsApp webhook handler
├── process-llm/route.ts       # LLM processing
└── store-report/route.ts      # Report storage

data/
├── messages.json              # Stored messages
├── events.json               # Extracted events
└── reports.json              # Safety reports

rules/
└── agent.txt                 # AI assistant instructions
```

## Sample Test Messages

Try these messages to test different scenarios:

1. **Safety Report**: "Someone stole my phone at the bus stop in Westlands around 3 PM today"
2. **Accident Report**: "I witnessed a car accident on Uhuru Highway near the roundabout"
3. **Non-Safety**: "Hello, how are you doing today?"

## Deployment

1. Deploy to Vercel: `vercel --prod`
2. Add environment variables in Vercel dashboard
3. Update WhatsApp webhook URL to your production domain

## Next Steps

1. Replace JSON file storage with a proper database (Vercel Postgres, Supabase, etc.)
2. Add WhatsApp response functionality
3. Integrate with your map component
4. Add user authentication and admin panel
