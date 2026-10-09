import type { Metadata } from "next";
import { Prose } from "../_components/ui";
import { org } from "@/config/org";

export const metadata: Metadata = {
  title: "About",
  description: "Jirani is a Majirani Wetu program of The 6.25 Movement, a U.S.-based nonprofit.",
  alternates: { canonical: "/about" },
};

export default function Page() {
  return (
    <Prose
      title="About Jirani and Majirani Wetu"
      intro="Jirani (Kiswahili for “neighbor”) is a community safety tool built by The 6.25 Movement as part of its Majirani Wetu program."
    >
      <h2>The 6.25 Movement</h2>
      <p>
        {org.legalName} is a U.S.-based nonprofit founded in January 2025 by young Kenyans in the Washington D.C., Maryland and
        Virginia area. The name honors June 25, 2024, and those who sacrificed for justice and accountability in Kenya. Its mission
        is to advocate for and raise awareness of the rights, dignity and wellbeing of Kenyans and people of African descent in the
        United States and around the world, rooted in inclusive governance, justice, shared prosperity and collective freedom.
      </p>
      <p>
        Learn more at <a href={org.parentUrl}>{org.parentUrl.replace("https://", "")}</a>.
      </p>

      <h2>Majirani Wetu</h2>
      <p>
        <strong>Majirani Wetu</strong> means &ldquo;our neighbors.&rdquo; It is the program under which The 6.25 Movement builds
        practical, community-led tools. Jirani is the program&apos;s first product.
      </p>

      <h2>What Jirani does</h2>
      <p>
        Jirani lets residents report safety incidents over WhatsApp and view them on a live, anonymized community map. It is designed
        to be accessible on any phone, in English and Kiswahili, and to protect the privacy of the people who take part.
      </p>

      <h2>Contact</h2>
      <p>
        Questions, partnerships or press: <a href={`mailto:${org.email}`}>{org.email}</a>.
      </p>
    </Prose>
  );
}
