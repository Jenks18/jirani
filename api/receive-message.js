
import fs from 'fs';
import path from 'path';

// WhatsApp Cloud API webhook handler
export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  const messagesPath = path.join(process.cwd(), 'data', 'messages.json');
  const eventsPath = path.join(process.cwd(), 'data', 'events.json');

  if (req.method === 'GET') {
    // Verification handshake
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.status(403).end();
    }
  }

  if (req.method === 'POST') {
    try {
      // WhatsApp Cloud API payload structure
      const entry = req.body.entry?.[0];
      const changes = entry?.changes?.[0];
      const messageObj = changes?.value?.messages?.[0];
      const message = messageObj?.text?.body;
      const from = messageObj?.from;
      const timestamp = messageObj?.timestamp || Date.now();

      if (!message) {
        return res.status(200).json({ status: 'No message to process' });
      }

      // Log message to messages.json
      let messages = [];
      try {
        messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
      } catch {}
      messages.push({ from, message, timestamp });
      fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));

      // Forward to LLM API
      const llmRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/process-llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: message })
      });
      const llmData = await llmRes.json();

      // (Optional) Extract event data from LLM result and store in events.json
      // Example: LLM returns { event: { day, time, place, address, geo, description, picture } }
      if (llmData.result && llmData.result.event) {
        let events = [];
        try {
          events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
        } catch {}
        events.push({ ...llmData.result.event, from, timestamp });
        fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2));
      }

      return res.status(200).json({ reply: llmData.result, to: from });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
