import type { Metadata } from "next";
import { Button, Eyebrow } from "./_components/ui";
import { org, whatsappLink } from "@/config/org";

export const metadata: Metadata = {
  title: { absolute: "Jirani — community safety, by neighbors" },
  description:
    "Report a safety incident over WhatsApp in under a minute and see what's happening on a live community map. No app to download. A Majirani Wetu program of The 6.25 Movement.",
  alternates: { canonical: "/" },
};

const steps = [
  { n: "01", title: "Message Jirani", body: "Say hello on WhatsApp and tell us what you saw, in English or Kiswahili. Share a location pin if you can." },
  { n: "02", title: "Confirm your report", body: "Jirani asks a couple of friendly questions, then reads the report back so you can confirm before anything is recorded." },
  { n: "03", title: "See it on the map", body: "Your neighbors see a short, anonymized summary on the live map. Your phone number is never shown." },
];

const principles = [
  { title: "Your number stays private", body: "Reports on the map show what and where, never who. Your phone number is never published, and you can ask us to delete your data at any time." },
  { title: "Facts, not accusations", body: "Jirani strips names, plate numbers and other identifying details from summaries, and asks people to describe incidents, not accuse individuals." },
  { title: "Built for real phones", body: "Everything runs inside WhatsApp. No app to install and no password to remember. It works on the phone you already have." },
];

const faqs = [
  { q: "Is Jirani free?", a: "Yes. Jirani is free to use. Standard WhatsApp data charges from your mobile provider may apply." },
  { q: "Is Jirani an emergency service?", a: "No. Jirani does not dispatch police, ambulance or fire services and reports are not monitored in real time. In an emergency in Kenya, call 999 or 112." },
  { q: "Who can see my report?", a: "Anyone can see the anonymized report on the public map: the type of incident, a general location and the time. Your phone number and the original messages are never published." },
  { q: "How do I delete my data?", a: "Sign in to your account and choose Delete my account, or email us. We remove your conversation history and unlink your phone number from your reports." },
  { q: "Who runs Jirani?", a: "Jirani is a Majirani Wetu (“our neighbors”) program of The 6.25 Movement, a U.S.-based nonprofit founded by young Kenyans in the Washington D.C., Maryland and Virginia area." },
];

function PhoneMock() {
  return (
    <div className="relative mx-auto w-full max-w-[340px]" aria-hidden="true">
      <div className="relative rounded-[2.2rem] border border-black/10 bg-white p-3 shadow-lift">
        <div className="overflow-hidden rounded-[1.7rem] bg-[#ece5d8]">
          <div className="flex items-center gap-3 bg-forest-800 px-4 py-3 text-white">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/15 font-serif text-lg">J</div>
            <div className="leading-tight">
              <div className="text-sm font-medium">Jirani</div>
              <div className="text-[11px] text-white/70">online</div>
            </div>
          </div>
          <div className="space-y-2.5 px-3 py-4 text-[13px] leading-snug">
            <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-tr-md bg-[#d9f2d5] px-3.5 py-2.5 text-ink">
              Jambo, there was a phone snatching near the Kikuyu stage around 6pm
            </div>
            <div className="w-fit max-w-[84%] rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-ink shadow-sm">
              Pole sana. Are you safe? Could you share the exact spot with a location pin?
            </div>
            <div className="ml-auto w-fit max-w-[60%] rounded-2xl rounded-tr-md bg-[#d9f2d5] px-3.5 py-2.5 text-ink">📍 Location shared</div>
            <div className="w-fit max-w-[88%] rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-ink shadow-sm">
              Let me confirm: <strong>phone theft</strong> near Kikuyu stage at about 6pm. Shall I add this to the community map?
            </div>
            <div className="ml-auto w-fit rounded-2xl rounded-tr-md bg-[#d9f2d5] px-3.5 py-2.5 text-ink">Yes</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: org.legalName, url: org.parentUrl, email: org.email, sameAs: [org.social.x, org.social.instagram] },
      { "@type": "WebSite", name: "Jirani", url: org.mainUrl, publisher: { "@type": "Organization", name: org.legalName } },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="bg-forest-800 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:px-12 pb-20 pt-16 md:grid-cols-[1.4fr_1fr] md:pb-28 md:pt-24">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-white/80">A Majirani Wetu program of The 6.25 Movement</p>
            <h1 className="mt-5 font-serif text-[clamp(4rem,11vw,9.5rem)] leading-[0.9]">
              Safer streets start with neighbors who speak up.
            </h1>
            <p className="mt-8 max-w-xl text-xl leading-relaxed text-white/90">
              Report an incident over WhatsApp in under a minute and see what&apos;s happening around you on a live community map.
              No app to download and no password to remember.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button href={whatsappLink} variant="light" external>
                Message Jirani on WhatsApp
              </Button>
              <Button href={org.mapsUrl} variant="outline-light" external>
                Explore the live map
              </Button>
            </div>
          </div>
          <PhoneMock />
        </div>
      </section>

      <section id="how" className="bg-paper py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-3 max-w-3xl font-serif text-5xl text-forest-800 md:text-7xl">
            From &ldquo;I saw something&rdquo; to a shared picture of your neighborhood.
          </h2>
          <ol className="mt-14 grid gap-10 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="border-t-2 border-ink pt-6">
                <span className="font-serif text-5xl text-clay-600">{s.n}</span>
                <h3 className="mt-3 font-serif text-3xl text-ink">{s.title}</h3>
                <p className="mt-3 text-[17px] leading-relaxed text-ink">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-clay-600 py-24 text-white">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Eyebrow light>Designed with care</Eyebrow>
          <h2 className="mt-3 max-w-4xl font-serif text-5xl md:text-7xl">
            Community safety only works when people feel safe taking part.
          </h2>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {principles.map((p) => (
              <div key={p.title} className="border-t-2 border-white pt-6">
                <h3 className="font-serif text-3xl">{p.title}</h3>
                <p className="mt-3 text-[17px] leading-relaxed text-white/90">{p.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Button href="/safety" variant="outline-light">
              Read our safety principles
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-black py-24 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 md:px-12 md:grid-cols-2 md:items-center">
          <div>
            <Eyebrow light>Safety net</Eyebrow>
            <h2 className="mt-3 font-serif text-5xl md:text-7xl">The people who love you, one message away.</h2>
            <p className="mt-6 text-xl leading-relaxed text-white/85">
              Add trusted contacts on WhatsApp. Set a check-in when you travel home late. If you don&apos;t reply, or you send an
              SOS, they hear from us with your last shared location. Contacts always opt in, and you control how it behaves.
            </p>
            <div className="mt-8">
              <Button href="/safety-net" variant="light">
                How the safety net works
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-white/20 p-8 font-mono text-sm leading-relaxed text-white/85">
            <p><span className="text-white">you</span> &nbsp;ADD Mum +254712345678</p>
            <p className="mt-2"><span className="text-white">you</span> &nbsp;CHECKIN 30</p>
            <p className="mt-2 text-white/50">… 30 min, no reply …</p>
            <p className="mt-2"><span className="text-clay-500">Mum</span> ⚠️ Wanjiru missed a safety check-in. Last known location: map link</p>
          </div>
        </div>
      </section>

      <section className="bg-paper py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 md:px-12 md:grid-cols-2 md:items-start">
          <div>
            <Eyebrow>Majirani Wetu</Eyebrow>
            <h2 className="mt-3 font-serif text-5xl text-forest-800 md:text-7xl">&ldquo;Our neighbors.&rdquo; Built by the community.</h2>
            <p className="mt-6 text-[17px] leading-relaxed text-ink">
              Majirani Wetu is The 6.25 Movement&apos;s program for practical, community-led tools. Jirani is its first: a way for
              residents to look out for each other with the technology already in their pockets.
            </p>
            <p className="mt-4 text-[17px] leading-relaxed text-ink">
              The 6.25 Movement is a U.S.-based nonprofit founded in January 2025 by young Kenyans in the DMV, advocating for the
              rights, dignity and wellbeing of Kenyans and the African diaspora.
            </p>
            <div className="mt-8">
              <Button href="/about" variant="secondary">
                About the program
              </Button>
            </div>
          </div>
          <div className="rounded-lg border-2 border-clay-600 p-8">
            <h3 className="font-serif text-4xl text-clay-600">Jirani is not an emergency service</h3>
            <p className="mt-3 text-[17px] leading-relaxed text-ink">
              Reports are community information, not a dispatch. If someone is in danger, contact emergency services first.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {["999", "112"].map((n) => (
                <div key={n} className="rounded-lg bg-clay-600 px-5 py-5 text-center text-white">
                  <div className="font-serif text-6xl leading-none">{n}</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-white/85">Kenya emergency</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-paper py-24">
        <div className="mx-auto max-w-4xl px-5">
          <Eyebrow>Questions</Eyebrow>
          <h2 className="mt-3 font-serif text-5xl text-forest-800 md:text-7xl">Good to know</h2>
          <div className="mt-10 divide-y divide-ink/20 border-y border-ink/20">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-serif text-3xl text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink font-sans text-lg transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[17px] leading-relaxed text-ink">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-forest-800 py-20 text-white">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <h2 className="font-serif text-6xl md:text-8xl">Say hello to your Jirani.</h2>
          <p className="mx-auto mt-4 max-w-xl text-xl text-white/90">
            Open WhatsApp, send &ldquo;Hello&rdquo; to {org.whatsappDisplay}, and you&apos;re set.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href={whatsappLink} variant="light" external>
              Message Jirani
            </Button>
            <Button href={org.mapsUrl} variant="outline-light" external>
              View the map
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
