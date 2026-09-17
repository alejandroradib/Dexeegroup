"use server";

import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ERR, err, ok, type Result } from "@/server/services/result";

export async function markNotificationRead(id: string): Promise<Result<null>> {
  const user = await getSessionUser();
  if (!user) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
  return error ? err(ERR.generic) : ok(null);
}

export async function markAllNotificationsRead(): Promise<Result<null>> {
  const user = await getSessionUser();
  if (!user) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  return error ? err(ERR.generic) : ok(null);
}
