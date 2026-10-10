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
  {
    n: "01",
    title: "Message Jirani",
    body: "Say hello on WhatsApp and tell us what you saw, in English or Kiswahili. Share a location pin if you can.",
  },
  {
    n: "02",
    title: "Confirm your report",
    body: "Jirani asks a couple of friendly questions, then reads the report back so you can confirm before anything is recorded.",
  },
  {
    n: "03",
    title: "See it on the map",
    body: "Your neighbors see a short, anonymized summary on the live map. Your phone number is never shown.",
  },
];

const principles = [
  {
    title: "Your number stays private",
    body: "Reports on the map show what and where, never who. Your phone number is never published, and you can ask us to delete your data at any time.",
  },
  {
    title: "Facts, not accusations",
    body: "Jirani strips names, plate numbers and other identifying details from summaries, and asks people to describe incidents, not accuse individuals.",
  },
  {
    title: "Built for real phones",
    body: "Everything runs inside WhatsApp. No app to install and no password to remember. It works on the phone you already have.",
  },
];

const faqs = [
  {
    q: "Is Jirani free?",
    a: "Yes. Jirani is free to use. Standard WhatsApp data charges from your mobile provider may apply.",
  },
  {
    q: "Is Jirani an emergency service?",
    a: "No. Jirani does not dispatch police, ambulance or fire services and reports are not monitored in real time. In an emergency in Kenya, call 999 or 112.",
  },
  {
    q: "Who can see my report?",
    a: "Anyone can see the anonymized report on the public map: the type of incident, a general location and the time. Your phone number and the original messages are never published.",
  },
  {
    q: "How do I delete my data?",
    a: "Email us at any time, or follow the steps on our data deletion page. We will remove your conversation history and unlink your phone number from your reports.",
  },
  {
    q: "Who runs Jirani?",
    a: "Jirani is a Majirani Wetu (“our neighbors”) program of The 6.25 Movement, a U.S.-based nonprofit founded by young Kenyans in the Washington D.C., Maryland and Virginia area.",
  },
];

function PhoneMock() {
  return (
    <div className="relative mx-auto w-full max-w-[340px]" aria-hidden="true">
      <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-forest-100 via-sun-100 to-paper-2 blur-2xl" />
      <div className="relative rounded-[2.4rem] border border-ink/10 bg-card p-3 shadow-lift">
        <div className="overflow-hidden rounded-[1.8rem] bg-[#ece5d8]">
          <div className="flex items-center gap-3 bg-forest-800 px-4 py-3 text-white">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/15 font-serif text-sm ">J</div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Jirani</div>
              <div className="text-[11px] text-white/70">online</div>
            </div>
          </div>
          <div className="space-y-2.5 px-3 py-4 text-[13px] leading-snug">
            <div className="ml-auto w-fit max-w-[80%] rounded-lg rounded-tr-md bg-[#d9f2d5] px-3.5 py-2.5 text-ink">
              Jambo, there was a phone snatching near the Kikuyu stage around 6pm
            </div>
            <div className="w-fit max-w-[84%] rounded-lg rounded-tl-md bg-white px-3.5 py-2.5 text-ink shadow-sm">
              Pole sana. Are you safe? Could you share the exact spot with a location pin?
            </div>
            <div className="ml-auto w-fit max-w-[60%] rounded-lg rounded-tr-md bg-[#d9f2d5] px-3.5 py-2.5 text-ink">📍 Location shared</div>
            <div className="w-fit max-w-[88%] rounded-lg rounded-tl-md bg-white px-3.5 py-2.5 text-ink shadow-sm">
              Let me confirm: <strong>phone theft</strong> near Kikuyu stage at about 6pm. Shall I add this to the community map?
            </div>
            <div className="ml-auto w-fit rounded-lg rounded-tr-md bg-[#d9f2d5] px-3.5 py-2.5 text-ink">Yes</div>
          </div>
        </div>
        <div className="absolute -bottom-5 -right-3 w-44 rounded-lg border border-line bg-card p-3 shadow-lift sm:-right-8">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-clay-600" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Just now</span>
          </div>
          <p className="mt-1.5 text-[13px] font-medium leading-snug text-ink">Phone theft reported near Kikuyu around 6pm</p>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: org.legalName,
        url: org.parentUrl,
        email: org.email,
        sameAs: [org.social.x, org.social.instagram],
      },
      {
        "@type": "WebSite",
        name: "Jirani",
        url: org.mainUrl,
        publisher: { "@type": "Organization", name: org.legalName },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-paper">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #d9d2c0 1px, transparent 0)", backgroundSize: "28px 28px" }}
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-5 pb-24 pt-16 md:grid-cols-[1.15fr_1fr] md:pt-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-forest-700/20 bg-forest-50 px-4 py-1.5 text-xs font-semibold text-forest-800">
              <span className="h-1.5 w-1.5 rounded-full bg-forest-600" /> A Majirani Wetu program of The 6.25 Movement
            </span>
            <h1 className="mt-6 font-serif text-[2.6rem]  leading-[1.05] tracking-tight text-ink md:text-6xl">
              Safer streets start with <span className="italic text-forest-700">neighbors</span> who speak up.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
              Report an incident over WhatsApp in under a minute and see what&apos;s happening around you on a live community map.
              No app to download and no password to remember.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button href={whatsappLink} external>
                Message Jirani on WhatsApp
              </Button>
              <Button href={org.mapsUrl} variant="secondary" external>
                Explore the live map →
              </Button>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-2 text-sm text-ink-3">
              <li>✓ Free to use</li>
              <li>✓ English &amp; Kiswahili</li>
              <li>✓ Phone numbers never public</li>
            </ul>
          </div>
          <PhoneMock />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-card py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="max-w-2xl">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 font-serif text-3xl  tracking-tight text-ink md:text-4xl">
              From &ldquo;I saw something&rdquo; to a shared picture of your neighborhood.
            </h2>
          </div>
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="rounded-lg border border-line bg-paper p-8">
                <span className="font-serif text-3xl  text-forest-600">{s.n}</span>
                <h3 className="mt-5 text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-2">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Principles */}
      <section className="bg-forest-900 py-24 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <div className="max-w-2xl">
            <Eyebrow light>Designed with care</Eyebrow>
            <h2 className="mt-3 font-serif text-3xl  tracking-tight md:text-4xl">
              Community safety only works when people feel safe taking part.
            </h2>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-lg bg-white/10 md:grid-cols-3">
            {principles.map((p) => (
              <div key={p.title} className="bg-forest-900 p-8">
                <h3 className="text-lg font-semibold">{p.title}</h3>
                <p className="mt-3 leading-relaxed text-forest-100/80">{p.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Button href="/safety" variant="ghost-light">
              Read our safety principles
            </Button>
          </div>
        </div>
      </section>

      {/* Safety net */}
      <section className="bg-card py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-2 md:items-center">
          <div>
            <Eyebrow>Safety net</Eyebrow>
            <h2 className="mt-3 font-serif text-3xl  tracking-tight text-ink md:text-4xl">
              The people who love you, one message away.
            </h2>
            <p className="mt-5 leading-relaxed text-ink-2">
              Add trusted contacts on WhatsApp. Set a check-in when you travel home late. If you don&apos;t reply, or you send an SOS,
              they hear from us with your last shared location. Contacts always opt in, and you control how it behaves.
            </p>
            <div className="mt-8">
              <Button href="/safety-net">How the safety net works</Button>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-paper p-8 font-mono text-sm leading-relaxed text-ink-2">
            <p><span className="text-forest-700">you</span> ADD Mum +254712345678</p>
            <p className="mt-2"><span className="text-forest-700">you</span> CHECKIN 30</p>
            <p className="mt-2 text-ink-3">… 30 min, no reply …</p>
            <p className="mt-2"><span className="text-clay-600">Mum</span> ⚠️ Wanjiru missed a safety check-in. Last known location: maps link</p>
          </div>
        </div>
      </section>

      {/* Program */}
      <section className="bg-paper py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-2 md:items-center">
          <div>
            <Eyebrow>Majirani Wetu</Eyebrow>
            <h2 className="mt-3 font-serif text-3xl  tracking-tight text-ink md:text-4xl">
              &ldquo;Our neighbors.&rdquo; A program for community, by community.
            </h2>
            <p className="mt-5 leading-relaxed text-ink-2">
              Majirani Wetu is The 6.25 Movement&apos;s program for practical, community-led tools. Jirani is its first: a way for
              residents to look out for each other with the technology already in their pockets.
            </p>
            <p className="mt-4 leading-relaxed text-ink-2">
              The 6.25 Movement is a U.S.-based nonprofit founded in January 2025 by young Kenyans in the DMV, advocating for the
              rights, dignity and wellbeing of Kenyans and the African diaspora.
            </p>
            <div className="mt-8 flex gap-3">
              <Button href="/about" variant="secondary">
                About the program
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-card p-8 shadow-soft">
            <h3 className="font-serif text-xl  text-ink">Jirani is not an emergency service</h3>
            <p className="mt-3 leading-relaxed text-ink-2">
              Reports are community information, not a dispatch. If someone is in danger, contact emergency services first.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {["999", "112"].map((n) => (
                <div key={n} className="rounded-lg bg-clay-50 px-5 py-4 text-center">
                  <div className="font-serif text-3xl  text-clay-700">{n}</div>
                  <div className="text-xs text-clay-700/80">Kenya emergency</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-card py-24">
        <div className="mx-auto max-w-3xl px-5">
          <Eyebrow>Questions</Eyebrow>
          <h2 className="mt-3 font-serif text-3xl  tracking-tight text-ink md:text-4xl">Good to know</h2>
          <div className="mt-10 divide-y divide-line border-y border-line">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-ink-3 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-paper py-20">
        <div className="mx-auto max-w-4xl rounded-[2rem] bg-forest-800 px-8 py-16 text-center text-white shadow-lift">
          <h2 className="font-serif text-3xl  tracking-tight md:text-4xl">Say hello to your Jirani.</h2>
          <p className="mx-auto mt-4 max-w-xl text-forest-100/85">
            Open WhatsApp, send &ldquo;Hello&rdquo; to {org.whatsappDisplay}, and you&apos;re set.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={whatsappLink}
              className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-[15px] font-semibold text-forest-900 transition hover:bg-forest-50"
            >
              Message Jirani
            </a>
            <Button href={org.mapsUrl} variant="ghost-light" external>
              View the map
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
