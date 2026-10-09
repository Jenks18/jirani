"use client";
import { FaWhatsapp } from "react-icons/fa";
import AppShell from "../_components/AppShell";
import { useApi } from "../_components/useApi";
import { Card, ErrorNote, Skeleton } from "../_components/ui";
import { org } from "@/config/org";

interface C { id: string; name: string; slug: string; description: string | null; members: number; area: { name?: string } | null }

export default function CommunitiesPage() {
  const { data, error, loading } = useApi<{ communities: C[] }>("/api/communities");
  return (
    <AppShell title="Communities" subtitle="Neighborhood groups that share local news and alerts. Join with one WhatsApp message, and leave any time.">
      {error && <ErrorNote />}
      {loading && <Skeleton rows={3} />}
      {data && data.communities.length === 0 && <Card><p className="text-ink-2">No communities yet. If you coordinate a neighborhood group and want to set one up, email <a className="font-medium text-forest-700 underline" href={`mailto:${org.email}`}>{org.email}</a>.</p></Card>}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.communities.map((c) => (
          <Card key={c.id}>
            <h2 className="font-serif text-xl font-semibold text-ink">{c.name}</h2>
            <p className="mt-1 text-xs text-ink-3">{c.area?.name ?? "All areas"} · {c.members} {c.members === 1 ? "member" : "members"}</p>
            {c.description && <p className="mt-3 text-sm leading-relaxed text-ink-2">{c.description}</p>}
            <a href={`https://wa.me/${org.whatsappNumber}?text=${encodeURIComponent(`JOIN ${c.slug}`)}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-900">
              <FaWhatsapp /> Join on WhatsApp
            </a>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
