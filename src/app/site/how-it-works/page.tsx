import type { Metadata } from "next";
import { Prose } from "../_components/ui";
import { org } from "@/config/org";

export const metadata: Metadata = {
  title: "How Jirani works",
  description: "How a WhatsApp message becomes an anonymized report on the Jirani community map.",
  alternates: { canonical: "/how-it-works" },
};

export default function Page() {
  return (
    <Prose
      title="How Jirani works"
      intro="Jirani turns a WhatsApp conversation into a short, anonymized report on a shared map, in a few careful steps."
    >
      <h2>1. You start a chat</h2>
      <p>
        Send a message to Jirani on WhatsApp at <strong>{org.whatsappDisplay}</strong>. You can write in English, Kiswahili or a mix
        of both. You don&apos;t need an account or to install anything.
      </p>

      <h2>2. Jirani asks what it needs</h2>
      <p>
        Jirani is an AI assistant. It asks about what happened, where, and roughly when. If you can, share a WhatsApp location pin,
        which is the most accurate way to place a report. You can also just describe the area.
      </p>

      <h2>3. You confirm before anything is recorded</h2>
      <p>
        Before a report is created, Jirani reads it back to you. Nothing is added to the map until you say yes.
      </p>

      <h2>4. An anonymized summary appears on the map</h2>
      <p>The public map shows only:</p>
      <ul>
        <li>the type of incident and its severity,</li>
        <li>a short summary written to remove names, phone numbers, plate numbers and exact addresses,</li>
        <li>the general location and the approximate time.</li>
      </ul>
      <p>
        It never shows your phone number, your WhatsApp name, or what you typed word for word. Read more in our{" "}
        <a href="/privacy">privacy policy</a>.
      </p>

      <h2>What Jirani is not</h2>
      <ul>
        <li>It is not an emergency service. In Kenya, call 999 or 112.</li>
        <li>It does not verify reports. Treat the map as community information, not confirmed fact.</li>
        <li>It is not a way to identify or accuse individuals. See our <a href="/safety">safety principles</a>.</li>
      </ul>
    </Prose>
  );
}
