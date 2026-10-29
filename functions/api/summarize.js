// Cloudflare Pages Function: POST /api/summarize  {headlines: string[]}
// Uses Workers AI via the `AI` binding (configured in the Pages dashboard / wrangler.toml). No keys in frontend.
export async function onRequestPost({ request, env }) {
  const { headlines = [] } = await request.json().catch(() => ({}));
  const list = headlines.slice(0, 25).map(h => "- " + String(h).slice(0, 200)).join("\n");
  if (!env.AI) return Response.json({ summary: null, fallback: true }, { status: 503 });
  const out = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { messages: [
    { role: "system", content: "You summarise Philippine news headlines for a civic dashboard. 3 short sentences, neutral, no invented numbers." },
    { role: "user", content: list }] });
  return Response.json({ summary: out.response });
}
