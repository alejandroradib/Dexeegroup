/**
 * Promotes an existing user to admin using the service role.
 * Usage: npm run promote-admin -- --email user@dexeegroup.com   (falls back to ADMIN_EMAIL)
 */
import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/types/database";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const email = arg("email") ?? process.env.ADMIN_EMAIL;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!email) throw new Error("Pass --email or set ADMIN_EMAIL");
  if (!url || !key)
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw new Error(`No profile found for ${email}. The user must sign up first.`);
  if (profile.role === "admin") {
    console.log(`${email} is already an admin`);
    return;
  }
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", profile.id);
  if (updateError) throw updateError;
  await supabase.from("admin_activity").insert({
    actor_user_id: profile.id,
    action: "admin.promoted",
    entity_type: "profile",
    entity_id: profile.id,
    metadata: { email, via: "scripts/promote-admin.ts" },
  });
  console.log(`Promoted ${email} to admin`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
