# WhatsApp setup (Meta WhatsApp Cloud API)

Jirani talks to WhatsApp directly through Meta's Cloud API. There is no Twilio dependency.

## 1. Meta app
1. In [Meta for Developers](https://developers.facebook.com/) create/open the app with the **WhatsApp** product.
2. Add the Jirani phone number (+254 783 045226) under **WhatsApp → API Setup** and complete verification.
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
- Webhook verification 403 → verify token mismatch.
- Messages arrive but no reply → check `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` and Vercel function logs.
- 403 on POST in logs → `WHATSAPP_APP_SECRET` is wrong. In production the webhook refuses unsigned requests.
