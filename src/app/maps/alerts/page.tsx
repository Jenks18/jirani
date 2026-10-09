"use client";
import { useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import AppShell from "../_components/AppShell";
import { useApi } from "../_components/useApi";
import { Card } from "../_components/ui";
import { org } from "@/config/org";
import type { Area } from "@/lib/platform";

const wa = (text: string) => `https://wa.me/${org.whatsappNumber}?text=${encodeURIComponent(text)}`;

export default function AlertsPage() {
  const { data } = useApi<{ areas: Area[] }>("/api/areas");
  const [slug, setSlug] = useState("");
  const choices = (data?.areas ?? []).filter((a) => a.level !== "country");
  const chosen = choices.find((a) => a.slug === slug);

  return (
    <AppShell title="Alerts" subtitle="Get a WhatsApp message when a serious incident is reported near you. No account or app: your WhatsApp number is all we need.">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="font-serif text-xl font-semibold text-ink">Subscribe to an area</h2>
          <label className="mt-4 block text-sm font-medium text-ink-2" htmlFor="area">Choose an area</label>
          <select id="area" value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-3 text-sm">
            <option value="">Select…</option>
            {choices.map((a) => <option key={a.id} value={a.slug}>{a.name}</option>)}
          </select>
          <a
            href={chosen ? wa(`SUBSCRIBE ${chosen.name}`) : undefined}
            aria-disabled={!chosen}
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold ${chosen ? "bg-forest-800 text-white hover:bg-forest-900" : "pointer-events-none bg-paper-2 text-ink-3"}`}
          >
            <FaWhatsapp /> Subscribe on WhatsApp
          </a>
          <p className="mt-3 text-xs text-ink-3">Opens WhatsApp with the message ready to send.</p>
        </Card>
        <Card>
          <h2 className="font-serif text-xl font-semibold text-ink">Or alert me near a pin</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">Message <strong>SUBSCRIBE</strong>, then share a location pin from WhatsApp (📎 → Location). You&apos;ll be alerted about serious reports within 1.5 km.</p>
          <a href={wa("SUBSCRIBE")} className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink hover:bg-paper-2"><FaWhatsapp /> Start with a pin</a>
        </Card>
      </div>
      <Card className="mt-6">
        <h2 className="font-serif text-xl font-semibold text-ink">You&apos;re in control</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-2">
          <li>Alerts only cover reports of severity High or above.</li>
          <li>Reply <strong>ALERTS</strong> to review your subscriptions, or <strong>STOP</strong> to turn everything off.</li>
          <li>Your number is never shown to anyone and never used to market to you. See our <a className="font-medium text-forest-700 underline" href={`${org.mainUrl}/privacy`}>privacy policy</a>.</li>
        </ul>
      </Card>
    </AppShell>
  );
}
