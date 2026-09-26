export type UploadBucket = "logos" | "resumes" | "assessment-audio";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/;

export type UploadPathCheck = { ok: true; ownerId: string } | { ok: false };

/**
 * Structural check of a storage path before the ownership lookup (audit C6). Every bucket
 * has one fixed shape; dot segments are refused outright, and `ownerId` is the id the caller
 * must prove it owns (a company, the candidate, an attempt).
 */
export function validateUploadPath(bucket: UploadBucket, path: string): UploadPathCheck {
  const segments = path.split("/");
  if (segments.some((s) => s === "" || s === "." || s === "..")) return { ok: false };
  if (bucket === "logos") {
    if (segments.length !== 3 || segments[0] !== "companies") return { ok: false };
    const [, id, file] = segments;
    if (!id || !UUID.test(id) || !file || !FILE.test(file)) return { ok: false };
    return { ok: true, ownerId: id };
  }
  if (bucket === "resumes") {
    if (segments.length !== 3 || segments[0] !== "candidates" || segments[2] !== "resume.pdf")
      return { ok: false };
    const id = segments[1];
    if (!id || !UUID.test(id)) return { ok: false };
    return { ok: true, ownerId: id };
  }
  if (segments.length !== 3 || segments[0] !== "attempts") return { ok: false };
  const [, attemptId, file] = segments;
  if (!attemptId || !UUID.test(attemptId) || !file || !FILE.test(file)) return { ok: false };
  return { ok: true, ownerId: attemptId };
}

/**
 * True when `path` is a recording stored under this attempt's own folder, with no dot segments
 * and a plain file name. Every server path that signs, reads or stores an audio path goes
 * through this check, so a stored value can never name another attempt's file (audit I9).
 */
export function isAttemptAudioPath(attemptId: string, path: string): boolean {
  const shape = validateUploadPath("assessment-audio", path);
  return shape.ok && shape.ownerId === attemptId;
}

/** True when `path` is the resume stored under this candidate's own folder (audit I8). */
export function isCandidateResumePath(candidateId: string, path: string): boolean {
  const shape = validateUploadPath("resumes", path);
  return shape.ok && shape.ownerId === candidateId;
}
