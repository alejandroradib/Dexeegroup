/** Reverse proxy: /rest/v1/* on the gateway -> PostgREST on 127.0.0.1:3001. */
import { request as httpRequest, type IncomingMessage, type ServerResponse } from "node:http";

import { POSTGREST_PORT } from "./config";
import { applyCors, sendJson } from "./http";

const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-connection",
]);

export function proxyToPostgrest(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  prefix: string,
): void {
  const path = url.pathname.slice(prefix.length) || "/";
  const headers: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined && !HOP_BY_HOP.has(key)) headers[key] = value;
  }
  headers.host = `127.0.0.1:${POSTGREST_PORT}`;

  const upstream = httpRequest(
    {
      host: "127.0.0.1",
      port: POSTGREST_PORT,
      method: req.method,
      path: `${path}${url.search}`,
      headers,
    },
    (upstreamRes) => {
      const outHeaders: Record<string, string | string[]> = {};
      for (const [key, value] of Object.entries(upstreamRes.headers)) {
        if (value !== undefined && !HOP_BY_HOP.has(key) && !key.startsWith("access-control-"))
          outHeaders[key] = value;
      }
      applyCors(res);
      res.writeHead(upstreamRes.statusCode ?? 502, outHeaders);
      upstreamRes.pipe(res);
    },
  );
  upstream.on("error", (error) => {
    if (!res.headersSent)
      sendJson(res, 502, {
        code: "PGRST_UNAVAILABLE",
        message: `PostgREST is not reachable: ${error.message}`,
      });
    else res.end();
  });
  req.pipe(upstream);
}
