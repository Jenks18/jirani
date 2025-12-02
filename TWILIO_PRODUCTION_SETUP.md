# Twilio WhatsApp Integration - Production Setup Guide

## Overview

This guide covers the production-grade Twilio WhatsApp integration for the Jirani incident reporting system. The implementation includes security features, error handling, rate limiting, and monitoring capabilities.

## Features

✅ **Security**
- Webhook signature verification
- Request validation and sanitization
- Rate limiting to prevent abuse
- Environment-based configuration

✅ **Reliability**
- Exponential backoff retry logic
- Graceful fallback mechanisms
- Comprehensive error handling
- Database fallback (Supabase → File storage)

✅ **Monitoring**
- Structured logging
- Processing time tracking
- Error tracking with context
- Rate limit monitoring

✅ **Type Safety**
- Full TypeScript implementation
- Proper type definitions
- No `any` types in production code

## Environment Variables

Configure these in your deployment environment (Vercel, etc.):

```bash
# Twilio Configuration (Required)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here

# Choose ONE of the following (Messaging Service SID is recommended):
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# OR
TWILIO_WHATSAPP_NUMBER=+14155238886

# AI Configuration (Required)
GROQ_API_KEY=gsk_your_groq_api_key_here

# Database Configuration (Recommended)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Application Configuration
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
```

### Configuration Notes

1. **Messaging Service SID vs. WhatsApp Number**
   - **Recommended**: Use `TWILIO_MESSAGING_SERVICE_SID` for better scalability
   - Only use `TWILIO_WHATSAPP_NUMBER` if you don't have a messaging service
   - Format for WhatsApp number: `+14155238886` (will be auto-prefixed with `whatsapp:`)

2. **Security Token**
   - `TWILIO_AUTH_TOKEN` is used for webhook signature verification
   - Keep this secret and rotate regularly
   - Never commit to version control

3. **Database**
   - System will fall back to file storage if Supabase is unavailable
   - Ensure Supabase has the `events` table (see migrations)

## Webhook Configuration

### 1. Configure Twilio Console

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to: **Messaging** → **Settings** → **WhatsApp Sandbox Settings** (or your WhatsApp Sender)
3. Set webhook URL:
   ```
   https://your-domain.vercel.app/api/whatsapp
   ```
4. Set HTTP method to: `POST`
5. Save configuration

### 2. Test Webhook Connection

```bash
curl -X GET https://your-domain.vercel.app/api/whatsapp
```

Expected response:
```json
{
  "status": "ok",
  "provider": "Twilio WhatsApp",
  "timestamp": "2025-12-01T10:00:00.000Z"
}
```

## Rate Limiting

The system implements rate limiting to prevent abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/whatsapp` (webhook) | 20 requests | 1 minute |
| `/api/whatsapp/test` | 5 requests | 1 minute |

When rate limit is exceeded:
- User receives a message in English and Swahili
- Request is acknowledged (200 status) to prevent retries
- Counter resets after the time window

### Adjusting Rate Limits

Edit `src/lib/rateLimiter.ts`:

```typescript
export const webhookRateLimiter = new RateLimiter(20, 60000); // 20 req/min
export const testEndpointRateLimiter = new RateLimiter(5, 60000); // 5 req/min
```

## Testing

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Use ngrok for webhook testing:**
   ```bash
   ngrok http 3000
   # Update Twilio webhook URL to: https://your-ngrok-url.ngrok.io/api/whatsapp
   ```

### Test Endpoint

Use the test endpoint to verify AI and Twilio integration without waiting for webhooks:

```bash
curl -X POST https://your-domain.vercel.app/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+254712345678",
    "message": "Somebody robbed me near Westland mall",
    "send": false
  }'
```

Parameters:
- `to`: Phone number in E.164 format
- `message`: Message to process
- `send`: `true` to actually send via Twilio, `false` to test AI only

Response:
```json
{
  "response": "Pole sana! That sounds serious...",
  "incident": {
    "type": "Theft/Robbery",
    "confirmed": false,
    ...
  },
  "processingTimeMs": 1234
}
```

## Monitoring and Logging

### Log Structure

All logs include structured data for easy parsing:

```
[WhatsApp Webhook] Processing message {"from":"whatsapp:+254712345678","messageLength":42}
[WhatsApp Webhook] AI response generated {"responseLength":156,"hasIncident":true}
[WhatsApp Webhook] Message sent successfully {"attempt":1,"messageSid":"SM...","processingTimeMs":1234}
```

### Key Metrics to Monitor

1. **Processing Time**
   - Normal: 500-2000ms
   - Alert if: >5000ms consistently

2. **Error Rates**
   - AI processing failures
   - Twilio send failures
   - Database storage failures

3. **Rate Limiting**
   - Number of rate-limited requests
   - Identify potential abuse patterns

4. **Success Rates**
   - Webhook acknowledgment rate (should be 100%)
   - Message delivery rate
   - Incident storage rate

### Viewing Logs in Vercel

1. Go to Vercel Dashboard
2. Select your project
3. Navigate to: **Deployments** → Select deployment → **Functions**
4. Click on function to view logs
5. Use filters: `[WhatsApp Webhook]` or `[WhatsApp Webhook ERROR]`

## Error Handling

The system implements multiple layers of error handling:

### 1. Webhook Level
- Invalid signatures → 403 Forbidden
- Invalid payloads → 400 Bad Request
- All processing errors → 200 OK (to prevent retries)

### 2. AI Processing
- API failures → Fallback to intelligent default responses
- Maintains conversation state
- Logs error but continues processing

### 3. Database Storage
- Supabase failure → Falls back to file storage
- File storage failure → Logs error but sends response
- Incident not blocked by storage failures

### 4. Message Sending
- Implements 3 retry attempts with exponential backoff
- Logs all attempts
- Always acknowledges webhook even if send fails

## Security Best Practices

### 1. Environment Variables
- ✅ Store all secrets in environment variables
- ✅ Use Vercel's environment variable encryption
- ❌ Never commit `.env.local` to git
- ❌ Never log sensitive data (tokens, phone numbers in full)

### 2. Webhook Signature Verification
- Enabled by default when `TWILIO_AUTH_TOKEN` is set
- Validates all incoming webhooks
- Rejects unauthorized requests

### 3. Input Validation
- All inputs sanitized and validated
- Message length limits enforced (max 4096 chars)
- Phone number format validation
- Rate limiting prevents abuse

### 4. HTTPS Only
- All production endpoints must use HTTPS
- Vercel enforces this by default
- Never disable SSL verification

## Troubleshooting

### Issue: Webhook not receiving messages

**Check:**
1. Webhook URL in Twilio console is correct
2. URL uses HTTPS (required)
3. Function is deployed and running
4. Check Vercel function logs for errors

**Test:**
```bash
curl -X GET https://your-domain.vercel.app/api/whatsapp
```

### Issue: Signature verification failing

**Check:**
1. `TWILIO_AUTH_TOKEN` is set correctly
2. Webhook URL in Twilio matches exactly (including protocol)
3. No reverse proxy modifying requests
4. Check header: `X-Twilio-Signature`

**Temporary fix for development:**
Comment out signature validation in `route.ts` (NOT for production)

### Issue: Messages not sending

**Check:**
1. `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are correct
2. Either `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_WHATSAPP_NUMBER` is set
3. Phone number format is correct (`whatsapp:+...`)
4. Check Twilio console for error logs
5. Verify WhatsApp sender is approved

### Issue: High rate limiting

**Solutions:**
1. Increase rate limit in `src/lib/rateLimiter.ts`
2. Implement Redis-based rate limiting for distributed systems
3. Add per-user allowlist for trusted users
4. Monitor for abuse patterns

### Issue: Slow response times

**Check:**
1. Groq API response time
2. Database query performance
3. Network latency
4. Vercel function region (should match user base)

**Optimize:**
- Enable Vercel Edge Functions
- Optimize database queries
- Cache AI responses for common queries
- Use connection pooling

## Production Checklist

Before deploying to production:

- [ ] All environment variables configured in Vercel
- [ ] Webhook URL configured in Twilio console
- [ ] Signature verification enabled (`TWILIO_AUTH_TOKEN` set)
- [ ] Rate limiting configured appropriately
- [ ] Supabase database migrated and tested
- [ ] Monitoring and alerting set up
- [ ] Error tracking configured (e.g., Sentry)
- [ ] Backup strategy for file storage
- [ ] Test endpoint disabled or protected in production
- [ ] SSL/HTTPS enforced
- [ ] Phone number validation working
- [ ] AI responses tested and appropriate
- [ ] Incident storage verified
- [ ] Rate limit messages in correct language
- [ ] All secrets rotated and secured
- [ ] Documentation updated

## Architecture Diagram

```
User WhatsApp Message
    ↓
Twilio → [Webhook Validation] → [Rate Limiting]
    ↓                                ↓
[Parse Message]                 [Send Rate Limit Message]
    ↓
[AI Processing (Groq)]
    ↓
[Incident Detection]
    ↓
[Store in Database]
    ↓              ↓
[Supabase]    [File Fallback]
    ↓
[Generate Response]
    ↓
[Send via Twilio] → [Retry Logic]
    ↓
Response to User
```

## Support and Maintenance

### Regular Tasks

1. **Weekly:**
   - Review error logs
   - Check rate limiting patterns
   - Monitor API usage and costs

2. **Monthly:**
   - Rotate API tokens
   - Review and update rate limits
   - Database cleanup/optimization
   - Update dependencies

3. **Quarterly:**
   - Security audit
   - Performance optimization
   - User feedback review
   - Cost analysis

### Getting Help

- **Twilio Issues:** [Twilio Support](https://support.twilio.com/)
- **Vercel Issues:** [Vercel Support](https://vercel.com/support)
- **Groq Issues:** [Groq Documentation](https://console.groq.com/docs)
- **Application Issues:** Check GitHub Issues

## License

This integration is part of the Jirani project. See main repository for license details.
