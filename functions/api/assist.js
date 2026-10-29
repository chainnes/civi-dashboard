// POST /api/assist {mode:"directory"|"academy"|"help", q}
// Workers AI via the wrangler.toml binding env.AI. No keys, nothing stored.
// @cf/meta/llama-3.1-8b-instruct was deprecated on 2026-05-30 (Workers AI catalog).
// A thrown run used to be swallowed as the same 503 as a missing binding.
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
  console.error("civi-assist", code, detail ? String(detail).slice(0, 400) : "");
  return Response.json({ error: code, message: "Chatbot unavailable", fallback: true }, { status: 503 });
};
export async function onRequestPost({ request, env }) {
  if (!env.AI || typeof env.AI.run !== "function") return aiFail("ai_unbound");
  const b = await request.json().catch(() => ({})); const q = String(b.q || "").slice(0, 300); if (!q) return Response.json({ error: "bad_input" }, { status: 400 });
  try {
    if (b.mode === "directory" || b.mode === "academy") {
      const sys = b.mode === "academy" ? "You map a Filipino learner's question (English/Tagalog/Bisaya) to 3-6 short English search keywords for a library of how-to guides (government IDs, benefits, loans, earning online, budgeting, health, nutrition, farming, eco, waste, disaster prep). Reply ONLY with comma-separated keywords. Example: 'paano mag-ipon' -> savings, budget, MP2, pag-ibig." : "You map a Filipino user's need (English/Tagalog/Bisaya) to 3-6 short English search keywords for a directory of Philippine government agencies, hotlines, NGOs and services. Reply ONLY with comma-separated keywords. Example: 'nawalan ng trabaho' -> unemployment, DOLE, SSS, jobs.";
      const out = await env.AI.run(MODEL, { max_tokens: 80, max_completion_tokens: 80, messages: [{ role: "system", content: sys }, { role: "user", content: q }] });
      const keywords = aiText(out).split(/[,|\n]/).map(s => s.replace(/^[^a-z0-9]+/i, "").trim().toLowerCase()).filter(s => s && s.length < 40).slice(0, 6);
      if (!keywords.length) return aiFail("ai_empty");
      return Response.json({ keywords });
    }
    const ctx = String(b.ctx || "").slice(0, 6000);
    const out = await env.AI.run(MODEL, { max_tokens: 280, max_completion_tokens: 280, messages: [
      { role: "system", content: "You are Civi's help assistant. Answer in the user's language, in 2-4 short sentences, ONLY from this FAQ about the Civi app. If the answer is not in it, say you don't know and suggest the Help page or privacy@chainnes.com. Never give legal, medical or financial advice.\n\nFAQ:\n" + ctx },
      { role: "user", content: q }] });
    const answer = aiText(out).slice(0, 1200);
    if (!answer) return aiFail("ai_empty");
    return Response.json({ answer, ai: true });
  } catch (err) { return aiFail("ai_run_failed", err); }
}
