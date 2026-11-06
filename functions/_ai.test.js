import test from "node:test";
import assert from "node:assert/strict";
import { aiText, aiMiss, keywordsFrom, finishReason } from "./_ai.js";

test("legacy llama-style response string", () => {
  const out = { response: "nbi, clearance, police" };
  assert.equal(aiText(out), "nbi, clearance, police");
  assert.equal(aiMiss(out), null);
  assert.deepEqual(keywordsFrom(aiText(out)), ["nbi", "clearance", "police"]);
});

test("glm chat completion content string", () => {
  const out = { id: "x", choices: [{ index: 0, message: { role: "assistant", content: "nbi, clearance, id" }, finish_reason: "stop" }], usage: { completion_tokens: 8 } };
  assert.equal(aiText(out), "nbi, clearance, id");
  assert.equal(finishReason(out), "stop");
  assert.equal(aiMiss(out), null);
});

test("content array of text parts", () => {
  const out = { choices: [{ message: { content: [{ type: "text", text: "nbi" }, { type: "text", text: ", clearance" }] }, finish_reason: "stop" }] };
  assert.equal(aiText(out), "nbi, clearance");
});

test("REST envelope result.choices", () => {
  const out = { success: true, result: { choices: [{ message: { content: "sss, unemployment" }, finish_reason: "stop" }] } };
  assert.equal(aiText(out), "sss, unemployment");
});

test("null content with a real completion is not ai_empty", () => {
  const out = { id: "x", choices: [{ message: { role: "assistant", content: null }, finish_reason: "length" }], usage: { completion_tokens: 80, completion_tokens_details: { reasoning_tokens: 80 } } };
  assert.equal(aiText(out), "");
  assert.deepEqual(aiMiss(out), { error: "ai_no_text", finish_reason: "length" });
});

test("missing run is ai_empty", () => {
  assert.deepEqual(aiMiss(null), { error: "ai_empty" });
  assert.deepEqual(aiMiss(""), { error: "ai_empty" });
});

test("thinking tags are stripped before keywords", () => {
  const out = { choices: [{ message: { content: "<think>The user wants an NBI clearance guide and I should not dump this paragraph as a keyword.</think>\nnbi, clearance, psa" }, finish_reason: "stop" }] };
  assert.equal(aiText(out), "nbi, clearance, psa");
  assert.deepEqual(keywordsFrom(aiText(out)), ["nbi", "clearance", "psa"]);
});

test("a prose result still yields short keywords", () => {
  const text = "Search the directory for NBI clearance and the National Bureau of Investigation.";
  const words = keywordsFrom(text);
  assert.ok(words.includes("nbi"));
  assert.ok(words.includes("clearance"));
  assert.ok(words.length <= 6);
});
