// Cloudflare Pages Function: POST /api/summarize  {headlines: string[]}
// Workers AI via wrangler.toml binding env.AI. No keys in the frontend.
// llama-3.1-8b-instruct was deprecated 2026-05-30; use the current instruct model.
const MODEL = "@cf/zai-org/glm-4.7-flash";
const aiText = out => {
  if (!out) return "";
  if (typeof out === "string") return out;
  if (typeof out.response === "string") return out.response;
  const msg = out.choices && out.choices[0] && out.choices[0].message;
  if (!msg) return "";
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) return msg.content.map(p => (p && (p.text || p.content)) || "").join("");
  return "";
};
const aiFail = (code, err) => {
  const detail = err && (err.message || String(err));
  console.error("civi-summarize", code, detail ? String(detail).slice(0, 400) : "");
  return Response.json({ error: code, message: "Chatbot unavailable", summary: null, fallback: true }, { status: 503 });
};
export async function onRequestPost({ request, env }) {
  const { headlines = [] } = await request.json().catch(() => ({}));
  const list = headlines.slice(0, 25).map(h => "- " + String(h).slice(0, 200)).join("\n");
  if (!env.AI || typeof env.AI.run !== "function") return aiFail("ai_unbound");
  try {
    const out = await env.AI.run(MODEL, { max_tokens: 220, max_completion_tokens: 220, messages: [
      { role: "system", content: "You summarise Philippine news headlines for a civic dashboard. 3 short sentences, neutral, no invented numbers." },
      { role: "user", content: list }] });
    const summary = aiText(out);
    if (!summary) return aiFail("ai_empty");
    return Response.json({ summary });
  } catch (err) { return aiFail("ai_run_failed", err); }
}
