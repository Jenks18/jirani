#!/usr/bin/env node
/**
 * Diagnoses the WhatsApp Cloud API setup for the Jirani number by asking Meta directly.
 *
 *   WHATSAPP_ACCESS_TOKEN=... WHATSAPP_PHONE_NUMBER_ID=... node scripts/check-whatsapp.mjs [WABA_ID]
 *
 * Optional fixes (only run when the check tells you to):
 *   --subscribe        subscribe this app to the WABA's webhooks (fixes "no inbound messages")
 *   --register <PIN>   register the number with Cloud API using its 6-digit two-step PIN
 *   --send-test <to>   send a plain text message to <to> (digits only, e.g. 2547XXXXXXXX)
 */
const EXPECTED_NUMBER = '12025094959';
const version = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';
const token = process.env.WHATSAPP_ACCESS_TOKEN;
const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1] ?? true;
};
const VALUE_FLAGS = ['--register', '--send-test'];
let wabaId = args.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1]));

if (!token) {
  console.error('Set WHATSAPP_ACCESS_TOKEN (and ideally WHATSAPP_PHONE_NUMBER_ID) to the values in Vercel.');
  process.exit(1);
}

const digits = (s) => String(s ?? '').replace(/\D/g, '');
const ok = (m) => console.log(`  OK    ${m}`);
const bad = (m) => console.log(`  FAIL  ${m}`);
const warn = (m) => console.log(`  WARN  ${m}`);

async function graph(path, init = {}) {
  const res = await fetch(`https://graph.facebook.com/${version}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, body };
}

console.log('\n1. Access token');
const dbg = await graph(`debug_token?input_token=${encodeURIComponent(token)}`);
const data = dbg.body.data;
if (!dbg.ok || !data?.is_valid) {
  bad(`token is not valid: ${dbg.body.error?.message ?? data?.error?.message ?? 'unknown'}`);
  process.exit(1);
}
ok(`valid, app ${data.app_id}, ${data.expires_at ? `expires ${new Date(data.expires_at * 1000).toISOString()}` : 'never expires'}`);
if (data.expires_at) warn('this looks like a temporary token. Use a System User token so it does not stop working in 24h.');
for (const scope of ['whatsapp_business_messaging', 'whatsapp_business_management']) {
  data.scopes?.includes(scope) ? ok(`has ${scope}`) : bad(`missing ${scope}`);
}
const tokenWabas = (data.granular_scopes ?? []).find((g) => g.scope === 'whatsapp_business_management')?.target_ids ?? [];
if (!wabaId) wabaId = tokenWabas[0];

console.log('\n2. WhatsApp Business Account');
if (!wabaId) {
  bad('could not determine the WABA ID; pass it as the first argument (WhatsApp Manager -> Account tools -> Phone numbers).');
  process.exit(1);
}
ok(`WABA ${wabaId}${tokenWabas.length > 1 ? ` (token can reach ${tokenWabas.join(', ')})` : ''}`);

const nums = await graph(
  `${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,code_verification_status,status,platform_type,name_status,quality_rating,account_mode`
);
if (!nums.ok) {
  bad(`cannot list phone numbers: ${nums.body.error?.message}`);
  process.exit(1);
}
const target = nums.body.data?.find((n) => digits(n.display_phone_number) === EXPECTED_NUMBER);
for (const n of nums.body.data ?? []) console.log(`        ${n.id}  ${n.display_phone_number}  ${n.verified_name ?? ''}`);
if (!target) {
  bad(`+1 202 509 4959 is not in WABA ${wabaId}. Add it there, or pass the right WABA ID.`);
  process.exit(1);
}

console.log('\n3. Phone number +1 202 509 4959');
ok(`phone number ID ${target.id}`);
if (!envPhoneId) bad(`WHATSAPP_PHONE_NUMBER_ID not given; set it in Vercel to ${target.id}`);
else if (envPhoneId !== target.id) bad(`WHATSAPP_PHONE_NUMBER_ID is ${envPhoneId} but the new number's ID is ${target.id}. Update it in Vercel and redeploy.`);
else ok('WHATSAPP_PHONE_NUMBER_ID matches');
target.code_verification_status === 'VERIFIED'
  ? ok('number verified')
  : bad(`verification status ${target.code_verification_status}; finish verification in WhatsApp Manager`);
target.platform_type === 'CLOUD_API'
  ? ok('registered with Cloud API')
  : bad(`platform_type is ${target.platform_type}; the number is not registered. Run with --register <6-digit PIN>`);
if (target.status && target.status !== 'CONNECTED') bad(`status ${target.status} (expected CONNECTED)`);
else if (target.status) ok('status CONNECTED');
if (target.name_status && !['APPROVED', 'AVAILABLE_WITHOUT_REVIEW'].includes(target.name_status))
  warn(`display name status ${target.name_status}; sending can be limited until it is approved`);
if (target.account_mode === 'SANDBOX') warn('account is in SANDBOX mode; only test recipients can receive messages');
if (target.quality_rating && target.quality_rating !== 'GREEN') warn(`quality rating ${target.quality_rating}`);

console.log('\n4. Webhook subscription (inbound messages)');
const subs = await graph(`${wabaId}/subscribed_apps`);
const subscribed = (subs.body.data ?? []).some((s) => (s.whatsapp_business_api_data?.id ?? s.id) === data.app_id);
if (subscribed) ok(`app ${data.app_id} is subscribed to WABA ${wabaId}`);
else bad(`app ${data.app_id} is NOT subscribed to WABA ${wabaId}, so Meta never sends inbound messages. Run with --subscribe`);
warn('also confirm in the app dashboard: App mode is Live, and WhatsApp -> Configuration has the callback URL with "messages" subscribed.');

if (flag('--subscribe')) {
  const r = await graph(`${wabaId}/subscribed_apps`, { method: 'POST' });
  r.ok ? ok('subscribed the app to the WABA') : bad(`subscribe failed: ${r.body.error?.message}`);
}
const pin = flag('--register');
if (pin) {
  const r = await graph(`${target.id}/register`, {
    method: 'POST',
    body: JSON.stringify({ messaging_product: 'whatsapp', pin: String(pin) }),
  });
  r.ok ? ok('number registered with Cloud API') : bad(`register failed: ${r.body.error?.message}`);
}
const to = flag('--send-test');
if (to) {
  const r = await graph(`${target.id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ messaging_product: 'whatsapp', to: digits(to), type: 'text', text: { body: 'Jirani test message' } }),
  });
  r.ok
    ? ok(`Meta accepted the test message (${r.body.messages?.[0]?.id}). Delivery failures show up in Vercel logs as "delivery FAILED".`)
    : bad(`send failed: (${r.body.error?.code}) ${r.body.error?.message}`);
}
console.log('');
