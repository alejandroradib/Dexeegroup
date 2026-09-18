/**
 * Starts the whole local demo stack: Postgres (via setup-db.sh), PostgREST and the gateway.
 *   npm run demo            # then: cp .env.demo .env.local && npm run dev
 * Ctrl+C stops PostgREST and the gateway; Postgres keeps running (npm run demo:db -- --stop).
 */
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  GATEWAY_URL,
  JWT_SECRET,
  POSTGREST_BIN,
  POSTGREST_CONF,
  POSTGREST_DB_URI,
  POSTGREST_PORT,
  POSTGREST_RELEASE,
  ROOT,
} from "./config";
import { ANON_KEY, startGateway, stopGateway } from "./gateway";

function step(title: string): void {
  console.log(`\n== ${title}`);
}

function runOrExit(command: string, args: string[]): void {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`${command} ${args.join(" ")} failed with status ${result.status ?? "unknown"}`);
    process.exit(1);
  }
}

function ensurePostgrest(): void {
  if (existsSync(POSTGREST_BIN)) return;
  step("downloading PostgREST");
  const dir = path.dirname(POSTGREST_BIN);
  mkdirSync(dir, { recursive: true });
  const archive = path.join(dir, "postgrest.tar.xz");
  runOrExit("curl", ["-sSL", "-o", archive, POSTGREST_RELEASE]);
  runOrExit("tar", ["-xJf", archive, "-C", dir]);
  runOrExit("rm", ["-f", archive]);
  runOrExit("chmod", ["+x", POSTGREST_BIN]);
}

function writePostgrestConfig(): void {
  const lines = [
    `db-uri = "${POSTGREST_DB_URI}"`,
    'db-schemas = "public"',
    'db-anon-role = "anon"',
    `jwt-secret = "${JWT_SECRET}"`,
    'server-host = "127.0.0.1"',
    `server-port = ${POSTGREST_PORT}`,
    "db-pool = 10",
    'db-extra-search-path = "public"',
    "db-channel-enabled = true",
    'db-channel = "pgrst"',
    'log-level = "error"',
    "",
  ];
  writeFileSync(POSTGREST_CONF, lines.join("\n"));
}

async function isUp(url: string, headers: Record<string, string> = {}): Promise<boolean> {
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(1500) });
    return response.status === 200;
  } catch {
    return false;
  }
}

async function waitFor(
  check: () => Promise<boolean>,
  label: string,
  timeoutMs = 30_000,
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`${label} did not become ready within ${timeoutMs / 1000}s`);
}

async function main(): Promise<void> {
  step("postgres");
  runOrExit("bash", ["scripts/demo/setup-db.sh"]);

  ensurePostgrest();
  writePostgrestConfig();

  let postgrest: ChildProcess | undefined;
  if (await isUp(`http://127.0.0.1:${POSTGREST_PORT}/`)) {
    console.log(`PostgREST already running on :${POSTGREST_PORT}; reusing it`);
  } else {
    step("postgrest");
    postgrest = spawn(POSTGREST_BIN, [POSTGREST_CONF], {
      cwd: ROOT,
      stdio: ["ignore", "inherit", "inherit"],
    });
    postgrest.on("exit", (code) => {
      if (code !== null && code !== 0) console.error(`PostgREST exited with status ${code}`);
    });
  }

  step("gateway");
  const server = await startGateway();

  const probe = `${GATEWAY_URL}/rest/v1/public_jobs?select=id&limit=1`;
  await waitFor(
    () => isUp(probe, { apikey: ANON_KEY, authorization: `Bearer ${ANON_KEY}` }),
    "the REST API",
  );

  console.log(`
Demo stack is ready.
  Supabase URL  ${GATEWAY_URL}   (REST, auth and storage)
  PostgREST     http://127.0.0.1:${POSTGREST_PORT}
  Postgres      ${POSTGREST_DB_URI.replace("authenticator", "postgres")}
  Keys          .env.demo (NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)

Next, in another terminal:
  cp .env.demo .env.local && npm run dev

Seed accounts (password "DexeeSeed2026!"): admin@dexeegroup.com, owner@northwind-logistics.example.com,
laura.gomez@example.com. See docs/DEMO.md for the full list. Press Ctrl+C to stop PostgREST and the gateway.
`);

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    console.log(
      "\nstopping gateway and PostgREST (postgres keeps running; `npm run demo:db -- --stop` stops it)",
    );
    postgrest?.kill("SIGTERM");
    await stopGateway(server);
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
