import { gather } from "./intel.mjs";

const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=300",
};

async function refresh(env) {
  const news = await gather();
  await env.NEWS.put("latest", JSON.stringify(news));
  return news;
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(refresh(env));
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { ...HEADERS, "access-control-allow-methods": "GET" } });
    }
    if (url.pathname !== "/news") return new Response("Civi news", { status: 200 });
    let body = await env.NEWS.get("latest");
    if (!body) body = JSON.stringify(await refresh(env));
    return new Response(body, { headers: HEADERS });
  },
};
