"use client";

/** Asks the server for a signed upload URL (size and MIME validated there) and PUTs the file to Supabase Storage. */
export async function uploadViaSignedUrl(input: { bucket: "logos" | "resumes" | "assessment-audio"; file: File | Blob; path: string; contentType?: string }): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const contentType = input.contentType ?? (input.file instanceof File ? input.file.type : "application/octet-stream");
  const response = await fetch("/api/storage/signed-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket: input.bucket, path: input.path, size: input.file.size, contentType }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `upload_denied_${response.status}` };
  }
  const { signedUrl, path } = (await response.json()) as { signedUrl: string; path: string };
  const put = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": contentType, "x-upsert": "true" }, body: input.file });
  if (!put.ok) return { ok: false, error: `storage_${put.status}` };
  return { ok: true, path };
}
