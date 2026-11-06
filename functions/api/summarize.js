// Cloudflare Pages Function: POST /api/summarize  {headlines: string[]}
// Workers AI via wrangler.toml binding env.AI. No keys in the frontend.
import { MODEL, aiInput, aiText, aiMiss } from "../_ai.js";

const aiFail = (miss, err) => {
  const code = (miss && miss.error) || "ai_run_failed";
  const detail = err && (err.message || String(err));
  console.error("civi-summarize", code, miss && miss.finish_reason || "", detail ? String(detail).slice(0, 240) : "");
  const body = { error: code, message: "Chatbot unavailable", summary: null, fallback: true };
  if (miss && miss.finish_reason) body.finish_reason = miss.finish_reason;
  return Response.json(body, { status: 503 });
};

export async function onRequestPost({ request, env }) {
  const { headlines = [] } = await request.json().catch(() => ({}));
  const list = headlines.slice(0, 25).map(h => "- " + String(h).slice(0, 200)).join("\n");
  if (!list) return Response.json({ error: "bad_input" }, { status: 400 });
  if (!env.AI || typeof env.AI.run !== "function") return aiFail({ error: "ai_unbound" });
  try {
    const out = await env.AI.run(MODEL, aiInput([
      { role: "system", content: "You summarise Philippine news headlines for a civic dashboard. 3 short sentences, neutral, no invented numbers." },
      { role: "user", content: list }
    ], 400));
    const miss = aiMiss(out);
    if (miss) return aiFail(miss);
    return Response.json({ summary: aiText(out) });
  } catch (err) {
    return aiFail(null, err);
  }
}
