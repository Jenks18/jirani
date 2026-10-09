import type { Metadata } from "next";
import { Prose } from "../_components/ui";
import { org } from "@/config/org";

export const metadata: Metadata = {
  title: "Safety & responsible use",
  description: "Jirani's safety principles: emergencies, accuracy, privacy and responsible reporting.",
  alternates: { canonical: "/safety" },
};

export default function Page() {
  return (
    <Prose
      title="Safety & responsible use"
      intro="A community safety tool can also cause harm if it is misused. These are the principles we build and moderate by, and what we ask of everyone who reports."
    >
      <h2>In an emergency, call first</h2>
      <p>
        Jirani is not monitored in real time and does not contact police, ambulance or fire services. If anyone is in danger in
        Kenya, call <strong>999</strong> or <strong>112</strong> before you report to Jirani.
      </p>

      <h2>Describe what happened, not who you think did it</h2>
      <p>
        Please do not include names, photos, or accusations about specific people. Rumors and misidentification can put innocent
        people at risk. Jirani&apos;s AI removes personal details from public summaries, but the best protection is not sharing them.
      </p>

      <h2>Report only what you witnessed or experienced</h2>
      <p>
        Honest, first-hand reports keep the map useful. Deliberately false, malicious or retaliatory reports are prohibited and
        will be removed, and repeat abuse will be blocked from the service.
      </p>

      <h2>Reports are unverified</h2>
      <p>
        Anyone can submit a report, and we do not independently verify them. Use the map as one source of awareness alongside your
        own judgment and local information.
      </p>

      <h2>Your privacy comes first</h2>
      <ul>
        <li>Your phone number is never shown on the map.</li>
        <li>You confirm every report before it is created.</li>
        <li>Pinned locations are placed on the map, so only share a pin for the place where the incident happened, not your home.</li>
        <li>You can ask us to delete your data at any time (<a href="/data-deletion">how</a>).</li>
      </ul>

      <h2>Removal requests and corrections</h2>
      <p>
        If a report on the map is inaccurate, identifies someone, or puts someone at risk, email{" "}
        <a href={`mailto:${org.email}`}>{org.email}</a> with the incident and approximate time, and we will review it promptly.
      </p>
    </Prose>
  );
}
