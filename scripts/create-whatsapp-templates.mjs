#!/usr/bin/env node
/**
 * Creates the WhatsApp message templates Jirani needs for business-initiated messages
 * (safety-net invites/alerts and area alerts), which are required outside the 24-hour window.
 *
 *   WHATSAPP_ACCESS_TOKEN=... node scripts/create-whatsapp-templates.mjs <WABA_ID>
 *
 * Meta reviews templates (usually minutes to a day). Add --dry-run to print without creating.
 */
const [wabaId, flag] = process.argv.slice(2);
const token = process.env.WHATSAPP_ACCESS_TOKEN;
const version = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';
if (!wabaId || !token) {
  console.error('Usage: WHATSAPP_ACCESS_TOKEN=... node scripts/create-whatsapp-templates.mjs <WABA_ID> [--dry-run]');
  process.exit(1);
}

const templates = [
  {
    name: 'jirani_safety_invite',
    text: 'Hi, {{1}} added you as a trusted contact on Jirani Safety Net. If they are ever in danger or miss a safety check-in, we will message you. Reply YES to accept or NO to decline. Reply STOP at any time to opt out.',
    example: ['Wanjiru'],
  },
  {
    name: 'jirani_sos_alert',
    text: 'SOS: {{1}} has asked for help. {{2}} Please try to reach them now, and call 999 or 112 if you think they are in danger.',
    example: ['Wanjiru', 'Last known location: https://maps.google.com/?q=-1.28,36.82'],
  },
  {
    name: 'jirani_checkin_missed',
    text: '{{1}} missed a safety check-in on Jirani and has not replied. {{2}} Please try to reach them, and call 999 or 112 if you are worried.',
    example: ['Wanjiru', 'Last known location: https://maps.google.com/?q=-1.28,36.82'],
  },
  {
    name: 'jirani_safety_nudge',
    text: 'Safety check: are you OK? Reply SAFE to confirm. If we do not hear from you in {{1}} minutes we will alert your trusted contacts.',
    example: ['10'],
  },
  {
    name: 'jirani_area_alert',
    text: 'Jirani alert near {{1}}: {{2}} Reply STOP to turn off alerts.',
    example: ['Westlands', 'Phone theft reported around 6pm.'],
  },
];

for (const t of templates) {
  const body = {
    name: t.name,
    language: 'en',
    category: 'UTILITY',
    components: [{ type: 'BODY', text: t.text, example: { body_text: [t.example] } }],
  };
  if (flag === '--dry-run') { console.log(JSON.stringify(body, null, 2)); continue; }
  const res = await fetch(`https://graph.facebook.com/${version}/${wabaId}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const out = await res.json();
  console.log(t.name, res.ok ? `created (${out.status ?? 'submitted'})` : `FAILED: ${out.error?.message}`);
}
