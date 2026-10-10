"use client";
import { useCallback, useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import AppShell from "../_components/AppShell";
import { Card, Skeleton } from "../_components/ui";
import { org } from "@/config/org";
import { timeAgo } from "@/lib/reports";

interface Account {
  member: { id: string; phone: string; displayName: string | null };
  profile: { graceMinutes: number; shareLocation: boolean; defaultCheckinMinutes: number; sosMessage: string | null };
  contacts: { id: string; name: string; phone: string; status: string }[];
  subscriptions: { id: string; label: string; minSeverity: number }[];
  communities: { mine: { slug: string; name: string; role: string }[]; all: { slug: string; name: string; description: string | null }[] };
  areas: { slug: string; name: string }[];
  checkin: { dueAt: string; status: string } | null;
  sosActive: boolean;
}

const field = "mt-1 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink";
const primary = "rounded-full bg-forest-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-forest-900 disabled:opacity-50";
const quiet = "rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-paper-2";
const STATUS: Record<string, string> = { accepted: "Accepted", pending: "Waiting for reply", declined: "Declined" };

async function call(url: string, method: string, data?: unknown): Promise<{ ok: boolean; error?: string; data?: unknown }> {
  try {
    const res = await fetch(url, { method, headers: data ? { "content-type": "application/json" } : undefined, body: data ? JSON.stringify(data) : undefined });
    const out = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data: out } : { ok: false, error: out.error ?? "Something went wrong" };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await call("/api/account/login", "POST", { phone, code });
    setBusy(false);
    if (r.ok) onDone();
    else setError(r.error ?? "");
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <h2 className="font-serif text-2xl text-ink">1. Get a code on WhatsApp</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          There are no passwords. Message <strong>LOGIN</strong> to Jirani and we reply with a 6-digit code. This proves the number is yours.
        </p>
        <a
          href={`https://wa.me/${org.whatsappNumber}?text=LOGIN`}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-forest-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-forest-900"
        >
          <FaWhatsapp /> Send LOGIN on WhatsApp
        </a>
      </Card>
      <Card>
        <h2 className="font-serif text-2xl text-ink">2. Enter your code</h2>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-ink-2">
            Your WhatsApp number
            <input className={field} inputMode="tel" autoComplete="tel" placeholder="+254712345678" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
          <label className="block text-sm font-medium text-ink-2">
            6-digit code
            <input className={field} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} required />
          </label>
          {error && (
            <p role="alert" className="text-sm text-clay-600">
              {error}
            </p>
          )}
          <button disabled={busy} className={primary}>
            {busy ? "Checking…" : "Sign in"}
          </button>
        </form>
      </Card>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="font-serif text-2xl text-ink">{title}</h2>
      {hint && <p className="mt-1 text-sm text-ink-3">{hint}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function Portal({ account, reload, onSignedOut }: { account: Account; reload: () => void; onSignedOut: () => void }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [name, setName] = useState(account.member.displayName ?? "");
  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [area, setArea] = useState("");
  const [minutes, setMinutes] = useState(account.profile.defaultCheckinMinutes);
  const [grace, setGrace] = useState(account.profile.graceMinutes);
  const [sosMsg, setSosMsg] = useState(account.profile.sosMessage ?? "");

  async function act(run: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    const r = await run();
    setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.error ?? "Failed" });
    if (r.ok) reload();
  }

  const joined = new Set(account.communities.mine.map((c) => c.slug));

  return (
    <div className="space-y-6">
      {msg && (
        <p role="status" className={`rounded-md border p-3 text-sm ${msg.ok ? "border-forest-700/30 bg-forest-50 text-forest-900" : "border-clay-500/30 bg-clay-50 text-clay-700"}`}>
          {msg.text}
        </p>
      )}

      <Section title="Profile" hint={`Signed in as ${account.member.phone}`}>
        <label className="block text-sm font-medium text-ink-2">
          Name shown to your trusted contacts
          <input className={field} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="mt-3 flex gap-3">
          <button className={primary} onClick={() => act(() => call("/api/account", "PATCH", { displayName: name }), "Name saved.")}>
            Save name
          </button>
          <button
            className={quiet}
            onClick={async () => {
              await call("/api/account/logout", "POST");
              onSignedOut();
            }}
          >
            Sign out
          </button>
        </div>
      </Section>

      <Section title="Safety check-in" hint="We nudge you when it is due, then alert your trusted contacts if you do not reply.">
        {account.sosActive && <p className="mb-3 rounded-md bg-clay-50 p-3 text-sm text-clay-700">An SOS is active. Mark yourself safe to tell your contacts.</p>}
        {account.checkin ? (
          <p className="mb-3 text-sm text-ink-2">
            Check-in due <strong>{timeAgo(account.checkin.dueAt)}</strong>.
          </p>
        ) : (
          <p className="mb-3 text-sm text-ink-3">No check-in is running.</p>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-ink-2">
            Check in after (minutes)
            <input className={`${field} w-32`} type="number" min={5} max={1440} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
          </label>
          <button className={primary} onClick={() => act(() => call("/api/account/checkin", "POST", { minutes }), "Check-in started.")}>
            Start check-in
          </button>
          <button className={quiet} onClick={() => act(() => call("/api/account/safe", "POST"), "Marked safe. Contacts were told if an SOS was active.")}>
            I am safe
          </button>
        </div>
      </Section>

      <Section title="Trusted contacts" hint="Up to 5 people. Each must accept on WhatsApp before they receive anything.">
        {account.contacts.length === 0 ? (
          <p className="mb-4 text-sm text-ink-3">No trusted contacts yet.</p>
        ) : (
          <ul className="mb-4 divide-y divide-line">
            {account.contacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <strong className="text-ink">{c.name}</strong> <span className="text-ink-3">{c.phone}</span>
                  <span className="ml-2 rounded-full bg-paper-2 px-2 py-0.5 text-xs text-ink-2">{STATUS[c.status] ?? c.status}</span>
                </span>
                <button className="text-sm font-medium text-clay-600 hover:underline" onClick={() => act(() => call(`/api/account/contacts?id=${c.id}`, "DELETE"), "Contact removed.")}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              const r = await call("/api/account/contacts", "POST", { name: cName, phone: cPhone });
              if (r.ok) { setCName(""); setCPhone(""); }
              return r;
            }, "Invitation sent. They must reply YES on WhatsApp.");
          }}
        >
          <label className="text-sm font-medium text-ink-2">Name<input className={field} value={cName} onChange={(e) => setCName(e.target.value)} required /></label>
          <label className="text-sm font-medium text-ink-2">WhatsApp number<input className={field} inputMode="tel" placeholder="+254712345678" value={cPhone} onChange={(e) => setCPhone(e.target.value)} required /></label>
          <button className={primary}>Invite</button>
        </form>
      </Section>

      <Section title="Safety settings">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink-2">
            Grace time after a missed check-in (minutes)
            <input className={field} type="number" min={1} max={120} value={grace} onChange={(e) => setGrace(Number(e.target.value))} />
          </label>
          <label className="text-sm font-medium text-ink-2">
            Note included in SOS alerts
            <input className={field} maxLength={140} value={sosMsg} onChange={(e) => setSosMsg(e.target.value)} />
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={account.profile.shareLocation} onChange={(e) => act(() => call("/api/account", "PATCH", { shareLocation: e.target.checked }), "Location sharing updated.")} />
          Share my last known location with trusted contacts in an SOS or missed check-in
        </label>
        <button className={`${primary} mt-4`} onClick={() => act(() => call("/api/account", "PATCH", { graceMinutes: grace, defaultCheckinMinutes: minutes, sosMessage: sosMsg || null }), "Settings saved.")}>
          Save settings
        </button>
      </Section>

      <Section title="Alerts" hint="WhatsApp messages about serious reports in the areas you pick.">
        {account.subscriptions.length === 0 ? (
          <p className="mb-4 text-sm text-ink-3">You have no alerts.</p>
        ) : (
          <ul className="mb-4 divide-y divide-line">
            {account.subscriptions.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                <span><strong className="text-ink">{s.label}</strong> <span className="text-ink-3">severity {s.minSeverity}+</span></span>
                <button className="font-medium text-clay-600 hover:underline" onClick={() => act(() => call(`/api/account/subscriptions?id=${s.id}`, "DELETE"), "Alert removed.")}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-ink-2">
            Add an area
            <select className={`${field} w-56`} value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="">Select…</option>
              {account.areas.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
            </select>
          </label>
          <button disabled={!area} className={primary} onClick={() => act(() => call("/api/account/subscriptions", "POST", { areaSlug: area }), "Alert added.")}>Add alert</button>
        </div>
      </Section>

      <Section title="Communities">
        {account.communities.all.length === 0 ? (
          <p className="text-sm text-ink-3">There are no communities yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {account.communities.all.map((c) => (
              <li key={c.slug} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span><strong className="text-ink">{c.name}</strong>{c.description && <span className="block text-ink-3">{c.description}</span>}</span>
                {joined.has(c.slug) ? (
                  <button className={quiet} onClick={() => act(() => call(`/api/account/communities?slug=${c.slug}`, "DELETE"), "You left the community.")}>Leave</button>
                ) : (
                  <button className={primary} onClick={() => act(() => call("/api/account/communities", "POST", { slug: c.slug }), "You joined the community.")}>Join</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Your data" hint="You control your information.">
        <div className="flex flex-wrap gap-3">
          <a className={quiet} href="/api/account/export">Download my data</a>
          <button
            className="rounded-full border border-clay-500/40 bg-white px-4 py-2 text-sm font-medium text-clay-600 hover:bg-clay-50"
            onClick={async () => {
              if (!window.confirm("Delete your account and all your data? This cannot be undone.")) return;
              const r = await call("/api/account", "DELETE", { confirm: true });
              if (r.ok) onSignedOut();
              else setMsg({ ok: false, text: r.error ?? "Failed" });
            }}
          >
            Delete my account
          </button>
        </div>
      </Section>
    </div>
  );
}

export default function AccountPage() {
  const [state, setState] = useState<"loading" | "out" | "in">("loading");
  const [account, setAccount] = useState<Account | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/account", { cache: "no-store" });
    if (res.ok) {
      setAccount(await res.json());
      setState("in");
    } else {
      setAccount(null);
      setState("out");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell title="My account" subtitle="Manage your safety net, alerts and communities. Your WhatsApp number is your account.">
      {state === "loading" && <Skeleton rows={3} />}
      {state === "out" && <SignIn onDone={load} />}
      {state === "in" && account && <Portal key={account.member.id} account={account} reload={load} onSignedOut={() => { setAccount(null); setState("out"); }} />}
    </AppShell>
  );
}
