import type { Metadata } from "next";
import { Prose } from "../_components/ui";
import { org } from "@/config/org";

export const metadata: Metadata = {
  title: "Accessibility",
  description: "Our commitment to making Jirani usable by everyone.",
  alternates: { canonical: "/accessibility" },
};

export default function Page() {
  return (
    <Prose
      title="Accessibility"
      intro="Jirani is for everyone in a community. We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA."
      updated={org.legalUpdated}
    >
      <h2>What we do</h2>
      <ul>
        <li>Semantic HTML, keyboard-navigable pages, visible focus states and a skip-to-content link.</li>
        <li>Text and interface colors chosen for strong contrast, and layouts that scale to large text and small screens.</li>
        <li>Respect for reduced-motion settings.</li>
        <li>A messaging-first service that works on basic smartphones using WhatsApp, in English and Kiswahili.</li>
      </ul>

      <h2>Known limitations</h2>
      <p>
        The interactive map is a visual tool and may be difficult to use with a screen reader or keyboard alone. The list of recent
        reports beside the map provides the same information in text form. We are working to improve map accessibility.
      </p>

      <h2>Feedback</h2>
      <p>
        If something is hard to use, tell us at <a href={`mailto:${org.email}?subject=Accessibility`}>{org.email}</a> and we will
        try to fix it or offer an alternative.
      </p>
    </Prose>
  );
}
