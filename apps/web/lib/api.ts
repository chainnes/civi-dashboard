const API = process.env.NEXT_PUBLIC_AI_API_URL ?? "http://localhost:8000";

export type Insight = {
  id: string;
  headline: string | null;
  summary: string | null;
  sentiment: string | null;
  sentiment_score: number | null;
  categories: string[] | null;
  status: string;
  created_at: string;
  actions: { type?: string; label?: string }[] | null;
};

export type Metrics = {
  posts: number;
  insights: number;
  complete: number;
  sentiment: Record<string, number>;
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Civi AI ${path} failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function fetchInsights() {
  return getJson<{ items: Insight[] }>("/v1/insights");
}

export function fetchMetrics() {
  return getJson<Metrics>("/v1/metrics");
}
