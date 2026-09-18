/** Fake Supabase Storage HTTP API (/storage/v1/object/*), matching the paths and shapes storage-js uses. */
import { applyCors, headerValue, readBody, readJson, sendJson, str } from "./http";
import { signJwt, verifyJwt } from "./jwt";
import {
  fullKey,
  listObjects,
  objectExists,
  readObject,
  removeObject,
  saveObject,
  splitKey,
  type ObjectKey,
} from "./storage-files";

import type { IncomingMessage, ServerResponse } from "node:http";

const UPLOAD_TOKEN_TTL = 2 * 3600;

function storageError(res: ServerResponse, status: number, error: string, message: string): true {
  sendJson(res, status, { statusCode: String(status), error, message });
  return true;
}

function signedToken(target: ObjectKey, ttl: number): string {
  const now = Math.floor(Date.now() / 1000);
  return signJwt({ url: fullKey(target), iat: now, exp: now + ttl });
}

function tokenMatches(url: URL, target: ObjectKey): boolean {
  const claims = verifyJwt(url.searchParams.get("token") ?? "");
  return claims !== null && claims.url === fullKey(target);
}

type Upload = { body: Buffer; mimetype: string; cacheControl: string };

/** Extracts the file from a raw or multipart (FormData) upload body. */
async function extractUpload(req: IncomingMessage): Promise<Upload> {
  const raw = await readBody(req);
  const contentType = headerValue(req, "content-type") ?? "application/octet-stream";
  const cacheHeader = headerValue(req, "cache-control") ?? "max-age=3600";
  if (!contentType.startsWith("multipart/form-data")) {
    return {
      body: raw,
      mimetype: contentType.split(";")[0]?.trim() || "application/octet-stream",
      cacheControl: cacheHeader.replace(/^max-age=/, ""),
    };
  }
  const form = await new Response(Uint8Array.from(raw), {
    headers: { "content-type": contentType },
  }).formData();
  let file: File | null = null;
  form.forEach((value) => {
    if (typeof value !== "string") file = value;
  });
  const cacheControl = str(form.get("cacheControl")) ?? "3600";
  if (!file) return { body: Buffer.alloc(0), mimetype: "application/octet-stream", cacheControl };
  const picked = file as File;
  return {
    body: Buffer.from(await picked.arrayBuffer()),
    mimetype: picked.type || "application/octet-stream",
    cacheControl,
  };
}

async function handleUpload(
  req: IncomingMessage,
  res: ServerResponse,
  key: string,
  signedUrl: URL | null,
): Promise<true> {
  const target = splitKey(key);
  if (!target) return storageError(res, 400, "InvalidKey", "Invalid object key");
  if (signedUrl && !tokenMatches(signedUrl, target)) {
    return storageError(res, 400, "InvalidJWT", "Invalid upload token");
  }
  const upsert = (headerValue(req, "x-upsert") ?? "false") === "true";
  if (!upsert && req.method === "POST" && objectExists(target)) {
    return storageError(res, 409, "Duplicate", "The resource already exists");
  }
  const upload = await extractUpload(req);
  const meta = saveObject(target, upload.body, upload.mimetype, upload.cacheControl);
  sendJson(res, 200, { Key: fullKey(target), Id: meta.id });
  return true;
}

function serveObject(res: ServerResponse, key: string, method: string): true {
  const target = splitKey(key);
  const stored = target ? readObject(target) : null;
  if (!stored) return storageError(res, 404, "not_found", "Object not found");
  applyCors(res);
  res.writeHead(200, {
    "content-type": stored.meta?.mimetype ?? "application/octet-stream",
    "content-length": stored.body.length,
    "cache-control": `max-age=${stored.meta?.cacheControl ?? "3600"}`,
    "last-modified": new Date(stored.meta?.updated_at ?? Date.now()).toUTCString(),
  });
  res.end(method === "HEAD" ? undefined : stored.body);
  return true;
}

async function handleSignedUpload(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  key: string,
): Promise<boolean> {
  if (req.method === "PUT") return handleUpload(req, res, key, url);
  if (req.method !== "POST") return false;
  const target = splitKey(key);
  if (!target) return storageError(res, 400, "InvalidKey", "Invalid object key");
  const token = signedToken(target, UPLOAD_TOKEN_TTL);
  sendJson(res, 200, { url: `/object/upload/sign/${fullKey(target)}?token=${token}`, token });
  return true;
}

async function handleSignedDownload(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  key: string,
): Promise<boolean> {
  const method = req.method ?? "GET";
  const target = splitKey(key);
  if (!target) return storageError(res, 400, "InvalidKey", "Invalid object key");
  if (method === "POST") {
    if (!objectExists(target)) return storageError(res, 404, "not_found", "Object not found");
    const body = await readJson(req);
    const expiresIn = typeof body.expiresIn === "number" ? body.expiresIn : 3600;
    const token = signedToken(target, expiresIn);
    sendJson(res, 200, { signedURL: `/object/sign/${fullKey(target)}?token=${token}` });
    return true;
  }
  if (method === "GET" || method === "HEAD") {
    if (!tokenMatches(url, target)) {
      return storageError(res, 400, "InvalidJWT", "Invalid or expired token");
    }
    return serveObject(res, key, method);
  }
  return false;
}

async function handleList(
  req: IncomingMessage,
  res: ServerResponse,
  bucket: string,
): Promise<true> {
  const body = await readJson(req);
  const rows = listObjects(bucket, {
    prefix: (str(body.prefix) ?? "").replace(/^\/+|\/+$/g, ""),
    search: str(body.search) ?? "",
    limit: typeof body.limit === "number" ? body.limit : 100,
    offset: typeof body.offset === "number" ? body.offset : 0,
  });
  sendJson(res, 200, rows);
  return true;
}

async function handleRemove(
  req: IncomingMessage,
  res: ServerResponse,
  bucket: string,
): Promise<true> {
  const body = await readJson(req);
  const prefixes = Array.isArray(body.prefixes)
    ? body.prefixes.filter((p): p is string => typeof p === "string")
    : [];
  const removed = prefixes.filter((p) => {
    const target = splitKey(`${bucket}/${p}`);
    return target !== null && removeObject(target);
  });
  sendJson(
    res,
    200,
    removed.map((name) => ({ name, bucket_id: bucket })),
  );
  return true;
}

/** Routes /storage/v1/<rest>. Returns false when the path is unknown. */
export async function handleStorage(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  rest: string,
): Promise<boolean> {
  const method = req.method ?? "GET";
  const [head, ...tail] = rest.replace(/^\/+/, "").split("/");
  if (head !== "object") return false;
  const [op, ...more] = tail;
  if (!op) return false;
  const isRead = method === "GET" || method === "HEAD";

  if (op === "upload" && more[0] === "sign") {
    return handleSignedUpload(req, res, url, more.slice(1).join("/"));
  }
  if (op === "sign") return handleSignedDownload(req, res, url, more.join("/"));
  if ((op === "public" || op === "authenticated") && isRead) {
    return serveObject(res, more.join("/"), method);
  }
  if (op === "list" && method === "POST" && more[0]) return handleList(req, res, more[0]);
  if (method === "DELETE" && more.length === 0) return handleRemove(req, res, op);
  if (method === "POST" || method === "PUT") return handleUpload(req, res, tail.join("/"), null);
  if (isRead) return serveObject(res, tail.join("/"), method);
  return false;
}
