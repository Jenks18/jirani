import type { Metadata } from "next";
import { Prose } from "../_components/ui";
import { org } from "@/config/org";

export const metadata: Metadata = {
  title: "Delete my data",
  description: "How to ask Jirani to delete your conversation history and unlink your phone number from your reports.",
  alternates: { canonical: "/data-deletion" },
};

export default function Page() {
  return (
    <Prose
      title="Delete my data"
      intro="You can ask us to delete your personal data at any time. It's free and you don't need to give a reason."
      updated={org.legalUpdated}
    >
      <h2>How to ask</h2>
      <ol>
        <li>
          Email <a href={`mailto:${org.email}?subject=Data%20deletion%20request`}>{org.email}</a> with the subject{" "}
          <strong>Data deletion request</strong>.
        </li>
        <li>Include the WhatsApp phone number you used to message Jirani, in international format (for example, +254…).</li>
        <li>
          If you want a specific report removed from the map, add roughly when and where it was, so we can find it.
        </li>
      </ol>
      <p>
        To make sure the request is really from you, we may send a short verification message to that WhatsApp number before we
        proceed.
      </p>

      <h2>What we delete</h2>
      <ul>
        <li>your conversation history with Jirani,</li>
        <li>the link between your phone number and any reports you made,</li>
        <li>any report you ask us to remove from the public map.</li>
      </ul>
      <p>
        Anonymized reports you did not ask us to remove may remain on the map, since they no longer identify you. We may keep a
        minimal record of your request as proof that we handled it, and anything we are legally required to keep.
      </p>

      <h2>How long it takes</h2>
      <p>We will confirm within 7 days and complete deletion within 30 days, sooner where the law requires.</p>

      <p>See our <a href="/privacy">privacy policy</a> for more on how we handle personal data.</p>
    </Prose>
  );
}
