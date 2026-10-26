export interface Env {
  AI_ORIGIN: string;
  WEB_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const incoming = new URL(request.url);
    const aiPath =
      incoming.pathname.startsWith("/v1/") || incoming.pathname === "/health";
    const origin = aiPath ? env.AI_ORIGIN : env.WEB_ORIGIN;
    const target = new URL(incoming.pathname + incoming.search, origin);

    const headers = new Headers(request.headers);
    headers.set("x-civi-edge", "1");

    return fetch(target.toString(), {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    });
  },
};
