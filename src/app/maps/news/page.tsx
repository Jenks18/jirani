"use client";
import AppShell from "../_components/AppShell";
import { useApi } from "../_components/useApi";
import { Card, ErrorNote, Skeleton } from "../_components/ui";
import { formatWhen } from "@/lib/reports";

interface Post {
  id: string; title: string; body: string; author: string | null; pinned: boolean; published_at: string;
  areas: { name: string } | null; communities: { name: string } | null;
}

export default function NewsPage() {
  const { data, error, loading } = useApi<{ posts: Post[] }>("/api/news");
  return (
    <AppShell title="News" subtitle="Safety updates and community notices from The 6.25 Movement.">
      {error && <ErrorNote />}
      {loading && <Skeleton rows={3} />}
      {data && data.posts.length === 0 && <Card><p className="text-ink-2">No updates yet. Check back soon, or message <strong>NEWS</strong> to Jirani on WhatsApp.</p></Card>}
      <div className="space-y-4">
        {data?.posts.map((p) => (
          <Card key={p.id}>
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
              {p.pinned && <span className="rounded-full bg-sun-100 px-2 py-0.5 font-semibold text-ink">Pinned</span>}
              {p.areas && <span className="rounded-full bg-forest-50 px-2 py-0.5 font-medium text-forest-800">{p.areas.name}</span>}
              {p.communities && <span className="rounded-full bg-paper-2 px-2 py-0.5 font-medium text-ink-2">{p.communities.name}</span>}
              <time dateTime={p.published_at}>{formatWhen(p.published_at)}</time>
            </div>
            <h2 className="mt-2 font-serif text-xl  text-ink">{p.title}</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-2">{p.body}</p>
            {p.author && <p className="mt-3 text-xs text-ink-3">— {p.author}</p>}
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
