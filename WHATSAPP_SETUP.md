# WhatsApp setup (Meta WhatsApp Cloud API)

Jirani talks to WhatsApp directly through Meta's Cloud API. There is no Twilio dependency.

## 1. Meta app
1. In [Meta for Developers](https://developers.facebook.com/) create/open the app with the **WhatsApp** product.
2. Add the Jirani phone number (+1 202 509 4959) under **WhatsApp → API Setup** and complete verification.
3. Create a **System User** token (Business Settings → Users → System users) with `whatsapp_business_messaging` and
   `whatsapp_business_management`. Use this permanent token, not the 24h test token.

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)
| Variable | Where to find it |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | System user token |
| `WHATSAPP_PHONE_NUMBER_ID` | API Setup → Phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | Any random string you choose |
| `WHATSAPP_APP_SECRET` | App settings → Basic → App secret |
| `GROQ_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | See `.env.example` |

Redeploy after changing them.

## 3. Webhook
WhatsApp → Configuration:
- **Callback URL:** `https://jirani.the625movement.com/api/whatsapp`
- **Verify token:** the value of `WHATSAPP_VERIFY_TOKEN`
- Subscribe to the **messages** field.

Also set, in App settings → Basic: **Privacy policy URL** `https://jirani.the625movement.com/privacy`,
**Terms** `https://jirani.the625movement.com/terms`, **User data deletion** `https://jirani.the625movement.com/data-deletion`.

## 4. Database lock-down
Set `SUPABASE_SERVICE_ROLE_KEY` and redeploy first, then apply
`supabase/migrations/20261009000000_lock_down_personal_data.sql`.

## Troubleshooting
Start with the checker. It asks Meta directly and tells you exactly what is wrong:

```
WHATSAPP_ACCESS_TOKEN=... WHATSAPP_PHONE_NUMBER_ID=... node scripts/check-whatsapp.mjs [WABA_ID]
```

It can also fix the two most common problems with a new number: `--subscribe` (no inbound messages) and
`--register <PIN>` (number not registered with Cloud API). `--send-test <number>` sends a test message.

When the number changes (as it did from +1 555 143 7024 to +1 202 509 4959), all of these must be redone:
- `WHATSAPP_PHONE_NUMBER_ID` in Vercel must be the **new** number's ID (each number has its own ID), then redeploy.
- The new number must be **registered** with Cloud API (two-step PIN), not just added and verified.
- If the new number is in a different WhatsApp Business Account, the app must be **subscribed** to that account,
  and the System User must be assigned that account with full control.
- The app must be in **Live** mode, or Meta only sends webhooks for test numbers.
- The number must not still be signed in to the WhatsApp or WhatsApp Business phone app.

Other symptoms:
- Webhook verification 403 → verify token mismatch.
- Messages arrive but no reply → check `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` and Vercel function logs.
- 403 on POST in logs → `WHATSAPP_APP_SECRET` is wrong. In production the webhook refuses unsigned requests.
