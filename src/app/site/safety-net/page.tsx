import type { Metadata } from "next";
import { Prose } from "../_components/ui";
import { org, whatsappLink } from "@/config/org";

export const metadata: Metadata = {
  title: "Safety net: trusted contacts, check-ins and SOS",
  description: "Add trusted contacts on WhatsApp, set safety check-ins, and send an SOS. No app, no account, and your contacts always opt in.",
  alternates: { canonical: "/safety-net" },
};

export default function Page() {
  return (
    <Prose
      title="Safety net"
      intro="Let the people who care about you know when you need them. Add trusted contacts, set a safety check-in, or send an SOS, all inside WhatsApp."
      updated={org.legalUpdated}
    >
      <p>
        <a href={whatsappLink}>Start on WhatsApp</a>, then send <strong>MENU</strong> to see every command.
      </p>

      <h2>How it works</h2>
      <ol>
        <li>
          <strong>Add a trusted contact.</strong> Send <code>ADD Mum +254712345678</code>. You can have up to five. Send{" "}
          <code>NAME your name</code> first so they know who is asking.
        </li>
        <li>
          <strong>They opt in.</strong> We message your contact once and they must reply <strong>YES</strong>. Until they do, they
          receive nothing about you. They can reply <strong>STOP</strong> at any time to leave.
        </li>
        <li>
          <strong>Use it when it matters.</strong>
          <ul>
            <li><code>CHECKIN 30</code>: we check on you in 30 minutes. Reply <strong>SAFE</strong> and nothing happens. If you don&apos;t reply, we nudge you, then alert your contacts after a grace period you control.</li>
            <li><code>SOS</code>: alerts your contacts immediately with your last shared location. Keep sharing pins and they&apos;ll get updates. Reply <strong>SAFE</strong> to tell them you are OK.</li>
          </ul>
        </li>
      </ol>

      <h2>You decide how it behaves</h2>
      <p>Send <code>SETTINGS</code> to adjust:</p>
      <ul>
        <li><strong>Grace time</strong>: how long we wait after a missed check-in before alerting (1–120 minutes).</li>
        <li><strong>Location sharing</strong>: turn sharing your last known location with contacts on or off.</li>
        <li><strong>Default check-in length</strong> and an optional <strong>SOS note</strong> included in alerts.</li>
      </ul>

      <h2>What your contacts see</h2>
      <p>
        Your name (or the last three digits of your number if you haven&apos;t set one), the alert type, and, if you allow it, a map
        link to your last shared location. They never see your messages or your reports.
      </p>

      <h2>Your privacy</h2>
      <ul>
        <li>Contacts are only messaged after they accept. We never message them for marketing.</li>
        <li>We store your number, your contacts&apos; names and numbers, check-in times and SOS events so the feature works. See the <a href="/privacy">privacy policy</a>.</li>
        <li>Delete everything any time: <a href="/data-deletion">delete my data</a>.</li>
      </ul>

      <h2>Limits you should know</h2>
      <ul>
        <li><strong>This is not an emergency service.</strong> In Kenya call 999 or 112 first. Your contacts are people, not responders.</li>
        <li>Delivery depends on WhatsApp and phone connectivity. Check-in reminders run about every five minutes, so timing can vary slightly.</li>
        <li>False SOS alerts waste your contacts&apos; time and can be blocked under our <a href="/terms">terms</a>.</li>
      </ul>
    </Prose>
  );
}
