# Twilio WhatsApp Integration - Quick Reference

## What's New in This Branch

This branch (`fix/supabase-twilio-fallback`) contains a **production-grade Twilio WhatsApp integration** with:

### ✅ Security Enhancements
- **Webhook Signature Verification**: Validates all incoming webhooks using Twilio's signature
- **Rate Limiting**: Prevents abuse with configurable per-user limits
- **Input Validation**: Comprehensive sanitization and validation of all inputs
- **Type Safety**: Full TypeScript implementation with no `any` types

### ✅ Reliability Improvements
- **Retry Logic**: Exponential backoff for failed message sends (3 attempts)
- **Graceful Fallbacks**: Supabase → File storage fallback
- **Error Recovery**: Intelligent error handling that never blocks the webhook
- **Processing Timeouts**: Monitors and logs slow operations

### ✅ Production Features
- **Structured Logging**: Detailed, parseable logs for debugging and monitoring
- **Performance Tracking**: Tracks processing time for each request
- **Health Checks**: GET endpoint for uptime monitoring
- **Test Endpoint**: `/api/whatsapp/test` for integration testing

### ✅ Code Quality
- **TypeScript**: Proper type definitions throughout
- **Clean Architecture**: Separation of concerns with utility modules
- **Documentation**: Comprehensive inline comments and external docs
- **Best Practices**: Follows Next.js and Twilio best practices

## Key Files Changed

| File | Changes |
|------|---------|
| `src/app/api/whatsapp/route.ts` | Complete refactor with security, validation, and proper error handling |
| `src/app/api/whatsapp/test/route.ts` | Enhanced test endpoint with rate limiting and better validation |
| `src/lib/rateLimiter.ts` | **NEW** - In-memory rate limiting utility |
| `TWILIO_PRODUCTION_SETUP.md` | **NEW** - Complete production deployment guide |
| `.env.example` | **NEW** - Template for environment variables |
| `WHATSAPP_SETUP.md` | Updated with Twilio migration notice |

## Quick Start

### 1. Environment Setup

```bash
# Copy example environment file
cp .env.example .env.local

# Edit .env.local with your credentials
```

Required environment variables:
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GROQ_API_KEY=gsk_your_groq_api_key_here
```

### 2. Local Development

```bash
npm install
npm run dev
```

### 3. Test the Integration

```bash
# Test AI processing (no actual send)
curl -X POST http://localhost:3000/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+254712345678",
    "message": "Test message",
    "send": false
  }'
```

### 4. Production Deployment

See [TWILIO_PRODUCTION_SETUP.md](./TWILIO_PRODUCTION_SETUP.md) for complete instructions.

## API Endpoints

### `POST /api/whatsapp`
Main webhook endpoint for receiving WhatsApp messages from Twilio.

**Features:**
- Signature verification
- Rate limiting (20 req/min per user)
- AI-powered conversation management
- Incident detection and storage
- Automatic retry logic

### `GET /api/whatsapp`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "provider": "Twilio WhatsApp",
  "timestamp": "2025-12-01T10:00:00.000Z"
}
```

### `POST /api/whatsapp/test`
Test endpoint for development and integration testing.

**Rate Limit:** 5 requests per minute

**Body:**
```json
{
  "to": "+254712345678",
  "message": "Test message",
  "send": false
}
```

**Response:**
```json
{
  "response": "AI generated response...",
  "incident": { ... },
  "processingTimeMs": 1234,
  "twilio": {
    "sent": true,
    "sid": "SM..."
  }
}
```

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/whatsapp` | 20 requests | 60 seconds |
| `/api/whatsapp/test` | 5 requests | 60 seconds |

When exceeded, users receive a bilingual message (English/Swahili) with wait time.

## Error Handling Strategy

The webhook **always returns 200 OK** to prevent Twilio from retrying:

```
Request → Validation → Rate Limit → AI Processing → Storage → Send
   ↓          ↓            ↓             ↓            ↓         ↓
 200 OK     200 OK      200 OK       200 OK       200 OK    200 OK
```

Errors are logged but don't fail the webhook. This prevents:
- Duplicate message processing
- User confusion from delayed responses
- Unnecessary Twilio retries

## Migration from Meta WhatsApp API

If you're migrating from the Meta WhatsApp Cloud API:

1. **Keep your Groq API key** - AI processing unchanged
2. **Update webhook URL** in Meta console to point to Twilio
3. **Configure Twilio credentials** in environment variables
4. **Test thoroughly** using the test endpoint
5. **Monitor logs** for the first few hours after migration

The conversation state and incident detection logic remain the same.

## Monitoring

### Key Metrics

Monitor these in production:

1. **Processing Time**: Should be < 2000ms
2. **Error Rate**: Should be < 1%
3. **Rate Limit Hits**: Monitor for abuse patterns
4. **Message Delivery Rate**: Should be > 99%

### Log Queries

In Vercel logs, search for:
- `[WhatsApp Webhook]` - All webhook activity
- `[WhatsApp Webhook ERROR]` - Errors only
- `[WhatsApp Test]` - Test endpoint activity

## Security Checklist

- [x] Webhook signature verification enabled
- [x] Rate limiting implemented
- [x] Input validation and sanitization
- [x] No secrets in code (uses env vars)
- [x] HTTPS enforced (Vercel default)
- [x] Proper error handling (no data leaks)
- [x] TypeScript for type safety
- [x] Audit logging for troubleshooting

## Performance Optimizations

1. **In-Memory Rate Limiting**: No external dependencies
2. **Exponential Backoff**: Smart retry strategy
3. **Async Operations**: Non-blocking webhook processing
4. **Connection Reuse**: Twilio client reused across requests
5. **Minimal Dependencies**: Fast cold starts

## Testing Strategy

### Unit Tests
- Rate limiter logic
- Input validation
- Error handling
- Type definitions

### Integration Tests
- Use `/api/whatsapp/test` endpoint
- Test with various message types
- Verify incident detection
- Check rate limiting

### End-to-End Tests
- Send real WhatsApp messages
- Verify AI responses
- Check database storage
- Monitor logs

## Troubleshooting

### Common Issues

**Q: Webhook returns 403 Forbidden**
A: Signature verification failed. Check `TWILIO_AUTH_TOKEN` is correct.

**Q: Messages not sending**
A: Verify `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_WHATSAPP_NUMBER` is set.

**Q: Rate limit too restrictive**
A: Adjust limits in `src/lib/rateLimiter.ts`

**Q: Slow responses**
A: Check Groq API performance and database query times.

See [TWILIO_PRODUCTION_SETUP.md](./TWILIO_PRODUCTION_SETUP.md) for detailed troubleshooting.

## Next Steps

1. **Review** [TWILIO_PRODUCTION_SETUP.md](./TWILIO_PRODUCTION_SETUP.md)
2. **Configure** environment variables
3. **Test** using the test endpoint
4. **Deploy** to production
5. **Monitor** logs and metrics
6. **Iterate** based on user feedback

## Support

- 📚 [Full Production Guide](./TWILIO_PRODUCTION_SETUP.md)
- 🐛 [Report Issues](https://github.com/Jenks18/jirani/issues)
- 💬 [Twilio Docs](https://www.twilio.com/docs/whatsapp)
- 🤖 [Groq Docs](https://console.groq.com/docs)

---

**Version:** 2.0.0-twilio  
**Branch:** `fix/supabase-twilio-fallback`  
**Last Updated:** December 1, 2025
