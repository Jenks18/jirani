import type { Metadata } from "next";
import { Prose } from "../_components/ui";
import { org } from "@/config/org";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms that apply when you use Jirani, a Majirani Wetu program of The 6.25 Movement.",
  alternates: { canonical: "/terms" },
};

export default function Page() {
  const law = org.incorporationState
    ? `the State of ${org.incorporationState} and applicable U.S. federal law`
    : "the U.S. state in which The 6.25 Movement is incorporated and applicable U.S. federal law";
  return (
    <Prose
      title="Terms of service"
      intro="By messaging Jirani or using this website or the live map, you agree to these terms. Please read them with our Privacy policy and Safety principles."
      updated={org.legalUpdated}
    >
      <h2>1. The service</h2>
      <p>
        Jirani is a community safety service operated by {org.legalName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) under its Majirani
        Wetu program. It allows people to submit safety reports over WhatsApp and view anonymized reports on a public map (the
        &ldquo;Service&rdquo;). Jirani is provided free of charge.
      </p>

      <h2>2. Not an emergency service</h2>
      <p>
        <strong>Jirani is not an emergency service and is not monitored in real time.</strong> We do not dispatch police, medical or
        fire services. In an emergency, contact your local emergency number (in Kenya, 999 or 112). Do not rely on Jirani for
        urgent help.
      </p>

      <h2>3. Eligibility</h2>
      <p>
        You must be at least 18 years old and able to form a binding agreement, and you must comply with WhatsApp&apos;s terms.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to use the Service to:</p>
      <ul>
        <li>submit false, misleading, malicious or retaliatory reports;</li>
        <li>name, identify, threaten, harass, defame or incite violence against any person or group;</li>
        <li>share personal information of others, or content that is unlawful, hateful, sexually explicit or exploits minors;</li>
        <li>spam, probe, scrape at scale, overload, reverse engineer or attempt to break or bypass the security of the Service;</li>
        <li>impersonate others or misrepresent your connection with any person or organization.</li>
      </ul>
      <p>We may remove reports, rate-limit, or block phone numbers that violate these terms, without notice where needed to protect people.</p>

      <h2>4a. Safety net</h2>
      <p>
        The safety net (trusted contacts, check-ins and SOS) is a convenience, not a guarantee. Alerts depend on WhatsApp, mobile
        networks and our scheduler, and may be delayed or fail. You may only add people who would reasonably expect to hear from
        you, and you must not use SOS or check-in features to harass, mislead or falsely alarm others. We may suspend access for
        misuse. Never rely on the safety net in place of emergency services.
      </p>

      <h2>5. Your reports</h2>
      <p>
        You retain ownership of what you submit. By confirming a report, you grant {org.legalName} a worldwide, non-exclusive,
        royalty-free license to process, summarize, anonymize, display publicly and analyze the report in aggregate for the purposes
        of operating and improving the Service and promoting community safety. You are responsible for the accuracy of your reports
        and confirm that you submit them in good faith.
      </p>

      <h2>6. Reports are unverified</h2>
      <p>
        Reports and AI-generated summaries are community-sourced and not verified by us, and may be incomplete, delayed or
        inaccurate. The map does not guarantee the safety or absence of danger in any place. Use your own judgment.
      </p>

      <h2>7. AI-assisted features</h2>
      <p>
        Jirani uses AI to converse with you and to draft summaries. AI can make mistakes. You are asked to confirm every report
        before it is created; please check it carefully.
      </p>

      <h2>8. Privacy</h2>
      <p>
        Our <a href="/privacy">Privacy policy</a> explains how we handle personal data and forms part of these terms.
      </p>

      <h2>9. Third-party services</h2>
      <p>
        The Service depends on third parties such as WhatsApp and our mapping, AI, database and hosting providers. Their terms and policies
        apply to your use of their services, and we are not responsible for them.
      </p>

      <h2>10. Intellectual property</h2>
      <p>
        The Jirani name, Majirani Wetu name, logos, site design and software are owned by or licensed to {org.legalName}. Nothing
        in these terms grants you rights to them except to use the Service as intended.
      </p>

      <h2>11. Availability and changes</h2>
      <p>
        We provide the Service on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis and may change, suspend or discontinue
        any part of it at any time. Messaging depends on WhatsApp and your mobile network.
      </p>

      <h2>12. Disclaimers and limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, we disclaim all warranties, express or implied, including fitness for a particular
        purpose and non-infringement, and we are not liable for any indirect, incidental, special, consequential or punitive
        damages, or for any loss arising from reliance on reports, inaccuracy, unavailability, or the acts of other users or third
        parties. Our total liability for any claim relating to the Service is limited to US$100. Nothing in these terms limits
        liability that cannot be limited by law, or any mandatory consumer rights you have where you live.
      </p>

      <h2>13. Indemnity</h2>
      <p>
        You agree to indemnify us against third-party claims arising from content you submit in breach of these terms, to the extent
        permitted by law.
      </p>

      <h2>14. Termination</h2>
      <p>
        You may stop using the Service at any time and ask us to delete your data. We may suspend or terminate access for breach of
        these terms or to protect people or the Service.
      </p>

      <h2>15. Governing law and disputes</h2>
      <p>
        These terms are governed by the laws of {law}, without regard to conflict-of-laws rules. Please contact us first at{" "}
        <a href={`mailto:${org.email}`}>{org.email}</a> so we can try to resolve any dispute informally. Disputes that cannot be
        resolved informally will be brought in the courts of that jurisdiction, except where mandatory law gives you the right to
        bring a claim in your home country.
      </p>

      <h2>16. Changes to these terms</h2>
      <p>
        We may update these terms. The version posted here, with its &ldquo;last updated&rdquo; date, applies. Continuing to use the
        Service after a change means you accept it.
      </p>

      <h2>17. Contact</h2>
      <p>
        <a href={`mailto:${org.email}`}>{org.email}</a>
      </p>
    </Prose>
  );
}
