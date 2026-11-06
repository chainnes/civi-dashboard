// Workers AI helpers for Pages Functions. No keys. The binding is env.AI from wrangler.toml.
// @cf/meta/llama-3.1-8b-instruct was removed from the catalog on 2026-05-30.
// @cf/zai-org/glm-4.7-flash (docs, checked 2026-11-06) is a reasoning model.
// chat_template_kwargs.enable_thinking defaults to true. Its sync output is a chat
// completion: choices[].message.content is string | null, and finish_reason may be
// "length". A non-reasoning model such as @cf/meta/llama-3.2-3b-instruct still
// returns the older { response: string } shape. env.AI.run usually returns the
// inner object; the REST API wraps that object in { success, result }.

export const MODEL = "@cf/zai-org/glm-4.7-flash";

export function aiInput(messages, max) {
  return {
    messages,
    max_tokens: max,
    max_completion_tokens: max,
    temperature: 0.2,
    // Default true spends the token cap on reasoning and leaves content null.
    chat_template_kwargs: { enable_thinking: false }
  };
}

export function unwrap(out) {
  let cur = out;
  for (let i = 0; i < 3; i++) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) break;
    const inner = cur.result;
    if (inner && typeof inner === "object" && (cur.success === true || inner.choices || inner.response != null || inner.output_text)) {
      cur = inner;
      continue;
    }
    break;
  }
  return cur;
}

function parts(content) {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(p => (typeof p === "string" ? p : (p && (p.text || p.content)) || "")).join("");
  if (typeof content === "object") return content.text || content.content || "";
  return "";
}

export function stripThink(s) {
  return String(s == null ? "" : s).replace(/<think>[\s\S]*?<\/think>/gi, " ").replace(/[ \t]+\n/g, "\n").trim();
}

export function aiText(out) {
  if (out == null) return "";
  if (typeof out === "string") return stripThink(out);
  const body = unwrap(out);
  if (typeof body === "string") return stripThink(body);
  if (!body || typeof body !== "object") return "";
  if (typeof body.output_text === "string" && body.output_text.trim()) return stripThink(body.output_text);
  if (typeof body.response === "string") return stripThink(body.response);
  if (body.response && typeof body.response === "object") {
    const nested = parts(body.response.content) || body.response.text || "";
    if (nested.trim()) return stripThink(nested);
  }
  const choices = body.choices;
  const choice = Array.isArray(choices) ? choices[0] : (choices && typeof choices === "object" ? choices : null);
  const msg = choice && (choice.message || choice.delta);
  if (msg) {
    const text = parts(msg.content);
    if (text.trim()) return stripThink(text);
  }
  return "";
}

export function finishReason(out) {
  const body = unwrap(out);
  if (!body || typeof body !== "object") return "";
  const choices = body.choices;
  const choice = Array.isArray(choices) ? choices[0] : choices;
  return (choice && choice.finish_reason) || "";
}

export function hasResult(out) {
  if (out == null || out === "") return false;
  if (typeof out === "string") return out.trim().length > 0;
  return typeof out === "object";
}

const STOP = new Set("the a an of to for and or in on is it this that with your you we our from into only reply keyword keywords user question about how what paano ang mga ng sa".split(" "));

export function keywordsFrom(text) {
  const clean = stripThink(text).replace(/```[\s\S]*?```/g, " ");
  const parts = clean.split(/[,|\n;]+/).map(s => s.replace(/^[^a-z0-9]+/i, "").replace(/[^a-z0-9 +.#/-]+$/i, "").trim().toLowerCase()).filter(s => s.length >= 2 && s.length < 40 && !STOP.has(s));
  const uniq = [...new Set(parts)];
  if (uniq.length) return uniq.slice(0, 6);
  const words = (clean.toLowerCase().match(/[a-z][a-z0-9-]{1,24}/g) || []).filter(w => !STOP.has(w));
  return [...new Set(words)].slice(0, 6);
}

// ai_empty only when the run returned nothing. A completion object with null content is ai_no_text.
export function aiMiss(out) {
  if (!hasResult(out)) return { error: "ai_empty" };
  if (aiText(out)) return null;
  const reason = finishReason(out);
  return reason ? { error: "ai_no_text", finish_reason: reason } : { error: "ai_no_text" };
}
