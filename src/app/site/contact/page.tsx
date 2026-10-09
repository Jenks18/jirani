import type { Metadata } from "next";
import { Prose } from "../_components/ui";
import { org, whatsappLink } from "@/config/org";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact The 6.25 Movement about Jirani: support, privacy requests, press and partnerships.",
  alternates: { canonical: "/contact" },
};

export default function Page() {
  return (
    <Prose title="Contact us" intro="We read every message. For anything urgent about personal safety, call 999 or 112 first.">
      <table>
        <tbody>
          <tr>
            <td><strong>General, press, partnerships</strong></td>
            <td><a href={`mailto:${org.email}`}>{org.email}</a></td>
          </tr>
          <tr>
            <td><strong>Privacy &amp; data requests</strong></td>
            <td>
              <a href={`mailto:${org.email}?subject=Privacy%20request`}>{org.email}</a> (subject: “Privacy request”)
            </td>
          </tr>
          <tr>
            <td><strong>Report an incident</strong></td>
            <td><a href={whatsappLink}>WhatsApp {org.whatsappDisplay}</a></td>
          </tr>
          <tr>
            <td><strong>Follow</strong></td>
            <td>
              <a href={org.social.x}>X</a> · <a href={org.social.instagram}>Instagram</a>
            </td>
          </tr>
        </tbody>
      </table>
      {org.address && (
        <p>
          <strong>Mailing address:</strong> {org.address}
        </p>
      )}
      <p>We aim to reply within five business days.</p>
    </Prose>
  );
}
