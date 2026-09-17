import "server-only";

import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

/** Every admin mutation writes a row here (SPEC 15). */
export async function logAdminActivity(input: { actorUserId: string; action: string; entityType: string; entityId?: string | null; metadata?: Record<string, Json> }) {
  const admin = createAdminClient();
  const { error } = await admin.from("admin_activity").insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) logger.error({ err: error.message, action: input.action }, "admin_activity_insert_failed");
}
