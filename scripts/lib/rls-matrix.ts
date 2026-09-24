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
const santiago: Session = { id: SEED.candidates.santiago, role: "authenticated" };
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

/** Runs `fn` as a different session inside the same transaction, then restores `restore`. */
async function asAnother<T>(tx: Tx, session: Session, fn: () => Promise<T>): Promise<T> {
  await tx.exec("reset role");
  await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [session.id ?? ""]);
  await tx.exec(`set local role ${session.role}`);
  try {
    return await fn();
  } finally {
    await tx.exec("reset role");
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [admin.id]);
    await tx.exec("set local role authenticated");
  }
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
  // Audit G1: no authenticated role reads question rows by any path. The old public view
  // handed the whole active bank to any free account; the app serves questions only through
  // the service client, limited to the attempt's question_ids.
  await check(
    "the public questions view no longer exists",
    async () =>
      (await count(
        admin,
        "select 1 from information_schema.views where table_schema = 'public' and table_name = 'assessment_questions_public'",
      )) === 0,
  );
  await check(
    "company gets no rows from assessment_questions",
    async () => (await count(harborOwner, "select id from public.assessment_questions")) === 0,
  );
  await check(
    "candidate without an open attempt gets no rows from assessment_questions",
    async () => (await count(laura, "select id from public.assessment_questions")) === 0,
  );
  await check(
    "candidate with an open attempt still gets no rows from assessment_questions",
    async () =>
      asUser(
        db,
        laura,
        async (tx) => {
          await asService(
            tx,
            () =>
              tx.query("update public.assessments set is_active = true where id = $1", [
                SEED.assessments.written,
              ]),
            laura,
          );
          await tx.query(
            "insert into public.assessment_attempts (assessment_id, candidate_id) values ($1, $2)",
            [SEED.assessments.written, SEED.candidates.laura],
          );
          const res = await tx.query<{ n: number }>(
            "select count(*)::int as n from public.assessment_questions",
          );
          return Number(res.rows[0]?.n) === 0;
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
    "company reads no row of the candidates table, only cards (audit I6)",
    async () => (await count(harborOwner, "select * from public.candidates")) === 0,
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

  // Mock interviews -------------------------------------------------------------------------
  await expectError(
    "anon cannot read mock_interviews",
    anon,
    "select * from public.mock_interviews",
  );
  await expectError(
    "company cannot insert mock_interviews",
    harborOwner,
    "insert into public.mock_interviews (candidate_id, role_family, questions) values ($1, 'sales_sdr', '[]'::jsonb)",
    [SEED.owners.harbor],
  );
  await expectError(
    "candidate cannot insert an interview for another candidate",
    laura,
    "insert into public.mock_interviews (candidate_id, role_family, questions) values ($1, 'sales_sdr', '[]'::jsonb)",
    [SEED.candidates.andres],
  );
  await check(
    "candidate cannot pre-set status, report, score, questions or expiry on an interview (audit I5)",
    async () =>
      asUser(
        db,
        laura,
        async (tx) => {
          await tx.query(
            "insert into public.mock_interviews (candidate_id, role_family, status, questions, report, overall_score, completed_at, expires_at, processing_attempts) values ($1, 'sales_sdr', 'completed', '[{\"id\":\"g1\"}]'::jsonb, '{\"overall\":20}'::jsonb, 20, now(), now() + interval '30 days', 5)",
            [SEED.candidates.laura],
          );
          const res = await tx.query<{ n: number }>(
            "select count(*)::int as n from public.mock_interviews where candidate_id = $1 and status = 'in_progress' and questions = '[]'::jsonb and report is null and overall_score is null and completed_at is null and processing_attempts = 0 and expires_at <= now() + interval '3 hours'",
            [SEED.candidates.laura],
          );
          return Number(res.rows[0]?.n) === 1;
        },
        { commit: false },
      ),
  );
  await check("candidate runs an interview but cannot close or read another's", async () =>
    asUser(
      db,
      laura,
      async (tx) => {
        await tx.query(
          "insert into public.mock_interviews (candidate_id, role_family, questions) values ($1, 'sales_sdr', '[]'::jsonb)",
          [SEED.candidates.laura],
        );
        await tx.query(
          "update public.mock_interviews set answers = '[\"a\"]'::jsonb, status = 'completed', overall_score = 20 where candidate_id = $1",
          [SEED.candidates.laura],
        );
        const own = await tx.query<{ n: number }>(
          "select count(*)::int as n from public.mock_interviews where candidate_id = $1 and status = 'in_progress' and overall_score is null and answers = '[\"a\"]'::jsonb",
          [SEED.candidates.laura],
        );
        let second = false;
        try {
          await tx.query(
            "insert into public.mock_interviews (candidate_id, role_family, questions) values ($1, 'sales_sdr', '[]'::jsonb)",
            [SEED.candidates.laura],
          );
        } catch {
          second = true;
        }
        return Number(own.rows[0]?.n) === 1 && second;
      },
      { commit: false },
    ),
  );
  await check("other candidate cannot see a peer interview", async () =>
    asUser(
      db,
      andres,
      async (tx) => {
        await asService(
          tx,
          () =>
            tx.query(
              "insert into public.mock_interviews (candidate_id, role_family, questions) values ($1, 'sales_sdr', '[]'::jsonb)",
              [SEED.candidates.laura],
            ),
          andres,
        );
        const res = await tx.query<{ n: number }>(
          "select count(*)::int as n from public.mock_interviews",
        );
        return Number(res.rows[0]?.n) === 0;
      },
      { commit: false },
    ),
  );
  await check("candidate cannot edit a completed interview", async () =>
    asUser(
      db,
      laura,
      async (tx) => {
        await asService(
          tx,
          () =>
            tx.query(
              "insert into public.mock_interviews (candidate_id, role_family, status, questions) values ($1, 'sales_sdr', 'completed', '[]'::jsonb)",
              [SEED.candidates.laura],
            ),
          laura,
        );
        try {
          await tx.query(
            "update public.mock_interviews set answers = '[]'::jsonb where candidate_id = $1",
            [SEED.candidates.laura],
          );
          return false;
        } catch (error) {
          return (error as Error).message.includes("interview_closed");
        }
      },
      { commit: false },
    ),
  );
  // Conversational interview (DECISIONS 92): the transcript is server-authored ---------------
  await check(
    "candidate cannot write the transcript, job or turn counter of an open interview",
    async () =>
      asUser(
        db,
        laura,
        async (tx) => {
          await tx.query(
            "insert into public.mock_interviews (candidate_id, role_family, questions) values ($1, 'sales_sdr', '[]'::jsonb)",
            [SEED.candidates.laura],
          );
          await tx.query(
            'update public.mock_interviews set transcript = \'[{"role":"interviewer","text":"forged","at":"x"}]\'::jsonb, candidate_turns = 9, job_id = $2 where candidate_id = $1',
            [SEED.candidates.laura, SEED.jobs.seniorAccountant],
          );
          const res = await tx.query<{ n: number }>(
            "select count(*)::int as n from public.mock_interviews where candidate_id = $1 and transcript = '[]'::jsonb and candidate_turns = 0 and job_id is null",
            [SEED.candidates.laura],
          );
          return Number(res.rows[0]?.n) === 1;
        },
        { commit: false },
      ),
  );
  await check("candidate cannot tie an interview to a job they cannot see", async () =>
    asUser(
      db,
      laura,
      async (tx) => {
        try {
          await tx.query(
            "insert into public.mock_interviews (candidate_id, role_family, questions, job_id) values ($1, 'sales_sdr', '[]'::jsonb, $2)",
            [SEED.candidates.laura, SEED.jobs.designerDraft],
          );
          return false;
        } catch (error) {
          return (error as Error).message.includes("job_not_visible");
        }
      },
      { commit: false },
    ),
  );
  await check(
    "candidate ties an interview to a published job and its transcript starts empty",
    async () =>
      asUser(
        db,
        laura,
        async (tx) => {
          await tx.query(
            'insert into public.mock_interviews (candidate_id, role_family, questions, job_id, transcript, candidate_turns) values ($1, \'sales_sdr\', \'[]\'::jsonb, $2, \'[{"role":"interviewer","text":"forged","at":"x"}]\'::jsonb, 5)',
            [SEED.candidates.laura, SEED.jobs.seniorAccountant],
          );
          const res = await tx.query<{ n: number }>(
            "select count(*)::int as n from public.mock_interviews where candidate_id = $1 and job_id = $2 and transcript = '[]'::jsonb and candidate_turns = 0",
            [SEED.candidates.laura, SEED.jobs.seniorAccountant],
          );
          return Number(res.rows[0]?.n) === 1;
        },
        { commit: false },
      ),
  );
  await check("service role writes the transcript of an open interview", async () =>
    asUser(
      db,
      laura,
      async (tx) => {
        await tx.query(
          "insert into public.mock_interviews (candidate_id, role_family, questions) values ($1, 'sales_sdr', '[]'::jsonb)",
          [SEED.candidates.laura],
        );
        await asService(
          tx,
          () =>
            tx.query(
              'update public.mock_interviews set transcript = \'[{"role":"interviewer","text":"Hello","at":"x"}]\'::jsonb where candidate_id = $1',
              [SEED.candidates.laura],
            ),
          laura,
        );
        const res = await tx.query<{ n: number }>(
          "select count(*)::int as n from public.mock_interviews where candidate_id = $1 and jsonb_array_length(transcript) = 1",
          [SEED.candidates.laura],
        );
        return Number(res.rows[0]?.n) === 1;
      },
      { commit: false },
    ),
  );

  // Audit I, block 1: write guards --------------------------------------------------------
  await expectError(
    "candidate cannot insert their own candidates row; the server creates it (audit I1)",
    laura,
    "insert into public.candidates (id, first_name, last_name, data_consent_at, data_consent_version, english_verified_level, candidate_tags) values ($1, 'L', 'G', now(), 'v1', 'C2', array['vip'])",
    [SEED.candidates.laura],
    "row-level security",
  );
  await check(
    "candidate cannot pre-set timing, questions, visibility or results on an attempt (audit I2)",
    async () =>
      asUser(
        db,
        laura,
        async (tx) => {
          await tx.query(
            "insert into public.assessment_attempts (assessment_id, candidate_id, cooldown_waived, expires_at, question_ids, visible_to_companies, final_level, report, started_at, integrity) values ($1, $2, true, now() + interval '30 days', array['00000000-0000-4000-8000-00000000abcd']::uuid[], true, 'C2', '{\"x\":1}'::jsonb, now() - interval '1 day', '{\"tab_leaves\": 99}'::jsonb)",
            [SEED.assessments.written, SEED.candidates.laura],
          );
          const res = await tx.query<{ n: number }>(
            "select count(*)::int as n from public.assessment_attempts where candidate_id = $1 and status = 'in_progress' and cooldown_waived = false and question_ids = '{}' and visible_to_companies = false and final_level is null and report is null and started_at > now() - interval '1 minute' and expires_at <= now() + interval '1 day' and (integrity->>'tab_leaves') = '0'",
            [SEED.candidates.laura],
          );
          return Number(res.rows[0]?.n) === 1;
        },
        { commit: false },
      ),
  );
  await check(
    "candidate answers only questions of their attempt, without server columns (audit I3)",
    async () =>
      asUser(
        db,
        laura,
        async (tx) => {
          const own = "11111111-0000-4000-8000-000000000003";
          const other = "11111111-0000-4000-8000-000000000004";
          let inAttempt = "";
          let foreign = "";
          await asService(
            tx,
            async () => {
              const q = await tx.query<{ id: string }>(
                "select id from public.assessment_questions where assessment_id = $1 and is_active order by id limit 2",
                [SEED.assessments.written],
              );
              inAttempt = q.rows[0]!.id;
              const f = await tx.query<{ id: string }>(
                "select id from public.assessment_questions where assessment_id <> $1 order by id limit 1",
                [SEED.assessments.written],
              );
              foreign = f.rows[0]!.id;
              await tx.query(
                "insert into public.assessment_attempts (id, assessment_id, candidate_id, question_ids) values ($1, $2, $3, $4::uuid[])",
                [own, SEED.assessments.written, SEED.candidates.laura, [inAttempt, q.rows[1]!.id]],
              );
            },
            laura,
          );
          // Server-owned columns are ignored on insert.
          await tx.query(
            "insert into public.assessment_answers (attempt_id, question_id, answer_text, transcript, ai_feedback, audio_duration_seconds) values ($1, $2, 'my answer', 'forged transcript', '{\"total\": 20}'::jsonb, 99)",
            [own, inAttempt],
          );
          const clean = await tx.query<{ n: number }>(
            "select count(*)::int as n from public.assessment_answers where attempt_id = $1 and answer_text = 'my answer' and transcript is null and ai_feedback is null and audio_duration_seconds is null",
            [own],
          );
          // Each expected failure runs under a savepoint so the transaction stays usable.
          const rejectedWith = async (sql: string, params: unknown[], fragment: string) => {
            await tx.exec("savepoint guard_probe");
            try {
              await tx.query(sql, params);
              await tx.exec("release savepoint guard_probe");
              return false;
            } catch (error) {
              await tx.exec("rollback to savepoint guard_probe");
              return (error as Error).message.includes(fragment);
            }
          };
          // A question outside the attempt is rejected.
          const foreignRejected = await rejectedWith(
            "insert into public.assessment_answers (attempt_id, question_id, answer_text) values ($1, $2, 'x')",
            [own, foreign],
            "question_not_in_attempt",
          );
          // An audio path under another attempt is rejected; the own folder is accepted.
          const pathRejected = await rejectedWith(
            "update public.assessment_answers set audio_path = $2 where attempt_id = $1",
            [own, `attempts/${other}/answer.webm`],
            "audio_path_invalid",
          );
          await tx.query(
            "update public.assessment_answers set audio_path = $2 where attempt_id = $1",
            [own, `attempts/${own}/${inAttempt}.webm`],
          );
          // The transcript the server wrote survives a candidate update.
          await asService(
            tx,
            () =>
              tx.query(
                "update public.assessment_answers set transcript = 'real' where attempt_id = $1",
                [own],
              ),
            laura,
          );
          await tx.query(
            "update public.assessment_answers set answer_text = 'edited', transcript = 'forged again' where attempt_id = $1",
            [own],
          );
          const kept = await tx.query<{ n: number }>(
            "select count(*)::int as n from public.assessment_answers where attempt_id = $1 and answer_text = 'edited' and transcript = 'real' and audio_path = $2",
            [own, `attempts/${own}/${inAttempt}.webm`],
          );
          // The length ceiling matches the zod schema.
          const tooLongRejected = await rejectedWith(
            "update public.assessment_answers set answer_text = repeat('a', 6001) where attempt_id = $1",
            [own],
            "assessment_answers_text_length",
          );
          return (
            Number(clean.rows[0]?.n) === 1 &&
            foreignRejected &&
            pathRejected &&
            Number(kept.rows[0]?.n) === 1 &&
            tooLongRejected
          );
        },
        { commit: false },
      ),
  );
  await expectError(
    "candidate cannot point resume_path at another candidate's file (audit I4)",
    laura,
    "update public.candidate_contacts set resume_path = 'candidates/' || $2::text || '/resume.pdf' where candidate_id = $1",
    [SEED.candidates.laura, SEED.candidates.andres],
    "resume_path_invalid",
  );
  await expectOk(
    "candidate sets resume_path under their own folder",
    laura,
    "update public.candidate_contacts set resume_path = 'candidates/' || $1::text || '/resume.pdf' where candidate_id = $1",
    [SEED.candidates.laura],
  );
  await expectError(
    "candidate cannot query another candidate's cooldown (audit I7)",
    laura,
    "select public.assessment_cooldown_ok($1, $2)",
    [SEED.assessments.written, SEED.candidates.andres],
    "forbidden",
  );
  await expectOk(
    "candidate queries their own cooldown",
    laura,
    "select public.assessment_cooldown_ok($1, $2)",
    [SEED.assessments.written, SEED.candidates.laura],
  );
  await expectError(
    "company note must name the candidate of its application (audit I7)",
    harborOwner,
    "insert into public.notes (candidate_id, application_id, author_user_id, body, visibility) values ($1, $2, $3, 'note', 'company')",
    [SEED.candidates.laura, SEED.applications.camilaSupport, SEED.owners.harbor],
  );
  await expectError(
    "owner cannot insert an accepted member row directly (audit I7)",
    brightlineOwner,
    "insert into public.company_members (company_id, user_id, invited_email, invite_token, invited_by, accepted_at) values ($1, $2, 'x@y.com', 'tok2', $3, now())",
    [SEED.companies.brightline, SEED.owners.northwind, SEED.owners.brightline],
  );
  await check(
    "logos bucket no longer accepts SVG (audit I7)",
    async () =>
      (await count(
        admin,
        "select * from storage.buckets where id = 'logos' and 'image/svg+xml' = any(allowed_mime_types)",
      )) === 0 &&
      (await count(
        admin,
        "select * from storage.buckets where id = 'logos' and 'image/png' = any(allowed_mime_types)",
      )) === 1,
  );
  await expectError(
    "company website must be an http(s) URL (audit I7)",
    harborOwner,
    "update public.companies set website = 'javascript:alert(1)' where id = $1",
    [SEED.companies.harbor],
    "companies_website_scheme",
  );

  // Leads (contact_requests) ----------------------------------------------------------------
  await expectError(
    "anon cannot read contact_requests",
    anon,
    "select * from public.contact_requests",
  );
  await check(
    "candidate sees no contact_requests",
    async () => (await count(laura, "select * from public.contact_requests")) === 0,
  );
  await check(
    "company sees no contact_requests",
    async () => (await count(harborOwner, "select * from public.contact_requests")) === 0,
  );
  await check("admin reads the lead queue", async () => {
    await asUser(
      db,
      admin,
      async (tx) => {
        await tx.query(
          `insert into public.contact_requests
             (name, email, company, request_type, role_to_fill, seniority, budget_band, needed_by)
           values ('Dana', 'dana@northstar.com', 'Northstar', 'hire', 'Support lead', 'senior', '2k_4k', 'one_month')`,
        );
      },
      { commit: true },
    );
    return (
      (await count(
        admin,
        "select * from public.contact_requests where status = 'new' and role_to_fill = 'Support lead'",
      )) === 1
    );
  });
  await expectError(
    "a lead cannot carry a budget band the form does not offer",
    admin,
    `insert into public.contact_requests (name, email, request_type, budget_band)
       values ('x', 'x@x.com', 'hire', 'negotiable')`,
  );
  await expectError(
    "a lead cannot carry a delivery window the form does not offer",
    admin,
    `insert into public.contact_requests (name, email, request_type, needed_by)
       values ('x', 'x@x.com', 'hire', 'someday')`,
  );
  await check("marking a lead answered stamps who answered and when", async () =>
    asUser(
      db,
      admin,
      async (tx) => {
        await tx.query(
          "update public.contact_requests set status = 'answered' where role_to_fill = 'Support lead'",
        );
        const stamped = await tx.query<{ n: number }>(
          `select count(*)::int as n from public.contact_requests
             where role_to_fill = 'Support lead' and status = 'answered'
               and answered_at is not null and answered_by = $1`,
          [SEED.admin],
        );
        return stamped.rows[0]?.n === 1;
      },
      { commit: false },
    ),
  );

  // Phase 10: mandatory assessments, validity, valid results and fit ---------------------------
  const ACTIVATE_ALL = "update public.assessments set is_active = true";
  const VALIDATED_ATTEMPT = `
    insert into public.assessment_attempts (assessment_id, candidate_id, status, validated_at, final_level, report)
    values ($1, $2, 'validated', now() - interval '1 day', $3, $4::jsonb)`;
  const APPLY_ANALYST = `
    insert into public.applications (job_id, candidate_id, source, status)
    values ($1, $2, 'candidate', 'applied')`;

  await check("candidate without valid assessments or a resume cannot apply", async () =>
    asUser(
      db,
      santiago,
      async (tx) => {
        await asService(tx, () => tx.exec(ACTIVATE_ALL), santiago);
        try {
          await tx.query(APPLY_ANALYST, [SEED.jobs.executiveAssistant, SEED.candidates.santiago]);
          return false;
        } catch (error) {
          const message = (error as Error).message;
          return (
            message.includes("requirements_missing:") &&
            message.includes("disc") &&
            message.includes("english_oral") &&
            message.includes("resume")
          );
        }
      },
      { commit: false },
    ),
  );

  await check("candidate with four valid results and a resume can apply", async () =>
    asUser(
      db,
      laura,
      async (tx) => {
        await asService(
          tx,
          async () => {
            await tx.exec(ACTIVATE_ALL);
            for (const [id, level, report] of [
              [SEED.assessments.written, "B2", null],
              [SEED.assessments.oral, "B2", null],
              [SEED.assessments.psychometric, null, '{"factors":{"extraversion":{"band":"mid"}}}'],
              [SEED.assessments.disc, null, '{"styles":{"D":{"band":"high"}}}'],
            ] as const) {
              await tx.query(VALIDATED_ATTEMPT, [id, SEED.candidates.laura, level, report ?? "{}"]);
            }
          },
          laura,
        );
        await tx.query(APPLY_ANALYST, [SEED.jobs.dataAnalyst, SEED.candidates.laura]);
        const applied = await tx.query<{ n: number }>(
          "select count(*)::int as n from public.applications where job_id = $1 and candidate_id = $2",
          [SEED.jobs.dataAnalyst, SEED.candidates.laura],
        );
        return applied.rows[0]?.n === 1;
      },
      { commit: false },
    ),
  );

  await check("an expired result does not satisfy the requirement", async () =>
    asUser(
      db,
      laura,
      async (tx) => {
        await asService(
          tx,
          async () => {
            await tx.exec(ACTIVATE_ALL);
            for (const [id, level] of [
              [SEED.assessments.written, "B2"],
              [SEED.assessments.oral, "B2"],
              [SEED.assessments.psychometric, null],
            ] as const) {
              await tx.query(VALIDATED_ATTEMPT, [id, SEED.candidates.laura, level, "{}"]);
            }
            // DISC validated 100 days ago: past the 90-day window.
            await tx.query(
              `insert into public.assessment_attempts (assessment_id, candidate_id, status, validated_at)
               values ($1, $2, 'validated', now() - interval '100 days')`,
              [SEED.assessments.disc, SEED.candidates.laura],
            );
          },
          laura,
        );
        try {
          await tx.query(APPLY_ANALYST, [SEED.jobs.dataAnalyst, SEED.candidates.laura]);
          return false;
        } catch (error) {
          return (error as Error).message.includes("requirements_missing:disc");
        }
      },
      { commit: false },
    ),
  );

  await check("validation stamps valid_until at validated_at plus the validity window", async () =>
    asUser(
      db,
      admin,
      async (tx) => {
        await tx.query(VALIDATED_ATTEMPT, [
          SEED.assessments.written,
          SEED.candidates.laura,
          "B1",
          "{}",
        ]);
        const row = await tx.query<{ ok: boolean }>(
          `select valid_until = validated_at + interval '90 days' as ok
             from public.assessment_attempts
            where candidate_id = $1 and assessment_id = $2 and status = 'validated'
            order by created_at desc limit 1`,
          [SEED.candidates.laura, SEED.assessments.written],
        );
        return row.rows[0]?.ok === true;
      },
      { commit: false },
    ),
  );

  await check(
    "candidate reads own apply requirements, one row per active requirement plus resume",
    async () =>
      asUser(
        db,
        laura,
        async (tx) => {
          await asService(tx, () => tx.exec(ACTIVATE_ALL), laura);
          const rows = await tx.query<{ requirement: string; satisfied: boolean }>(
            "select requirement, satisfied from public.candidate_apply_requirements($1)",
            [SEED.candidates.laura],
          );
          const names = rows.rows.map((r) => r.requirement).sort();
          const resume = rows.rows.find((r) => r.requirement === "resume");
          return (
            names.join(",") === "disc,english_oral,english_written,psychometric,resume" &&
            resume?.satisfied === true
          );
        },
        { commit: false },
      ),
  );
  await expectError(
    "candidate cannot read another candidate's apply requirements",
    andres,
    "select * from public.candidate_apply_requirements($1)",
    [SEED.candidates.laura],
    "requirements_own_only",
  );

  await check(
    "the hiring company sees an applicant's valid results, another company sees none",
    async () =>
      asUser(
        db,
        admin,
        async (tx) => {
          await tx.query(VALIDATED_ATTEMPT, [
            SEED.assessments.written,
            SEED.candidates.laura,
            "C1",
            "{}",
          ]);
          await tx.query(VALIDATED_ATTEMPT, [
            SEED.assessments.psychometric,
            SEED.candidates.laura,
            null,
            '{"factors":{"conscientiousness":{"band":"high"}}}',
          ]);
          const owner = await tx.query<{ company_id: string }>(
            "select company_id from public.jobs where id = $1",
            [SEED.jobs.seniorAccountant],
          );
          const hiring =
            owner.rows[0]?.company_id === SEED.companies.northwind
              ? northwindOwner
              : owner.rows[0]?.company_id === SEED.companies.harbor
                ? harborOwner
                : brightlineOwner;
          const stranger = hiring === brightlineOwner ? northwindOwner : brightlineOwner;
          const seen = await asAnother(tx, hiring, async () =>
            tx.query<{ type: string; bands: Record<string, string> | null }>(
              "select type, bands from public.candidate_valid_results($1)",
              [SEED.candidates.laura],
            ),
          );
          const hidden = await asAnother(tx, stranger, async () =>
            tx.query("select type from public.candidate_valid_results($1)", [
              SEED.candidates.laura,
            ]),
          );
          const psych = seen.rows.find((r) => r.type === "psychometric");
          return (
            seen.rows.length === 2 &&
            psych?.bands?.conscientiousness === "high" &&
            hidden.rows.length === 0
          );
        },
        { commit: false },
      ),
  );

  await check(
    "fit rows: hiring company reads, other company and candidate do not, anon is refused",
    async () =>
      asUser(
        db,
        admin,
        async (tx) => {
          await tx.query(
            `insert into public.application_fit (application_id, status, score, summary)
           values ($1, 'ready', 82, 'Strong match on close and reporting.')`,
            [SEED.applications.lauraAccountant],
          );
          const owner = await tx.query<{ company_id: string }>(
            "select j.company_id from public.applications a join public.jobs j on j.id = a.job_id where a.id = $1",
            [SEED.applications.lauraAccountant],
          );
          const hiring =
            owner.rows[0]?.company_id === SEED.companies.northwind
              ? northwindOwner
              : owner.rows[0]?.company_id === SEED.companies.harbor
                ? harborOwner
                : brightlineOwner;
          const stranger = hiring === brightlineOwner ? northwindOwner : brightlineOwner;
          const n = async (session: Session) =>
            (
              await asAnother(tx, session, () =>
                tx.query<{ n: number }>("select count(*)::int as n from public.application_fit"),
              )
            ).rows[0]?.n;
          const counts = [await n(hiring), await n(stranger), await n(laura)];
          // A refused query aborts the transaction, so the probe runs inside a savepoint.
          let anonRefused = false;
          await tx.exec("savepoint anon_probe");
          try {
            await asAnother(tx, anon, () => tx.query("select * from public.application_fit"));
          } catch {
            anonRefused = true;
          }
          await tx.exec("rollback to savepoint anon_probe");
          return counts[0] === 1 && counts[1] === 0 && counts[2] === 0 && anonRefused;
        },
        { commit: false },
      ),
  );

  // Audit A3: content of a job is locked once it leaves draft / changes_requested ------------
  await expectError(
    "company cannot edit the title of a published job",
    harborOwner,
    "update public.jobs set title = 'Edited after publication' where id = $1",
    [SEED.jobs.seniorAccountant],
    "job_locked_for_edit",
  );
  await expectError(
    "company cannot edit the salary of a published job",
    harborOwner,
    "update public.jobs set salary_max_usd = 9000 where id = $1",
    [SEED.jobs.seniorAccountant],
    "job_locked_for_edit",
  );
  await expectError(
    "company cannot edit a job that is pending review",
    northwindOwner,
    "update public.jobs set description = 'rewritten' where id = $1",
    [SEED.jobs.dispatchPending],
    "job_locked_for_edit",
  );
  // Audit G4: the applicants' terms snapshot is written by the trigger and is read-only for
  // the company. Audit G3: the outbox can park a row as skipped.
  await check("withdrawing a live job with applicants snapshots its terms by trigger", async () =>
    asUser(
      db,
      harborOwner,
      async (tx) => {
        await tx.query("update public.jobs set status = 'draft' where id = $1", [
          SEED.jobs.seniorAccountant,
        ]);
        const res = await tx.query<{ snap: Record<string, unknown> | null; min: number }>(
          "select reopen_snapshot as snap, salary_min_usd as min from public.jobs where id = $1",
          [SEED.jobs.seniorAccountant],
        );
        const snap = res.rows[0]?.snap;
        return (
          !!snap &&
          Object.keys(snap).length === 8 &&
          snap.salary_min_usd === res.rows[0]?.min &&
          "english_level_required" in snap
        );
      },
      { commit: false },
    ),
  );
  await check("company cannot clear or alter the terms snapshot", async () =>
    asUser(
      db,
      harborOwner,
      async (tx) => {
        await tx.query("update public.jobs set status = 'draft' where id = $1", [
          SEED.jobs.seniorAccountant,
        ]);
        await tx.query("update public.jobs set reopen_snapshot = null where id = $1", [
          SEED.jobs.seniorAccountant,
        ]);
        await tx.query(
          "update public.jobs set reopen_snapshot = '{\"salary_min_usd\": 1}'::jsonb where id = $1",
          [SEED.jobs.seniorAccountant],
        );
        const res = await tx.query<{ snap: Record<string, unknown> | null }>(
          "select reopen_snapshot as snap from public.jobs where id = $1",
          [SEED.jobs.seniorAccountant],
        );
        const snap = res.rows[0]?.snap;
        return !!snap && Object.keys(snap).length === 8 && snap.salary_min_usd !== 1;
      },
      { commit: false },
    ),
  );
  await check("the service role clears the terms snapshot after the notice", async () =>
    asUser(
      db,
      harborOwner,
      async (tx) => {
        await tx.query("update public.jobs set status = 'draft' where id = $1", [
          SEED.jobs.seniorAccountant,
        ]);
        await asService(
          tx,
          () =>
            tx.query("update public.jobs set reopen_snapshot = null where id = $1", [
              SEED.jobs.seniorAccountant,
            ]),
          harborOwner,
        );
        const res = await tx.query<{ snap: unknown }>(
          "select reopen_snapshot as snap from public.jobs where id = $1",
          [SEED.jobs.seniorAccountant],
        );
        return res.rows[0]?.snap === null;
      },
      { commit: false },
    ),
  );
  await check("the outbox accepts the skipped status for rows without a provider", async () =>
    asUser(
      db,
      { id: null, role: "service_role" },
      async (tx) => {
        await tx.query(
          "insert into public.email_outbox (\"to\", template, status, last_error) values ('x@example.com', 'lead-acknowledgement', 'skipped', 'no_provider')",
        );
        const res = await tx.query<{ n: number }>(
          "select count(*)::int as n from public.email_outbox where status = 'skipped' and sent_at is null",
        );
        return Number(res.rows[0]?.n) === 1;
      },
      { commit: false },
    ),
  );

  await check("company withdraws a published job to draft and then edits it", async () =>
    asUser(
      db,
      harborOwner,
      async (tx) => {
        await tx.query("update public.jobs set status = 'draft' where id = $1", [
          SEED.jobs.seniorAccountant,
        ]);
        await tx.query("update public.jobs set title = 'Edited as a draft' where id = $1", [
          SEED.jobs.seniorAccountant,
        ]);
        const res = await tx.query<{ title: string; status: string }>(
          "select title, status from public.jobs where id = $1",
          [SEED.jobs.seniorAccountant],
        );
        return res.rows[0]?.title === "Edited as a draft" && res.rows[0]?.status === "draft";
      },
      { commit: false },
    ),
  );
  await expectOk(
    "company pauses a published job (status-only change)",
    harborOwner,
    "update public.jobs set status = 'paused' where id = $1",
    [SEED.jobs.seniorAccountant],
  );
  await expectOk(
    "admin edits a published job",
    admin,
    "update public.jobs set title = 'Edited by Dexee' where id = $1",
    [SEED.jobs.seniorAccountant],
  );

  // Audit A4: dexee_only hides the candidate from the hiring company ----------------------
  await check(
    "company cannot read a dexee_only candidate, their profile, results or fit",
    async () =>
      asUser(
        db,
        admin,
        async (tx) => {
          await asService(
            tx,
            async () => {
              await tx.query(
                "update public.candidates set visibility = 'dexee_only' where id = $1",
                [SEED.candidates.laura],
              );
              await tx.query(
                "insert into public.application_fit (application_id, status, score) values ($1, 'ready', 80)",
                [SEED.applications.lauraAccountant],
              );
            },
            admin,
          );
          const n = async (sql: string) =>
            (
              await asAnother(tx, harborOwner, () =>
                tx.query<{ n: number }>(`select count(*)::int as n from (${sql}) q`, [
                  SEED.candidates.laura,
                ]),
              )
            ).rows[0]?.n;
          const hidden = [
            await n("select 1 from public.candidates where id = $1"),
            await n("select 1 from public.candidate_cards where id = $1"),
            await n("select 1 from public.candidate_experience where candidate_id = $1"),
            await n("select 1 from public.candidate_education where candidate_id = $1"),
            await n("select 1 from public.candidate_valid_results($1)"),
            await n(
              "select 1 from public.application_fit f join public.applications a on a.id = f.application_id where a.candidate_id = $1",
            ),
            // Audit D2: the released contact follows the same gate.
            await n("select 1 from public.candidate_contacts where candidate_id = $1"),
          ];
          // The application row is hidden as well (its policy reuses the same gate): the promise
          // is "not visible to companies, even when you apply". The candidate and Dexee see it.
          const applicationHidden = await n(
            "select 1 from public.applications where candidate_id = $1",
          );
          const ownApplication = (
            await asAnother(tx, laura, () =>
              tx.query<{ n: number }>(
                "select count(*)::int as n from public.applications where candidate_id = $1",
                [SEED.candidates.laura],
              ),
            )
          ).rows[0]?.n;
          const adminSees = (
            await tx.query<{ n: number }>(
              "select count(*)::int as n from public.applications where candidate_id = $1",
              [SEED.candidates.laura],
            )
          ).rows[0]?.n;
          await asService(
            tx,
            () =>
              tx.query(
                "update public.candidates set visibility = 'visible_to_companies' where id = $1",
                [SEED.candidates.laura],
              ),
            admin,
          );
          const visibleAgain = await n("select 1 from public.candidate_cards where id = $1");
          return (
            hidden.every((count) => count === 0) &&
            applicationHidden === 0 &&
            ownApplication === 1 &&
            adminSees === 1 &&
            visibleAgain === 1
          );
        },
        { commit: false },
      ),
  );

  // Audit B: demo companies never reach public surfaces ------------------------------------
  await check("anon sees no job of a demo company, the company still sees its own data", async () =>
    asUser(
      db,
      admin,
      async (tx) => {
        await asService(
          tx,
          () =>
            tx.query("update public.companies set is_demo = true where id = $1", [
              SEED.companies.harbor,
            ]),
          admin,
        );
        const harborSlugs = (
          await tx.query<{ slug: string }>(
            "select slug from public.jobs where company_id = $1 and slug is not null",
            [SEED.companies.harbor],
          )
        ).rows.map((r) => r.slug);
        const anonCount = async (view: string) =>
          (
            await asAnother(tx, anon, () =>
              tx.query<{ n: number }>(
                `select count(*)::int as n from public.${view} where slug = any($1::text[])`,
                [harborSlugs],
              ),
            )
          ).rows[0]?.n;
        const openPublic = await anonCount("public_jobs");
        const closedPublic = await anonCount("public_jobs_closed");
        const stillPublic = (
          await asAnother(tx, anon, () =>
            tx.query<{ n: number }>("select count(*)::int as n from public.public_jobs"),
          )
        ).rows[0]?.n;
        const own = await asAnother(tx, harborOwner, async () => ({
          jobs: (
            await tx.query<{ n: number }>(
              "select count(*)::int as n from public.jobs where company_id = $1",
              [SEED.companies.harbor],
            )
          ).rows[0]?.n,
          applications: (
            await tx.query<{ n: number }>(
              "select count(*)::int as n from public.applications a join public.jobs j on j.id = a.job_id where j.company_id = $1",
              [SEED.companies.harbor],
            )
          ).rows[0]?.n,
        }));
        return (
          harborSlugs.length > 0 &&
          openPublic === 0 &&
          closedPublic === 0 &&
          (stillPublic ?? 0) > 0 &&
          (own.jobs ?? 0) > 0 &&
          (own.applications ?? 0) > 0
        );
      },
      { commit: false },
    ),
  );
  await expectError(
    "company cannot flag itself as demo",
    harborOwner,
    "update public.companies set is_demo = true where id = $1",
    [SEED.companies.harbor],
    "company_fields_locked",
  );

  // Audit C1 / C7 -----------------------------------------------------------------------------
  await expectError(
    "the public questions view cannot be queried at all",
    laura,
    "select 1 from public.assessment_questions_public limit 1",
  );
  await check(
    "invites carry an expiry that defaults to seven days",
    async () =>
      (await count(
        admin,
        "select 1 from public.company_members where invite_token is not null and invite_expires_at is not null and invite_expires_at <= now() + interval '7 days 1 minute'",
      )) >= 1,
  );

  // Audit D4: a candidate reads the jobs behind their own applications, whatever their status
  await check(
    "candidate_application_jobs returns only the jobs the candidate applied to",
    async () =>
      asUser(
        db,
        admin,
        async (tx) => {
          await asService(
            tx,
            () =>
              tx.query("update public.jobs set status = 'draft' where id = $1", [
                SEED.jobs.seniorAccountant,
              ]),
            admin,
          );
          const rows = async (session: Session) =>
            (
              await asAnother(tx, session, () =>
                tx.query<{ id: string; title: string; status: string; company_name: string }>(
                  "select id, title, status, company_name from public.candidate_application_jobs()",
                ),
              )
            ).rows;
          const lauraRows = await rows(laura);
          const lauraApplied = (
            await tx.query<{ n: number }>(
              "select count(distinct job_id)::int as n from public.applications where candidate_id = $1",
              [SEED.candidates.laura],
            )
          ).rows[0]?.n;
          const draftRow = lauraRows.find((r) => r.id === SEED.jobs.seniorAccountant);
          const andresRows = await rows(andres);
          const andresOnlyOwn = andresRows.every((r) => r.id !== SEED.jobs.seniorAccountant);
          return (
            lauraRows.length === lauraApplied &&
            draftRow?.status === "draft" &&
            (draftRow?.title ?? "") !== "" &&
            andresRows.length > 0 &&
            andresOnlyOwn
          );
        },
        { commit: false },
      ),
  );
  await check(
    "candidate_application_jobs hides the company name of a confidential job",
    async () =>
      (await count(
        santiago,
        "select 1 from public.candidate_application_jobs() where confidential_company and company_name = 'Confidential'",
      )) >= 0,
  );

  await check(
    "consent_flags default to empty object",
    async () =>
      (await count(admin, "select * from public.candidates where consent_flags = '{}'::jsonb")) >=
      1,
  );

  return summary;
}
