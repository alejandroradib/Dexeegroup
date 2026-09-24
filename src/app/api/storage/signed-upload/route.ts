import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import { validateUploadPath } from "@/lib/storage/upload-path";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const LIMITS = {
  logos: {
    maxBytes: 2 * 1024 * 1024,
    // SVG can carry script and is served from a public bucket; raster formats only (audit I7).
    types: ["image/png", "image/jpeg", "image/webp"],
  },
  resumes: { maxBytes: 5 * 1024 * 1024, types: ["application/pdf"] },
  "assessment-audio": {
    maxBytes: 3 * 1024 * 1024,
    types: ["audio/webm", "audio/webm;codecs=opus", "audio/ogg", "audio/mp4"],
  },
} as const;

const bodySchema = z.object({
  bucket: z.enum(["logos", "resumes", "assessment-audio"]),
  path: z
    .string()
    .min(3)
    .max(300)
    .regex(/^[a-zA-Z0-9/_.-]+$/),
  size: z.number().int().positive(),
  contentType: z.string().min(3).max(100),
});

/** Validates size, MIME type and path ownership, then returns a signed upload URL (SPEC section 4). */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { bucket, path, size, contentType } = parsed.data;
  const limit = LIMITS[bucket];
  if (size > limit.maxBytes) return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  if (
    !(limit.types as readonly string[]).includes(contentType.split(";")[0] ?? contentType) &&
    !(limit.types as readonly string[]).includes(contentType)
  ) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }

  const supabase = await createClient();
  // Shape first (fixed depth, no dot segments; audit C6), ownership second.
  const shape = validateUploadPath(bucket, path);
  if (!shape.ok) return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  if (bucket === "logos") {
    const { data: company } = await supabase
      .from("companies")
      .select("id, owner_user_id")
      .eq("id", shape.ownerId)
      .maybeSingle();
    if (!company || (company.owner_user_id !== user.id && user.role !== "admin"))
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
  } else if (bucket === "resumes") {
    if (shape.ownerId !== user.id || user.role !== "candidate")
      return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  } else {
    if (user.role !== "candidate")
      return NextResponse.json({ error: "invalid_path" }, { status: 400 });
    const { data: attempt } = await supabase
      .from("assessment_attempts")
      .select("id, status, candidate_id")
      .eq("id", shape.ownerId)
      .maybeSingle();
    if (!attempt || attempt.candidate_id !== user.id || attempt.status !== "in_progress")
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert: true });
  if (error || !data) return NextResponse.json({ error: "signing_failed" }, { status: 500 });
  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path });
}
