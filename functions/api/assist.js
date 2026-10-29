// POST /api/assist {mode:"directory"|"academy"|"help", q} -> optional Workers AI helper via the AI binding only (no keys anywhere).
// directory: returns {keywords:[...]} used to filter the client-side directory. help: returns {answer} from the FAQ context only.
// No data is stored. If AI is not bound, returns 503 and the browser uses its built-in keyword/FAQ matching.
const aiUnavailable = () => Response.json({ error: "chatbot_unavailable", message: "Chatbot unavailable", fallback: true }, { status: 503 });
export async function onRequestPost({ request, env }) {
  if (!env.AI) return aiUnavailable();
  const b = await request.json().catch(() => ({})); const q = String(b.q || "").slice(0, 300); if (!q) return Response.json({ error: "bad_input" }, { status: 400 });
  try {
    if (b.mode === "directory" || b.mode === "academy") {
      const sys = b.mode === "academy" ? "You map a Filipino learner's question (English/Tagalog/Bisaya) to 3-6 short English search keywords for a library of how-to guides (government IDs, benefits, loans, earning online, budgeting, health, nutrition, farming, eco, waste, disaster prep). Reply ONLY with comma-separated keywords. Example: 'paano mag-ipon' -> savings, budget, MP2, pag-ibig." : null;
      const out = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { max_tokens: 60, messages: [
        { role: "system", content: sys || "You map a Filipino user's need (English/Tagalog/Bisaya) to 3-6 short English search keywords for a directory of Philippine government agencies, hotlines, NGOs and services. Reply ONLY with comma-separated keywords. Example: 'nawalan ng trabaho' -> unemployment, DOLE, SSS, jobs." },
        { role: "user", content: q }] });
      return Response.json({ keywords: String(out.response || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean).slice(0, 6) });
    }
    const ctx = String(b.ctx || "").slice(0, 6000);
    const out = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { max_tokens: 220, messages: [
      { role: "system", content: "You are Civi's help assistant. Answer in the user's language, in 2-4 short sentences, ONLY from this FAQ about the Civi app. If the answer is not in it, say you don't know and suggest the Help page or privacy@chainnes.com. Never give legal, medical or financial advice.\n\nFAQ:\n" + ctx },
      { role: "user", content: q }] });
    return Response.json({ answer: String(out.response || "").slice(0, 1200), ai: true });
  } catch { return aiUnavailable(); }
}
