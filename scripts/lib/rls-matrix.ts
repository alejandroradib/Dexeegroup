/**
 * Access matrix assertions (SPEC 8, PHASES Phase 1) executed against the PGlite database
 * with per-role sessions. Each check runs in its own transaction and is rolled back.
 */

import { asUser } from "./pglite-db";
import { SEED } from "./seed-ids";

import type { PGlite } from "@electric-sql/pglite";

type Session = { id: string | null; role: "anon" | "authenticated" };

const anon: Session = { id: null, role: "anon" };
const admin: Session = { id: SEED.admin, role: "authenticated" };
const laura: Session = { id: SEED.candidates.laura, role: "authenticated" };
const andres: Session = { id: SEED.candidates.andres, role: "authenticated" };
const harborOwner: Session = { id: SEED.owners.harbor, role: "authenticated" };
const brightlineOwner: Session = { id: SEED.owners.brightline, role: "authenticated" };
const brightlineMember: Session = { id: SEED.owners.brightlineMember, role: "authenticated" };
const northwindOwner: Session = { id: SEED.owners.northwind, role: "authenticated" };

type Tx = { query: PGlite["query"]; exec: PGlite["exec"] };

/** Temporarily drops to the superuser with no JWT (like the service role), then restores the session. */
async function asService(tx: Tx, fn: () => Promise<unknown>, restore: Session) {
  await tx.exec("reset role");
  await tx.query("select set_config('request.jwt.claim.sub', '', true)");
  await fn();
  await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [restore.id]);
  await tx.exec(`set local role ${restore.role}`);
}

export type MatrixSummary = { passed: number; failed: number; failures: string[] };

export async function runAccessMatrix(db: PGlite): Promise<MatrixSummary> {
  const summary: MatrixSummary = { passed: 0, failed: 0, failures: [] };

  async function count(session: Session, sql: string, params: unknown[] = []): Promise<number> {
    return asUser(
      db,
      session,
      async (tx) => {
        const res = await tx.query<{ n: string | number }>(
          `select count(*)::int as n from (${sql}) q`,
          params,
        );
        return Number(res.rows[0]?.n ?? 0);
      },
      { commit: false },
    );
  }

  async function fails(
    session: Session,
    sql: string,
    params: unknown[] = [],
  ): Promise<string | null> {
    try {
      await asUser(db, session, async (tx) => tx.query(sql, params), { commit: false });
      return null;
    } catch (error) {
      return (error as Error).message;
    }
  }

  async function check(name: string, fn: () => Promise<boolean>) {
    let ok = false;
    let detail = "";
    try {
      ok = await fn();
    } catch (error) {
      detail = (error as Error).message;
    }
    if (ok) summary.passed += 1;
    else {
      summary.failed += 1;
      summary.failures.push(detail ? `${name} (${detail})` : name);
    }
  }

  const expectError = async (
    name: string,
    session: Session,
    sql: string,
    params: unknown[] = [],
    fragment?: string,
  ) =>
    check(name, async () => {
      const message = await fails(session, sql, params);
      if (message === null) return false;
      return fragment ? message.includes(fragment) : true;
    });

  const expectOk = async (name: string, session: Session, sql: string, params: unknown[] = []) =>
    check(name, async () => (await fails(session, sql, params)) === null);

  // Anonymous ------------------------------------------------------------------------------
  await check(
    "anon reads public_jobs",
    async () => (await count(anon, "select * from public.public_jobs")) === 6,
  );
  await check(
    "anon public_jobs hides confidential company",
    async () =>
      (await count(
        anon,
        "select * from public.public_jobs where slug like 'sales-development%' and company_name = 'Confidential' and company_logo_path is null",
      )) === 1,
  );
  await check(
    "anon public_jobs hides salary when show_salary is false",
    async () =>
      (await count(
        anon,
        "select * from public.public_jobs where slug like 'data-analyst%' and salary_min_usd is null and salary_max_usd is null",
      )) === 1,
  );
  await expectError("anon cannot read jobs", anon, "select * from public.jobs");
  await expectError("anon cannot read candidates", anon, "select * from public.candidates");
  await expectError(
    "anon cannot read candidate_contacts",
    anon,
    "select * from public.candidate_contacts",
  );
  await expectError(
    "anon cannot insert contact_requests directly",
    anon,
    "insert into public.contact_requests (name, email, request_type, message) values ('x', 'x@x.com', 'hire', 'hi')",
  );

  // Candidate ------------------------------------------------------------------------------
  await check(
    "candidate reads only own candidate row",
    async () => (await count(laura, "select * from public.candidates")) === 1,
  );
  await check(
    "candidate reads only own contacts",
    async () =>
      (await count(laura, "select * from public.candidate_contacts where candidate_id = $1", [
        SEED.candidates.laura,
      ])) === 1 && (await count(laura, "select * from public.candidate_contacts")) === 1,
  );
  await check(
    "candidate reads only own applications",
    async () => (await count(laura, "select * from public.applications")) === 1,
  );
  await check(
    "candidate reads only own application events",
    async () => (await count(laura, "select * from public.application_events")) === 4,
  );
  await check(
    "candidate cannot read jobs table",
    async () => (await count(laura, "select * from public.jobs")) === 0,
  );
  await check(
    "candidate cannot read job_commercials",
    async () => (await count(laura, "select * from public.job_commercials")) === 0,
  );
  await check(
    "candidate cannot read company notes",
    async () => (await count(laura, "select * from public.notes")) === 0,
  );
  await expectOk(
    "candidate updates own headline",
    laura,
    "update public.candidates set headline = 'Updated' where id = $1",
    [SEED.candidates.laura],
  );
  await check(
    "candidate cannot update another candidate",
    async () =>
      (await asUser(
        db,
        laura,
        async (tx) => {
          const res = await tx.query("update public.candidates set headline = 'x' where id = $1", [
            SEED.candidates.andres,
          ]);
          return res.affectedRows ?? 0;
        },
        { commit: false },
      )) === 0,
  );
  await check("candidate cannot self-assign english levels", async () =>
    asUser(
      db,
      laura,
      async (tx) => {
        await tx.query("update public.candidates set english_verified_level = 'C2' where id = $1", [
          SEED.candidates.laura,
        ]);
        const res = await tx.query<{ english_verified_level: string }>(
          "select english_verified_level from public.candidates where id = $1",
          [SEED.candidates.laura],
        );
        return res.rows[0]?.english_verified_level === "C1";
      },
      { commit: false },
    ),
  );
  await expectError(
    "candidate cannot apply to a draft job",
    andres,
    "insert into public.applications (job_id, candidate_id) values ($1, $2)",
    [SEED.jobs.designerDraft, SEED.candidates.andres],
  );
  await expectError(
    "candidate cannot apply to a pending_review job",
    andres,
    "insert into public.applications (job_id, candidate_id) values ($1, $2)",
    [SEED.jobs.dispatchPending, SEED.candidates.andres],
  );
  await expectError(
    "candidate cannot apply twice to the same job",
    andres,
    "insert into public.applications (job_id, candidate_id) values ($1, $2)",
    [SEED.jobs.fullStack, SEED.candidates.andres],
  );
  await expectError(
    "candidate cannot apply on behalf of another candidate",
    andres,
    "insert into public.applications (job_id, candidate_id) values ($1, $2)",
    [SEED.jobs.dataAnalyst, SEED.candidates.laura],
  );
  await expectOk(
    "candidate applies to a published job",
    andres,
    "insert into public.applications (job_id, candidate_id, cover_note) values ($1, $2, 'note')",
    [SEED.jobs.dataAnalyst, SEED.candidates.andres],
  );
  await expectOk(
    "candidate withdraws before offer",
    andres,
    "update public.applications set status = 'withdrawn' where id = $1",
    [SEED.applications.andresFullStack],
  );
  await expectError(
    "candidate cannot move own application to hired",
    andres,
    "update public.applications set status = 'hired' where id = $1",
    [SEED.applications.andresFullStack],
    "candidate_can_only_withdraw",
  );
  await expectError(
    "candidate cannot release own contact",
    laura,
    "update public.applications set contact_released = true where id = $1",
    [SEED.applications.lauraAccountant],
  );
  await check(
    "candidate sees active assessments only",
    async () => (await count(laura, "select * from public.assessments")) === 0,
  );
  await check(
    "candidate gets no rows from assessment_questions table",
    async () => (await count(laura, "select answer_key from public.assessment_questions")) === 0,
  );
  await check(
    "candidate reads active questions through the public view without answer keys",
    async () =>
      asUser(
        db,
        laura,
        async (tx) => {
          const res = await tx.query<{ n: number }>(
            "select count(*)::int as n from public.assessment_questions_public",
          );
          const cols = await tx.query<{ column_name: string }>(
            "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'assessment_questions_public'",
          );
          return (
            Number(res.rows[0]?.n) > 100 && !cols.rows.some((c) => c.column_name === "answer_key")
          );
        },
        { commit: false },
      ),
  );

  // Assessment attempts: single open attempt and cooldown
  await asUser(db, { id: null, role: "service_role" }, async (tx) => {
    await tx.query("update public.assessments set is_active = true where id = $1", [
      SEED.assessments.written,
    ]);
  });
  await check(
    "candidate sees active assessment",
    async () => (await count(laura, "select * from public.assessments")) === 1,
  );
  await check("second in_progress attempt is rejected", async () =>
    asUser(
      db,
      laura,
      async (tx) => {
        await tx.query(
          "insert into public.assessment_attempts (assessment_id, candidate_id) values ($1, $2)",
          [SEED.assessments.written, SEED.candidates.laura],
        );
        try {
          await tx.query(
            "insert into public.assessment_attempts (assessment_id, candidate_id) values ($1, $2)",
            [SEED.assessments.written, SEED.candidates.laura],
          );
          return false;
        } catch (error) {
          return (error as Error).message.includes("attempt_already_open");
        }
      },
      { commit: false },
    ),
  );
  await check("attempt inside cooldown is rejected with next date", async () =>
    asUser(
      db,
      laura,
      async (tx) => {
        await tx.query(
          "insert into public.assessment_attempts (assessment_id, candidate_id) values ($1, $2)",
          [SEED.assessments.written, SEED.candidates.laura],
        );
        await asService(
          tx,
          () =>
            tx.query(
              "update public.assessment_attempts set status = 'validated', submitted_at = now(), final_level = 'B2' where candidate_id = $1 and status = 'in_progress'",
              [SEED.candidates.laura],
            ),
          laura,
        );
        try {
          await tx.query(
            "insert into public.assessment_attempts (assessment_id, candidate_id) values ($1, $2)",
            [SEED.assessments.written, SEED.candidates.laura],
          );
          return false;
        } catch (error) {
          return (error as Error).message.includes("cooldown_active:");
        }
      },
      { commit: false },
    ),
  );
  await check("expired attempt does not consume cooldown", async () =>
    asUser(
      db,
      laura,
      async (tx) => {
        await tx.query(
          "insert into public.assessment_attempts (assessment_id, candidate_id) values ($1, $2)",
          [SEED.assessments.written, SEED.candidates.laura],
        );
        await asService(
          tx,
          () =>
            tx.query(
              "update public.assessment_attempts set status = 'expired' where candidate_id = $1 and status = 'in_progress'",
              [SEED.candidates.laura],
            ),
          laura,
        );
        await tx.query(
          "insert into public.assessment_attempts (assessment_id, candidate_id) values ($1, $2)",
          [SEED.assessments.written, SEED.candidates.laura],
        );
        return true;
      },
      { commit: false },
    ),
  );
  await check("written validation syncs candidate level", async () =>
    asUser(
      db,
      { id: null, role: "service_role" },
      async (tx) => {
        await tx.query(
          "insert into public.assessment_attempts (id, assessment_id, candidate_id) values ('11111111-0000-4000-8000-000000000001', $1, $2)",
          [SEED.assessments.written, SEED.candidates.mariana],
        );
        await tx.query(
          "update public.assessment_attempts set status = 'validated', submitted_at = now(), final_level = 'B2' where id = '11111111-0000-4000-8000-000000000001'",
        );
        const res = await tx.query<{
          english_written_level: string;
          english_verified_level: string | null;
        }>(
          "select english_written_level, english_verified_level from public.candidates where id = $1",
          [SEED.candidates.mariana],
        );
        return (
          res.rows[0]?.english_written_level === "B2" &&
          res.rows[0]?.english_verified_level === null
        );
      },
      { commit: false },
    ),
  );
  await check("candidate can only toggle visible_to_companies on attempts", async () =>
    asUser(
      db,
      laura,
      async (tx) => {
        await tx.query(
          "insert into public.assessment_attempts (id, assessment_id, candidate_id) values ('11111111-0000-4000-8000-000000000002', $1, $2)",
          [SEED.assessments.written, SEED.candidates.laura],
        );
        await tx.query(
          "update public.assessment_attempts set visible_to_companies = true where id = '11111111-0000-4000-8000-000000000002'",
        );
        try {
          await tx.query(
            "update public.assessment_attempts set final_level = 'C2' where id = '11111111-0000-4000-8000-000000000002'",
          );
          return false;
        } catch (error) {
          return (error as Error).message.includes("attempt_fields_locked");
        }
      },
      { commit: false },
    ),
  );
  await asUser(db, { id: null, role: "service_role" }, async (tx) => {
    await tx.query("update public.assessments set is_active = false where id = $1", [
      SEED.assessments.written,
    ]);
  });

  // Company -------------------------------------------------------------------------------
  await check(
    "company reads own jobs only",
    async () => (await count(harborOwner, "select * from public.jobs")) === 3,
  );
  await check(
    "company cannot read another company's jobs",
    async () =>
      (await count(harborOwner, "select * from public.jobs where company_id = $1", [
        SEED.companies.brightline,
      ])) === 0,
  );
  await check(
    "company reads applicants of own jobs only",
    async () => (await count(harborOwner, "select * from public.applications")) === 3,
  );
  await check(
    "company cannot read another company's applicants",
    async () =>
      (await count(harborOwner, "select * from public.applications where id = $1", [
        SEED.applications.andresFullStack,
      ])) === 0,
  );
  await check(
    "company reads candidate rows of applicants",
    async () => (await count(harborOwner, "select * from public.candidates")) === 3,
  );
  await check(
    "company reads candidate_cards of applicants",
    async () => (await count(harborOwner, "select * from public.candidate_cards")) === 3,
  );
  await check(
    "company cannot read contacts before release",
    async () =>
      (await count(
        brightlineOwner,
        "select * from public.candidate_contacts where candidate_id = $1",
        [SEED.candidates.andres],
      )) === 0,
  );
  await check(
    "company reads contacts after release",
    async () =>
      (await count(harborOwner, "select * from public.candidate_contacts where candidate_id = $1", [
        SEED.candidates.laura,
      ])) === 1,
  );
  await check(
    "company sees no other contacts",
    async () => (await count(harborOwner, "select * from public.candidate_contacts")) === 1,
  );
  await check(
    "company cannot read job_commercials",
    async () => (await count(harborOwner, "select * from public.job_commercials")) === 0,
  );
  await check(
    "company cannot read placements",
    async () => (await count(harborOwner, "select * from public.placements")) === 0,
  );
  await check(
    "company cannot read admin_activity",
    async () => (await count(harborOwner, "select * from public.admin_activity")) === 0,
  );
  await check(
    "company cannot read dexee_only notes",
    async () => (await count(harborOwner, "select * from public.notes")) === 1,
  );
  await expectError(
    "company cannot set contact_released",
    harborOwner,
    "update public.applications set contact_released = true where id = $1",
    [SEED.applications.camilaSupport],
    "contact_release_admin_only",
  );
  await expectOk(
    "company moves applicant status",
    harborOwner,
    "update public.applications set status = 'shortlisted' where id = $1",
    [SEED.applications.camilaSupport],
  );
  await expectOk(
    "company requests contact",
    harborOwner,
    "update public.applications set contact_requested_at = now() where id = $1",
    [SEED.applications.camilaSupport],
  );
  await expectError(
    "company cannot withdraw for the candidate",
    harborOwner,
    "update public.applications set status = 'withdrawn' where id = $1",
    [SEED.applications.camilaSupport],
    "company_cannot_withdraw",
  );
  await check("company status change writes application_events", async () =>
    asUser(
      db,
      harborOwner,
      async (tx) => {
        await tx.query("update public.applications set status = 'interview' where id = $1", [
          SEED.applications.camilaSupport,
        ]);
        const res = await tx.query<{ n: number }>(
          "select count(*)::int as n from public.application_events where application_id = $1 and to_status = 'interview' and actor_user_id = $2",
          [SEED.applications.camilaSupport, SEED.owners.harbor],
        );
        return Number(res.rows[0]?.n) === 1;
      },
      { commit: false },
    ),
  );
  await expectError(
    "pending company cannot publish a job",
    northwindOwner,
    "update public.jobs set status = 'published' where id = $1",
    [SEED.jobs.dispatchPending],
    "company_not_verified",
  );
  await expectOk(
    "verified company publishes a job",
    brightlineOwner,
    "update public.jobs set status = 'published' where id = $1",
    [SEED.jobs.designerDraft],
  );
  await check("publishing sets published_at and slug", async () =>
    asUser(
      db,
      brightlineOwner,
      async (tx) => {
        await tx.query("update public.jobs set status = 'published' where id = $1", [
          SEED.jobs.designerDraft,
        ]);
        const res = await tx.query<{ published_at: string | null; slug: string | null }>(
          "select published_at, slug from public.jobs where id = $1",
          [SEED.jobs.designerDraft],
        );
        return (
          res.rows[0]?.published_at !== null &&
          (res.rows[0]?.slug ?? "").startsWith("product-designer-")
        );
      },
      { commit: false },
    ),
  );
  await expectOk(
    "company inserts a draft job",
    brightlineOwner,
    "insert into public.jobs (company_id, title, created_by) values ($1, 'New role', $2)",
    [SEED.companies.brightline, SEED.owners.brightline],
  );
  await expectError(
    "company cannot insert a job for another company",
    brightlineOwner,
    "insert into public.jobs (company_id, title, created_by) values ($1, 'New role', $2)",
    [SEED.companies.harbor, SEED.owners.brightline],
  );
  await expectError(
    "company cannot change its own status",
    northwindOwner,
    "update public.companies set status = 'verified' where id = $1",
    [SEED.companies.northwind],
    "company_fields_locked",
  );
  await check(
    "accepted member reads company jobs",
    async () => (await count(brightlineMember, "select * from public.jobs")) === 4,
  );
  await expectError(
    "member cannot invite members",
    brightlineMember,
    "insert into public.company_members (company_id, invited_email, invite_token) values ($1, 'x@y.com', 'tok')",
    [SEED.companies.brightline],
  );
  await expectOk(
    "owner invites a member",
    brightlineOwner,
    "insert into public.company_members (company_id, invited_email, invite_token, invited_by) values ($1, 'x@y.com', 'tok', $2)",
    [SEED.companies.brightline, SEED.owners.brightline],
  );
  await expectOk(
    "company adds a company-visible note",
    harborOwner,
    "insert into public.notes (candidate_id, application_id, author_user_id, body, visibility) values ($1, $2, $3, 'note', 'company')",
    [SEED.candidates.camila, SEED.applications.camilaSupport, SEED.owners.harbor],
  );
  await expectError(
    "company cannot add a dexee_only note",
    harborOwner,
    "insert into public.notes (candidate_id, application_id, author_user_id, body, visibility) values ($1, $2, $3, 'note', 'dexee_only')",
    [SEED.candidates.camila, SEED.applications.camilaSupport, SEED.owners.harbor],
  );
  await check("suspended company loses applicant access", async () =>
    asUser(
      db,
      harborOwner,
      async (tx) => {
        await asService(
          tx,
          () =>
            tx.query("update public.companies set status = 'suspended' where id = $1", [
              SEED.companies.harbor,
            ]),
          harborOwner,
        );
        const res = await tx.query<{ n: number }>(
          "select count(*)::int as n from public.applications",
        );
        return Number(res.rows[0]?.n) === 0;
      },
      { commit: false },
    ),
  );

  // Admin ---------------------------------------------------------------------------------
  await check(
    "admin reads all jobs",
    async () => (await count(admin, "select * from public.jobs")) === 8,
  );
  await check(
    "admin reads all candidates and contacts",
    async () =>
      (await count(admin, "select * from public.candidates")) === 8 &&
      (await count(admin, "select * from public.candidate_contacts")) === 8,
  );
  await check(
    "admin reads job_commercials",
    async () => (await count(admin, "select * from public.job_commercials")) === 2,
  );
  await check(
    "admin reads answer keys",
    async () => (await fails(admin, "select answer_key from public.assessment_questions")) === null,
  );
  await expectOk(
    "admin releases contact",
    admin,
    "update public.applications set contact_released = true, contact_released_by = $2, contact_released_at = now() where id = $1",
    [SEED.applications.andresFullStack, SEED.admin],
  );
  await expectOk(
    "admin publishes a pending company's job",
    admin,
    "update public.jobs set status = 'published' where id = $1",
    [SEED.jobs.dispatchPending],
  );
  await expectOk(
    "admin verifies a company",
    admin,
    "update public.companies set status = 'verified', verified_at = now(), verified_by = $2 where id = $1",
    [SEED.companies.northwind, SEED.admin],
  );

  // Completeness ----------------------------------------------------------------------------
  await check(
    "profile completeness computed for seeded candidate",
    async () =>
      (await count(
        admin,
        "select * from public.candidates where id = $1 and profile_completeness = 100",
        [SEED.candidates.laura],
      )) === 1,
  );
  await check(
    "profile completeness partial for sparse candidate",
    async () =>
      (await count(
        admin,
        "select * from public.candidates where id = $1 and profile_completeness = 55",
        [SEED.candidates.mariana],
      )) === 1,
  );

  return summary;
}
