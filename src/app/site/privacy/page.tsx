import type { Metadata } from "next";
import { Prose } from "../_components/ui";
import { org } from "@/config/org";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How The 6.25 Movement collects, uses, shares and protects personal data in Jirani.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return (
    <Prose
      title="Privacy policy"
      intro="This policy explains what personal data Jirani collects when you use our WhatsApp service and website, why, who we share it with, and the choices you have."
      updated={org.legalUpdated}
    >
      <h2>1. Who we are</h2>
      <p>
        Jirani is a program of the Majirani Wetu initiative of <strong>{org.legalName}</strong>, a nonprofit organization based in
        the United States (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We are the data controller for personal data processed through
        Jirani.
        {org.ein && <> Our U.S. EIN is {org.ein}.</>}
        {org.address && <> Our address is {org.address}.</>}
      </p>
      <p>
        Contact for privacy matters: <a href={`mailto:${org.email}`}>{org.email}</a>.
      </p>

      <h2>2. What we collect</h2>
      <table>
        <thead>
          <tr><th>Data</th><th>When</th><th>Why</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>WhatsApp phone number</strong></td>
            <td>When you message Jirani</td>
            <td>To reply to you, keep your conversation coherent, prevent abuse, and link your report to you so you can ask for deletion.</td>
          </tr>
          <tr>
            <td><strong>Message content</strong></td>
            <td>What you type or say to Jirani</td>
            <td>To understand your report, ask follow-up questions and create a summary.</td>
          </tr>
          <tr>
            <td><strong>Location</strong></td>
            <td>If you share a WhatsApp location pin or describe a place</td>
            <td>To place your report on the map.</td>
          </tr>
          <tr>
            <td><strong>Report details</strong></td>
            <td>After you confirm a report</td>
            <td>Incident type, severity, summary, place, coordinates and time, shown anonymously on the public map.</td>
          </tr>
          <tr>
            <td><strong>Safety net data</strong></td>
            <td>If you use trusted contacts, check-ins or SOS</td>
            <td>Your trusted contacts&apos; names and phone numbers (which you provide), your name if you set one, check-in times and outcomes, SOS events and the location you shared, and your settings, so the feature can alert the right people.</td>
          </tr>
          <tr>
            <td><strong>Alerts, community and account data</strong></td>
            <td>If you subscribe to alerts or join a community</td>
            <td>Your phone number acts as your account. We store your alert areas or the pin you gave, your communities and your role in them, and your most recent shared location (to place alerts and SOS updates).</td>
          </tr>
          <tr>
            <td><strong>Technical data</strong></td>
            <td>When you visit the website or map</td>
            <td>IP address, browser and device type, and request logs, for security, reliability and debugging.</td>
          </tr>
          <tr>
            <td><strong>Emails you send us</strong></td>
            <td>If you contact us</td>
            <td>To respond to you and handle requests.</td>
          </tr>
        </tbody>
      </table>
      <p>
        We do not use passwords or email accounts: your verified WhatsApp number identifies you. Jirani currently reads text messages and shared locations only; it does not
        process photos, voice notes or documents. We do not knowingly collect sensitive categories of data, so please do not include
        health, religion, ethnicity or similar details about anyone in your reports.
      </p>

      <h2>3a. People you add as trusted contacts</h2>
      <p>
        If you add someone as a trusted contact, you give us their name and phone number. We contact them once to ask whether they
        agree, and we only message them about you if they reply YES. They can reply STOP at any time and we will remove them and stop
        messaging them. If you are a trusted contact and want to know what we hold, or want your number removed, email us at the
        address above. Please only add people who would expect to hear from you.
      </p>

      <h2>3. What is public</h2>
      <p>
        Confirmed reports appear on a public map at <a href={org.mapsUrl}>{org.mapsUrl.replace("https://", "")}</a>. The public
        view shows the incident type, severity, an AI-written summary that is designed to remove names, phone numbers, plate numbers
        and exact addresses, the place, the map coordinates and the approximate time. If you share a location pin, the point is
        shown approximately (rounded to roughly 100 metres), so please only share a pin for where the incident happened, not your home.
      </p>
      <p>
        <strong>We never publish your phone number, your WhatsApp profile name, or your original messages.</strong> AI-generated
        summaries can occasionally miss identifying details; if you spot one, tell us and we will remove it.
      </p>

      <h2>4. How we use data, and our legal bases</h2>
      <ul>
        <li><strong>Safety net, alerts and communities</strong> (message your trusted contacts when you ask for help or miss a check-in, send area alerts you subscribed to, and run community features). Basis: your consent, and the contacts&apos; own acceptance.</li>
        <li><strong>Provide Jirani</strong> (receive your report, converse, create the map entry). Basis: your consent, given by messaging us and confirming the report, and the performance of the service you request.</li>
        <li><strong>Security, abuse prevention and rate limiting.</strong> Basis: our legitimate interests in protecting the service and its users.</li>
        <li><strong>Improve reliability and quality</strong> using logs and aggregated, anonymized report data. Basis: legitimate interests.</li>
        <li><strong>Respond to your requests and comply with the law.</strong> Basis: legal obligation and legitimate interests.</li>
      </ul>
      <p>You can withdraw consent at any time by stopping messaging us and asking us to delete your data. We do not sell your personal data, use it for advertising, or make decisions about you with legal or similarly significant effects.</p>

      <h2>5. Who we share data with</h2>
      <p>We use a small number of service providers (processors) who process data on our behalf:</p>
      <table>
        <thead>
          <tr><th>Type of provider</th><th>Purpose</th><th>Data</th></tr>
        </thead>
        <tbody>
          <tr><td>Messaging platform</td><td>Delivers messages between you and Jirani</td><td>Phone number, messages, location pins</td></tr>
          <tr><td>AI service provider</td><td>Helps understand and summarize reports</td><td>Message text and report details</td></tr>
          <tr><td>Cloud database and hosting providers</td><td>Store and serve conversations, reports and the website</td><td>Conversations, reports, request logs, IP addresses</td></tr>
          <tr><td>Mapping provider</td><td>Map display and place-name lookup</td><td>Place names; visitors&apos; IP addresses when loading maps</td></tr>
        </tbody>
      </table>
      <p>
        WhatsApp is operated by a third party and is governed by its own terms and privacy policy. We may also disclose data when
        required by law or to protect people from serious harm, and to successors if our programs are transferred to another
        nonprofit. We will not share your phone number with other users, advertisers or data brokers.
      </p>

      <h2>6. International transfers</h2>
      <p>
        We are based in the United States, and our providers process data in the United States and other countries, which may have
        different data protection laws than Kenya or your home country. Where required, we rely on appropriate safeguards such as
        contractual protections with our providers.
      </p>

      <h2>7. Retention</h2>
      <p>
        We keep personal data only for as long as it is needed for the purposes in this policy, to resolve disputes and to meet
        legal obligations. Anonymized public reports may be kept for community safety and trend analysis until they are no longer
        useful or you ask us to remove one that concerns you. You can ask us to delete your personal data at any time (see
        section 9).
      </p>

      <h2>8. Security</h2>
      <p>
        We use encryption in transit, restricted database access, signature verification on incoming WhatsApp messages, rate
        limiting and least-privilege access to protect your data. No system is perfectly secure; if a breach affects your rights we
        will notify you and the relevant authorities as the law requires.
      </p>

      <h2>9. Your rights</h2>
      <p>
        Depending on where you live, including under Kenya&apos;s Data Protection Act, 2019, the EU/UK GDPR and U.S. state privacy
        laws, you may have the right to:
      </p>
      <ul>
        <li>be informed about, and access, the personal data we hold about you;</li>
        <li>correct inaccurate data;</li>
        <li>have your data deleted;</li>
        <li>object to or restrict certain processing, and withdraw consent;</li>
        <li>receive your data in a portable format;</li>
        <li>not be discriminated against for exercising these rights.</li>
      </ul>
      <p>
        To exercise any right, email <a href={`mailto:${org.email}`}>{org.email}</a> or use our <a href="/data-deletion">data deletion page</a>.
        We will respond within 30 days, or sooner where the law requires. We may need to verify your identity, usually by contacting
        you on the WhatsApp number concerned. You may also complain to your data protection authority, for example the Office of the
        Data Protection Commissioner in Kenya.
      </p>

      <h2>10. Children</h2>
      <p>
        Jirani is intended for adults aged 18 and over. We do not knowingly collect data from children. If you believe a child has
        used Jirani, contact us and we will delete their data.
      </p>

      <h2>11. Cookies</h2>
      <p>
        We use no advertising or tracking cookies. See our <a href="/cookies">cookie policy</a>.
      </p>

      <h2>12. Changes</h2>
      <p>
        We may update this policy as Jirani evolves. We will post the new version here with a new &ldquo;last updated&rdquo; date and,
        for material changes, make reasonable efforts to notify users.
      </p>
    </Prose>
  );
}
