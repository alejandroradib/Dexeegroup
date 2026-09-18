/** On-disk object store for the fake Storage API: data under .demo/storage/<bucket>/<path>, metadata under .demo/storage/.meta. */
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { STORAGE_DIR } from "./config";

const META_DIR = path.join(STORAGE_DIR, ".meta");

export type ObjectKey = { bucket: string; objectPath: string };

export type Meta = {
  id: string;
  mimetype: string;
  size: number;
  cacheControl: string;
  created_at: string;
  updated_at: string;
};

/** Splits "<bucket>/<object path>" and rejects traversal. */
export function splitKey(key: string): ObjectKey | null {
  const clean = decodeURIComponent(key).replace(/^\/+|\/+$/g, "");
  const slash = clean.indexOf("/");
  if (slash <= 0) return null;
  const bucket = clean.slice(0, slash);
  const objectPath = clean.slice(slash + 1).replace(/\/+/g, "/");
  const traversal = objectPath.split("/").some((segment) => segment === "..");
  if (!bucket || !objectPath || bucket.startsWith(".") || traversal) return null;
  return { bucket, objectPath };
}

export const fullKey = (target: ObjectKey) => `${target.bucket}/${target.objectPath}`;

const dataPath = (target: ObjectKey) => path.join(STORAGE_DIR, target.bucket, target.objectPath);
const metaPath = (target: ObjectKey) =>
  path.join(META_DIR, target.bucket, `${target.objectPath}.json`);

export function objectExists(target: ObjectKey): boolean {
  return existsSync(dataPath(target));
}

export function readMeta(target: ObjectKey): Meta | null {
  try {
    return JSON.parse(readFileSync(metaPath(target), "utf8")) as Meta;
  } catch {
    return null;
  }
}

export function readObject(target: ObjectKey): { body: Buffer; meta: Meta | null } | null {
  if (!objectExists(target)) return null;
  return { body: readFileSync(dataPath(target)), meta: readMeta(target) };
}

export function saveObject(
  target: ObjectKey,
  body: Buffer,
  mimetype: string,
  cacheControl: string,
): Meta {
  const file = dataPath(target);
  mkdirSync(path.dirname(file), { recursive: true });
  mkdirSync(path.dirname(metaPath(target)), { recursive: true });
  const previous = readMeta(target);
  const now = new Date().toISOString();
  const meta: Meta = {
    id: previous?.id ?? randomUUID(),
    mimetype,
    size: body.length,
    cacheControl,
    created_at: previous?.created_at ?? now,
    updated_at: now,
  };
  writeFileSync(file, body);
  writeFileSync(metaPath(target), JSON.stringify(meta));
  return meta;
}

export function removeObject(target: ObjectKey): boolean {
  if (!objectExists(target)) return false;
  rmSync(dataPath(target), { force: true });
  rmSync(metaPath(target), { force: true });
  return true;
}

export type ListOptions = { prefix: string; search: string; limit: number; offset: number };

/** Immediate children of a prefix, in the shape storage-js returns from `list()`. */
export function listObjects(bucket: string, options: ListOptions): Record<string, unknown>[] {
  const dir = path.join(STORAGE_DIR, bucket, options.prefix);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  const needle = options.search.toLowerCase();
  const entries = readdirSync(dir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith(".") && e.name.toLowerCase().includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name));
  return entries.slice(options.offset, options.offset + options.limit).map((entry) => {
    if (entry.isDirectory()) {
      return {
        name: entry.name,
        id: null,
        updated_at: null,
        created_at: null,
        last_accessed_at: null,
        metadata: null,
      };
    }
    const objectPath = options.prefix ? `${options.prefix}/${entry.name}` : entry.name;
    const meta = readMeta({ bucket, objectPath });
    const size = meta?.size ?? statSync(path.join(dir, entry.name)).size;
    return {
      name: entry.name,
      id: meta?.id ?? randomUUID(),
      updated_at: meta?.updated_at ?? null,
      created_at: meta?.created_at ?? null,
      last_accessed_at: meta?.updated_at ?? null,
      metadata: {
        eTag: `"${meta?.id ?? ""}"`,
        size,
        mimetype: meta?.mimetype ?? "application/octet-stream",
        cacheControl: `max-age=${meta?.cacheControl ?? "3600"}`,
        lastModified: meta?.updated_at ?? null,
        contentLength: size,
        httpStatusCode: 200,
      },
    };
  });
}
