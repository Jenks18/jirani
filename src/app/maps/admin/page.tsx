"use client";
import { useState } from "react";
import AppShell from "../_components/AppShell";
import { Card } from "../_components/ui";

type Field = { name: string; label: string; type?: "text" | "number" | "textarea" | "checkbox" | "select"; options?: string[]; required?: boolean; hint?: string };

const FORMS: { resource: string; title: string; fields: Field[] }[] = [
  {
    resource: "areas", title: "Add area",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "level", label: "Level", type: "select", options: ["country", "county", "subcounty", "neighborhood"], required: true },
      { name: "parent_slug", label: "Parent area slug", hint: "e.g. nairobi" },
      { name: "center_lat", label: "Center latitude", type: "number", required: true },
      { name: "center_lng", label: "Center longitude", type: "number", required: true },
      { name: "radius_m", label: "Radius (metres)", type: "number", required: true },
    ],
  },
  {
    resource: "communities", title: "Add community",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "area_slug", label: "Area slug", hint: "e.g. westlands" },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    resource: "news", title: "Post news",
    fields: [
      { name: "title", label: "Title", required: true },
      { name: "body", label: "Message", type: "textarea", required: true },
      { name: "area_slug", label: "Area slug (optional)" },
      { name: "author", label: "Author", hint: "Defaults to The 6.25 Movement" },
      { name: "pinned", label: "Pin to top", type: "checkbox" },
    ],
  },
];

function AdminForm({ form, token }: { form: (typeof FORMS)[number]; token: string }) {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const body: Record<string, unknown> = {};
    for (const f of form.fields) {
      const v = values[f.name];
      if (v === undefined || v === "") continue;
      body[f.name] = f.type === "number" ? Number(v) : v;
    }
    try {
      const res = await fetch(`/api/admin/${form.resource}`, { method: "POST", headers: { "content-type": "application/json", "x-admin-token": token }, body: JSON.stringify(body) });
      const data = await res.json();
      setMsg(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: data.error ?? "Failed" });
      if (res.ok) setValues({});
    } catch { setMsg({ ok: false, text: "Network error" }); }
    setBusy(false);
  }

  const input = "mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm";
  return (
    <Card>
      <h2 className="font-serif text-xl  text-ink">{form.title}</h2>
      <form onSubmit={submit} className="mt-4 space-y-3">
        {form.fields.map((f) => (
          <label key={f.name} className="block text-sm font-medium text-ink-2">
            {f.type === "checkbox" ? (
              <span className="flex items-center gap-2"><input type="checkbox" checked={Boolean(values[f.name])} onChange={(e) => setValues({ ...values, [f.name]: e.target.checked })} /> {f.label}</span>
            ) : (
              <>
                {f.label}{f.required && " *"}
                {f.type === "textarea" ? (
                  <textarea className={input} rows={4} value={String(values[f.name] ?? "")} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} required={f.required} />
                ) : f.type === "select" ? (
                  <select className={input} value={String(values[f.name] ?? "")} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} required={f.required}>
                    <option value="">Select…</option>{f.options?.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className={input} type={f.type === "number" ? "number" : "text"} step="any" value={String(values[f.name] ?? "")} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} required={f.required} placeholder={f.hint} />
                )}
              </>
            )}
          </label>
        ))}
        <button disabled={busy || !token} className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-forest-700" : "text-clay-600"}`}>{msg.text}</p>}
      </form>
    </Card>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  return (
    <AppShell title="Admin" subtitle="Staff only. Create areas, communities and news. The token is kept in this tab's memory and never stored.">
      <Card className="mb-6">
        <label className="block text-sm font-medium text-ink-2">Admin token
          <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm" />
        </label>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">{FORMS.map((f) => <AdminForm key={f.resource} form={f} token={token} />)}</div>
    </AppShell>
  );
}
