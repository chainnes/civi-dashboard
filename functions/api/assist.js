// POST /api/assist {mode:"directory"|"academy"|"help", q}
// Workers AI via the wrangler.toml binding env.AI. No keys, nothing stored.
// Directory and academy stay keyword-only. Help returns a short FAQ answer.
import { MODEL, aiInput, aiText, aiMiss, keywordsFrom } from "../_ai.js";

const aiFail = (miss, err) => {
  const code = (miss && miss.error) || "ai_run_failed";
  const detail = err && (err.message || String(err));
  console.error("civi-assist", code, miss && miss.finish_reason || "", detail ? String(detail).slice(0, 240) : "");
  const body = { error: code, message: "Chatbot unavailable", fallback: true };
  if (miss && miss.finish_reason) body.finish_reason = miss.finish_reason;
  return Response.json(body, { status: 503 });
};

export async function onRequestPost({ request, env }) {
  if (!env.AI || typeof env.AI.run !== "function") return aiFail({ error: "ai_unbound" });
  const b = await request.json().catch(() => ({}));
  const q = String(b.q || "").slice(0, 300);
  if (!q) return Response.json({ error: "bad_input" }, { status: 400 });
  try {
    if (b.mode === "directory" || b.mode === "academy") {
      const sys = b.mode === "academy"
        ? "You map a Filipino learner's question (English/Tagalog/Bisaya) to 3-6 short English search keywords for a library of how-to guides (government IDs, benefits, loans, earning online, budgeting, health, nutrition, farming, eco, waste, disaster prep). Reply ONLY with comma-separated keywords. Example: 'paano mag-ipon' -> savings, budget, MP2, pag-ibig."
        : "You map a Filipino user's need (English/Tagalog/Bisaya) to 3-6 short English search keywords for a directory of Philippine government agencies, hotlines, NGOs and services. Reply ONLY with comma-separated keywords. Example: 'nawalan ng trabaho' -> unemployment, DOLE, SSS, jobs.";
      const out = await env.AI.run(MODEL, aiInput([{ role: "system", content: sys }, { role: "user", content: q }], 256));
      const miss = aiMiss(out);
      if (miss) return aiFail(miss);
      const keywords = keywordsFrom(aiText(out));
      if (!keywords.length) return aiFail({ error: "ai_no_text", finish_reason: "unparsed" });
      return Response.json({ keywords });
    }
    const ctx = String(b.ctx || "").slice(0, 6000);
    const out = await env.AI.run(MODEL, aiInput([
      { role: "system", content: "You are Civi's help assistant. Answer in the user's language, in 2-4 short sentences, ONLY from this FAQ about the Civi app. If the answer is not in it, say you don't know and suggest the Help page or privacy@chainnes.com. Never give legal, medical or financial advice.\n\nFAQ:\n" + ctx },
      { role: "user", content: q }
    ], 512));
    const miss = aiMiss(out);
    if (miss) return aiFail(miss);
    return Response.json({ answer: aiText(out).slice(0, 1200), ai: true });
  } catch (err) {
    return aiFail(null, err);
  }
}
