import 'server-only';
import { subscribersFor } from './platform';
import { notify } from './whatsappCloud';

const MAX_RECIPIENTS = 200;
const flat = (s: string) => s.replace(/\s+/g, ' ').trim();

export async function dispatchAlerts(
  report: { type: string; severity: number; location: string; summary: string; coordinates: [number, number] | null },
  reporterPhone: string
): Promise<number> {
  if (!report.coordinates) return 0;
  const [lng, lat] = report.coordinates;
  let phones: string[];
  try {
    phones = (await subscribersFor({ severity: report.severity, lat, lng }, reporterPhone)).slice(0, MAX_RECIPIENTS);
  } catch (err) {
    console.error('[alerts] lookup failed', err);
    return 0;
  }
  if (!phones.length) return 0;

  const where = flat(report.location).slice(0, 80);
  const summary = flat(report.summary).slice(0, 220);
  const text = `🔔 Jirani alert near ${where}: ${report.type} reported. ${summary}\n\nReply STOP to turn off alerts.`;
  let sent = 0;
  for (const phone of phones) {
    if (await notify(phone, text, { name: 'jirani_area_alert', params: [where, summary] })) sent++;
  }
  return sent;
}
