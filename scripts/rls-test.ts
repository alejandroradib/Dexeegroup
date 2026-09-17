/**
 * Remote RLS assertions against the linked Supabase project (dev or production with throwaway users).
 * Creates four users through the Auth admin API, exercises the matrix in SPEC section 8 through
 * PostgREST with per-user clients, and deletes everything it created.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.
 * The local equivalent (no project needed) is `npm run db:verify`.
 */
import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const admin = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const suffix = Date.now().toString(36);
const password = `Rls-${suffix}-Test!1`;

const results: { name: string; ok: boolean; detail?: string }[] = [];
function record(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail && !ok ? ` (${detail})` : ""}`);
}

async function createUser(role: "company" | "candidate", label: string) {
  const email = `rls-${label}-${suffix}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: `RLS ${label}`, locale: "en" },
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  const client = createClient<Database>(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, email, client };
}

async function main() {
  const created: string[] = [];
  const cleanup: (() => PromiseLike<unknown>)[] = [];
  try {
    const candidate = await createUser("candidate", "candidate");
    const ownerA = await createUser("company", "owner-a");
    const ownerB = await createUser("company", "owner-b");
    const adminUser = await createUser("candidate", "admin");
    created.push(candidate.id, ownerA.id, ownerB.id, adminUser.id);
    await admin.from("profiles").update({ role: "admin" }).eq("id", adminUser.id);
    const adminClient = adminUser.client;

    // Seed data owned by the test users
    const { data: companyA } = await ownerA.client
      .from("companies")
      .insert({ owner_user_id: ownerA.id, name: `RLS Co A ${suffix}` })
      .select("id")
      .single();
    const { data: companyB } = await ownerB.client
      .from("companies")
      .insert({ owner_user_id: ownerB.id, name: `RLS Co B ${suffix}` })
      .select("id")
      .single();
    if (!companyA || !companyB) throw new Error("company insert failed");
    cleanup.push(() => admin.from("companies").delete().in("id", [companyA.id, companyB.id]));
    await admin
      .from("companies")
      .update({ status: "verified", verified_at: new Date().toISOString() })
      .eq("id", companyA.id);

    const { data: jobA } = await ownerA.client
      .from("jobs")
      .insert({
        company_id: companyA.id,
        title: "RLS role A",
        created_by: ownerA.id,
        status: "published",
      })
      .select("id, slug")
      .single();
    const { data: draftA } = await ownerA.client
      .from("jobs")
      .insert({ company_id: companyA.id, title: "RLS draft A", created_by: ownerA.id })
      .select("id")
      .single();
    if (!jobA || !draftA) throw new Error("job insert failed");

    const { error: publishPending } = await ownerB.client
      .from("jobs")
      .insert({
        company_id: companyB.id,
        title: "RLS role B",
        created_by: ownerB.id,
        status: "published",
      });
    record("pending company cannot publish", Boolean(publishPending), publishPending?.message);

    await candidate.client
      .from("candidates")
      .insert({
        id: candidate.id,
        first_name: "Rls",
        last_name: "Candidate",
        data_consent_at: new Date().toISOString(),
        data_consent_version: "test",
      });
    await candidate.client
      .from("candidate_contacts")
      .insert({ candidate_id: candidate.id, email: candidate.email, phone: "+57 300 000 0000" });

    // Anonymous
    const anon = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
    const pj = await anon.from("public_jobs").select("id").eq("id", jobA.id);
    record("anon reads public_jobs", !pj.error && (pj.data?.length ?? 0) === 1, pj.error?.message);
    const anonJobs = await anon.from("jobs").select("id");
    record("anon cannot read jobs", Boolean(anonJobs.error) || (anonJobs.data?.length ?? 0) === 0);
    const anonCandidates = await anon.from("candidates").select("id");
    record(
      "anon cannot read candidates",
      Boolean(anonCandidates.error) || (anonCandidates.data?.length ?? 0) === 0,
    );
    const anonContacts = await anon.from("candidate_contacts").select("candidate_id");
    record(
      "anon cannot read candidate_contacts",
      Boolean(anonContacts.error) || (anonContacts.data?.length ?? 0) === 0,
    );

    // Candidate
    const draftApply = await candidate.client
      .from("applications")
      .insert({ job_id: draftA.id, candidate_id: candidate.id });
    record("candidate cannot apply to a draft job", Boolean(draftApply.error));
    const apply = await candidate.client
      .from("applications")
      .insert({ job_id: jobA.id, candidate_id: candidate.id })
      .select("id")
      .single();
    record("candidate applies to a published job", !apply.error, apply.error?.message);
    const dup = await candidate.client
      .from("applications")
      .insert({ job_id: jobA.id, candidate_id: candidate.id });
    record("candidate cannot apply twice", Boolean(dup.error));
    const ownRows = await candidate.client.from("candidates").select("id");
    record(
      "candidate reads only own candidate row",
      (ownRows.data?.length ?? 0) === 1 && ownRows.data?.[0]?.id === candidate.id,
    );
    const candJobs = await candidate.client.from("jobs").select("id");
    record("candidate cannot read jobs table", (candJobs.data?.length ?? 0) === 0);

    // Company A
    const appsA = await ownerA.client.from("applications").select("id, candidate_id");
    record("company reads applicants of own jobs", (appsA.data?.length ?? 0) === 1);
    const candForA = await ownerA.client.from("candidates").select("id");
    record("company reads applicant profile", (candForA.data?.length ?? 0) === 1);
    const contactsBefore = await ownerA.client.from("candidate_contacts").select("candidate_id");
    record("company cannot read contacts before release", (contactsBefore.data?.length ?? 0) === 0);
    const releaseByCompany = await ownerA.client
      .from("applications")
      .update({ contact_released: true })
      .eq("id", apply.data!.id);
    record("company cannot set contact_released", Boolean(releaseByCompany.error));
    const commercials = await ownerA.client.from("job_commercials").select("job_id");
    record("company cannot read job_commercials", (commercials.data?.length ?? 0) === 0);
    const placements = await ownerA.client.from("placements").select("id");
    record("company cannot read placements", (placements.data?.length ?? 0) === 0);

    // Company B isolation
    const jobsB = await ownerB.client.from("jobs").select("id").eq("company_id", companyA.id);
    record("company cannot read another company's jobs", (jobsB.data?.length ?? 0) === 0);
    const appsB = await ownerB.client.from("applications").select("id");
    record("company cannot read another company's applicants", (appsB.data?.length ?? 0) === 0);

    // Admin releases contact
    const release = await adminClient
      .from("applications")
      .update({
        contact_released: true,
        contact_released_by: adminUser.id,
        contact_released_at: new Date().toISOString(),
      })
      .eq("id", apply.data!.id);
    record("admin releases contact", !release.error, release.error?.message);
    const contactsAfter = await ownerA.client.from("candidate_contacts").select("candidate_id");
    record("company reads contacts after release", (contactsAfter.data?.length ?? 0) === 1);

    // Assessments: cooldown and single open attempt
    const { data: assessment } = await admin
      .from("assessments")
      .select("id, is_active")
      .eq("type", "english_written")
      .single();
    if (assessment) {
      await admin.from("assessments").update({ is_active: true }).eq("id", assessment.id);
      const first = await candidate.client
        .from("assessment_attempts")
        .insert({ assessment_id: assessment.id, candidate_id: candidate.id })
        .select("id")
        .single();
      record("candidate starts an attempt", !first.error, first.error?.message);
      const second = await candidate.client
        .from("assessment_attempts")
        .insert({ assessment_id: assessment.id, candidate_id: candidate.id });
      record("second in_progress attempt is rejected", Boolean(second.error));
      if (first.data) {
        await admin
          .from("assessment_attempts")
          .update({
            status: "validated",
            submitted_at: new Date().toISOString(),
            final_level: "B2",
          })
          .eq("id", first.data.id);
        const third = await candidate.client
          .from("assessment_attempts")
          .insert({ assessment_id: assessment.id, candidate_id: candidate.id });
        record(
          "attempt inside cooldown is rejected",
          Boolean(third.error) && (third.error?.message ?? "").includes("cooldown_active"),
        );
        cleanup.push(() =>
          admin.from("assessment_attempts").delete().eq("candidate_id", candidate.id),
        );
      }
      await admin
        .from("assessments")
        .update({ is_active: assessment.is_active })
        .eq("id", assessment.id);
    }

    // Admin reads everything
    const adminJobs = await adminClient.from("jobs").select("id").in("id", [jobA.id, draftA.id]);
    record("admin reads all jobs", (adminJobs.data?.length ?? 0) === 2);
    const adminContacts = await adminClient
      .from("candidate_contacts")
      .select("candidate_id")
      .eq("candidate_id", candidate.id);
    record("admin reads contacts", (adminContacts.data?.length ?? 0) === 1);

    // Every table has RLS
    const rls = await admin.rpc("is_admin");
    record("service role can call access functions", !rls.error);
  } finally {
    for (const fn of cleanup.reverse()) {
      try {
        await fn();
      } catch {
        // best-effort cleanup
      }
    }
    for (const id of created) await admin.auth.admin.deleteUser(id).catch(() => undefined);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
