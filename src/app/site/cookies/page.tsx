import type { Metadata } from "next";
import { Prose } from "../_components/ui";
import { org } from "@/config/org";

export const metadata: Metadata = {
  title: "Cookie policy",
  description: "What cookies and browser storage Jirani uses. We use no advertising or tracking cookies.",
  alternates: { canonical: "/cookies" },
};

export default function Page() {
  return (
    <Prose
      title="Cookie policy"
      intro="Short version: we don't use advertising or tracking cookies, and we don't run analytics that follow you around the web."
      updated={org.legalUpdated}
    >
      <h2>What we store in your browser</h2>
      <table>
        <thead>
          <tr><th>Name</th><th>Where</th><th>Purpose</th><th>Duration</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>jirani-notice-ack</code> (local storage)</td>
            <td>This site and the live map</td>
            <td>Remembers that you dismissed the notice about cookies and storage. Strictly necessary for the notice to behave properly.</td>
            <td>Until you clear site data</td>
          </tr>
          <tr>
            <td><code>jirani_session</code> (cookie)</td>
            <td>maps.the625movement.com, only after you sign in</td>
            <td>Keeps you signed in to your account. It is HttpOnly and signed, and it is strictly necessary for the account to work.</td>
            <td>30 days, or until you sign out</td>
          </tr>
        </tbody>
      </table>

      <h2>Third-party technologies on the live map</h2>
      <p>
        The live map at <a href={org.mapsUrl}>{org.mapsUrl.replace("https://", "")}</a> uses a third-party mapping provider to display maps. When the map loads, your browser contacts the provider&apos;s servers, which receive your IP address and technical details such as
        your browser type, and the provider&apos;s map library may store identifiers and diagnostic data in your browser&apos;s local
        storage. This is necessary to deliver the map and is governed by the provider&apos;s own privacy policy. This marketing site does not load maps.
      </p>
      <p>
        If you tap a link to WhatsApp, you leave our site and WhatsApp&apos;s own policies apply.
      </p>

      <h2>What we do not use</h2>
      <ul>
        <li>advertising or retargeting cookies,</li>
        <li>cross-site tracking or fingerprinting,</li>
        <li>third-party analytics or social media pixels.</li>
      </ul>
      <p>If that changes, we will update this policy and ask for your consent first where the law requires it.</p>

      <h2>Your choices</h2>
      <p>
        You can clear or block cookies and site data in your browser settings. Blocking map storage may affect how the map
        loads. Because we do not track you across sites, we treat Global Privacy Control and Do Not Track signals as already
        honored.
      </p>

      <h2>Questions</h2>
      <p>
        <a href={`mailto:${org.email}`}>{org.email}</a> · See also our <a href="/privacy">privacy policy</a>.
      </p>
    </Prose>
  );
}
