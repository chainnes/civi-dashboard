import { fetchInsights, fetchMetrics, type Insight } from "@/lib/api";

function sentimentTone(sentiment: string | null) {
  switch (sentiment) {
    case "positive":
      return "text-neon-400";
    case "negative":
      return "text-red-300";
    case "mixed":
      return "text-gold-200";
    default:
      return "text-canopy-50/70";
  }
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <article className="rounded-2xl border border-canopy-700/50 bg-loam-800/80 p-5 shadow-glow">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-medium text-gold-200">{insight.headline ?? "Untitled insight"}</h2>
        <span className={`text-xs uppercase tracking-[0.2em] ${sentimentTone(insight.sentiment)}`}>
          {insight.sentiment ?? "unscored"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-canopy-50/80">{insight.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(insight.categories ?? []).map((category) => (
          <span
            key={category}
            className="rounded-full border border-canopy-500/40 px-2 py-0.5 text-[11px] uppercase tracking-wider text-neon-400"
          >
            {category}
          </span>
        ))}
      </div>
    </article>
  );
}

export default async function DashboardPage() {
  let insights: Insight[] = [];
  let metrics = { posts: 0, insights: 0, complete: 0, sentiment: {} as Record<string, number> };
  let error: string | null = null;

  try {
    const [insightPayload, metricPayload] = await Promise.all([fetchInsights(), fetchMetrics()]);
    insights = insightPayload.items;
    metrics = metricPayload;
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Unable to reach the AI service";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-3 border-b border-canopy-700/40 pb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-neon-400">Chainnes · Civi</p>
        <h1 className="text-4xl font-semibold tracking-tight text-canopy-50 md:text-5xl">
          Community Intelligence Hub
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-canopy-50/70">
          What&apos;s happening near you, across the Philippines, in one place. This screen is an internal
          preview of later insight data. The public site is the static landing page.
        </p>
      </header>

      {error ? (
        <p className="rounded-xl border border-gold-400/30 bg-loam-800/70 px-4 py-3 text-sm text-gold-200">
          {error}. Counts stay hidden until the AI service responds.
        </p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Posts ingested", value: metrics.posts },
            { label: "Insights", value: metrics.insights },
            { label: "Complete", value: metrics.complete },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-canopy-700/40 bg-loam-800/60 px-5 py-6"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-canopy-50/50">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-gold-200">{card.value}</p>
            </div>
          ))}
        </section>
      )}

      {!error && insights.length === 0 ? (
        <p className="text-sm text-canopy-50/80">No insights yet.</p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </section>
    </main>
  );
}
