import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let cached: ReturnType<typeof build> | undefined;

function build() {
  return createSupabaseClient<Database>(
    publicEnv().NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** Service-role client. Bypasses RLS: use only inside server actions and route handlers. */
export function createAdminClient() {
  cached ??= build();
  return cached;
}
