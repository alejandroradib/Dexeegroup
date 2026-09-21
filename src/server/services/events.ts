import "server-only";

import { after } from "next/server";

import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { processOutbox } from "@/server/services/outbox";
import type { Database, Json } from "@/types/database";

type Locale = Database["public"]["Enums"]["locale"];

/** Event catalogue (SPEC section 12). Each event maps to an in-app notification and/or an email template. */
export type PlatformEvent =
  | { type: "company_status"; companyId: string; status: "verified" | "suspended" | "pending" }
  | {
      type: "job_status";
      jobId: string;
      status: "published" | "changes_requested" | "approved";
      message?: string;
    }
  | { type: "new_application"; applicationId: string }
  | {
      type: "application_status";
      applicationId: string;
      status: Database["public"]["Enums"]["application_status"];
    }
  | { type: "contact_requested"; applicationId: string }
  | { type: "contact_released"; applicationId: string }
  | { type: "recommendation"; applicationId: string }
  | {
      type: "assessment_result";
      attemptId: string;
      stage: "scored" | "pending_validation" | "validated" | "failed";
    }
  | { type: "team_invite"; memberId: string; token: string }
  | { type: "admin_invite"; email: string; locale: Locale }
  | { type: "placement_pending"; applicationId: string }
  | { type: "data_request"; dataRequestId: string }
  | { type: "processing_failed"; attemptId: string }
  | { type: "lead_received"; leadId: string };

type Recipient = { userId: string; email: string; locale: Locale; digest: boolean };

const COPY: Record<Locale, Record<string, { title: string; body: string }>> = {
  en: {
    company_verified: {
      title: "Your company is verified",
      body: "You can now publish vacancies directly.",
    },
    company_suspended: {
      title: "Your company was suspended",
      body: "Contact Dexee to resolve the issue.",
    },
    company_pending: {
      title: "Your company is pending verification",
      body: "Dexee verifies companies within one business day.",
    },
    job_published: { title: "Vacancy published: {job}", body: "Candidates can now apply." },
    job_approved: {
      title: "Vacancy approved: {job}",
      body: "Dexee approved and published the vacancy.",
    },
    job_changes_requested: { title: "Changes requested: {job}", body: "{message}" },
    new_application: { title: "New application: {job}", body: "{candidate} applied." },
    application_status: {
      title: "Your application moved to {status}",
      body: "{company} updated your application for {job}.",
    },
    contact_requested: {
      title: "Contact details requested",
      body: "{company} requested contact details for {candidate} on {job}.",
    },
    contact_released: {
      title: "Contact details released",
      body: "Dexee released contact details for {candidate} on {job}.",
    },
    recommendation_company: {
      title: "Dexee recommended a candidate",
      body: "{candidate} was shortlisted for {job}.",
    },
    recommendation_candidate: {
      title: "Dexee recommended you for a role",
      body: "You were shortlisted for {job} at {company}.",
    },
    assessment_scored: {
      title: "Your {assessment} result is ready",
      body: "Open your assessments to see the result.",
    },
    assessment_pending_validation: {
      title: "Your {assessment} is pending Dexee validation",
      body: "A reviewer will validate it shortly.",
    },
    assessment_validated: {
      title: "Your {assessment} was validated",
      body: "The result now appears on your profile.",
    },
    assessment_failed: {
      title: "We could not process your {assessment}",
      body: "Dexee will review it and get back to you.",
    },
    placement_pending: {
      title: "Placement pending",
      body: "{candidate} was hired for {job} at {company}. Record the placement.",
    },
    data_request: { title: "Data request received", body: "{candidate} requested {kind}." },
    lead_received: {
      title: "New lead: {role}",
      body: "{name} at {company} needs a {seniority} {role}, {needed}. Answer within one business day.",
    },
    processing_failed: {
      title: "Assessment processing failed",
      body: "Attempt {attempt} failed three times and needs a retry.",
    },
  },
  es: {
    company_verified: {
      title: "Su empresa fue verificada",
      body: "Ya puede publicar vacantes directamente.",
    },
    company_suspended: {
      title: "Su empresa fue suspendida",
      body: "Contacte a Dexee para resolverlo.",
    },
    company_pending: {
      title: "Su empresa está pendiente de verificación",
      body: "Dexee verifica las empresas en un día hábil.",
    },
    job_published: {
      title: "Vacante publicada: {job}",
      body: "Los candidatos ya pueden postularse.",
    },
    job_approved: { title: "Vacante aprobada: {job}", body: "Dexee aprobó y publicó la vacante." },
    job_changes_requested: { title: "Cambios solicitados: {job}", body: "{message}" },
    new_application: { title: "Nueva postulación: {job}", body: "{candidate} se postuló." },
    application_status: {
      title: "Tu postulación pasó a {status}",
      body: "{company} actualizó tu postulación para {job}.",
    },
    contact_requested: {
      title: "Solicitud de datos de contacto",
      body: "{company} solicitó los datos de contacto de {candidate} en {job}.",
    },
    contact_released: {
      title: "Datos de contacto liberados",
      body: "Dexee liberó los datos de contacto de {candidate} en {job}.",
    },
    recommendation_company: {
      title: "Dexee recomendó un candidato",
      body: "{candidate} pasó a lista corta para {job}.",
    },
    recommendation_candidate: {
      title: "Dexee te recomendó para un rol",
      body: "Pasaste a lista corta para {job} en {company}.",
    },
    assessment_scored: {
      title: "Tu resultado de {assessment} está listo",
      body: "Abre tus evaluaciones para ver el resultado.",
    },
    assessment_pending_validation: {
      title: "Tu {assessment} está pendiente de validación por Dexee",
      body: "Un revisor la validará pronto.",
    },
    assessment_validated: {
      title: "Tu {assessment} fue validada",
      body: "El resultado ya aparece en tu perfil.",
    },
    assessment_failed: {
      title: "No pudimos procesar tu {assessment}",
      body: "Dexee la revisará y te contactará.",
    },
    placement_pending: {
      title: "Colocación pendiente",
      body: "{candidate} fue contratado para {job} en {company}. Registra la colocación.",
    },
    data_request: { title: "Solicitud de datos recibida", body: "{candidate} solicitó {kind}." },
    lead_received: {
      title: "Nuevo lead: {role}",
      body: "{name} de {company} necesita un {role} {seniority}, {needed}. Responder dentro de un día hábil.",
    },
    processing_failed: {
      title: "Falló el procesamiento de una evaluación",
      body: "El intento {attempt} falló tres veces y requiere reintento.",
    },
  },
};

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

async function companyRecipients(companyId: string): Promise<Recipient[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("company_members")
    .select("user_id, profiles:user_id (id, email, locale, notification_prefs)")
    .eq("company_id", companyId)
    .not("user_id", "is", null)
    .not("accepted_at", "is", null);
  return (data ?? [])
    .map((m) => m.profiles)
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      userId: p.id,
      email: p.email,
      locale: p.locale,
      digest: (p.notification_prefs as { digest?: boolean } | null)?.digest !== false,
    }));
}

async function adminRecipients(): Promise<Recipient[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id, email, locale").eq("role", "admin");
  return (data ?? []).map((p) => ({
    userId: p.id,
    email: p.email,
    locale: p.locale,
    digest: true,
  }));
}

async function candidateRecipient(candidateId: string): Promise<Recipient | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, locale")
    .eq("id", candidateId)
    .maybeSingle();
  return data ? { userId: data.id, email: data.email, locale: data.locale, digest: true } : null;
}

async function applicationContext(applicationId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("applications")
    .select(
      "id, status, job_id, candidate_id, jobs (id, title, slug, company_id, companies (id, name)), candidates (first_name, last_name, visibility)",
    )
    .eq("id", applicationId)
    .maybeSingle();
  if (!data || !data.jobs) return null;
  const candidateName = data.candidates
    ? `${data.candidates.first_name} ${data.candidates.last_name.charAt(0)}.`
    : "";
  return {
    application: data,
    job: data.jobs,
    company: data.jobs.companies,
    candidateId: data.candidate_id,
    candidateName,
    candidateVisibility: data.candidates?.visibility ?? null,
  };
}

type Outbound = {
  recipients: Recipient[];
  key: string;
  vars: Record<string, string>;
  link: string;
  template: string | null;
  dedupeKey?: (r: Recipient) => string | undefined;
  payload?: Record<string, Json>;
};

async function deliver(type: string, outbound: Outbound) {
  const admin = createAdminClient();
  const notifications = outbound.recipients.map((r) => {
    const copy = COPY[r.locale][outbound.key] ?? COPY.en[outbound.key];
    return {
      user_id: r.userId,
      type,
      title: fill(copy?.title ?? type, outbound.vars),
      body: fill(copy?.body ?? "", outbound.vars),
      link: outbound.link,
    };
  });
  if (notifications.length > 0) {
    const { error } = await admin.from("notifications").insert(notifications);
    if (error) logger.error({ err: error.message, type }, "notification_insert_failed");
  }
  if (outbound.template) {
    const emails = outbound.recipients
      .filter((r) => outbound.template !== "new-application" || r.digest)
      .map((r) => ({
        to: r.email,
        template: outbound.template as string,
        locale: r.locale,
        payload: { ...outbound.vars, ...outbound.payload, link: outbound.link } as Json,
        dedupe_key: outbound.dedupeKey?.(r) ?? null,
      }));
    if (emails.length > 0) {
      const { error } = await admin
        .from("email_outbox")
        .upsert(emails, { onConflict: "dedupe_key", ignoreDuplicates: true });
      if (error) logger.error({ err: error.message, type }, "outbox_insert_failed");
      else scheduleOutboxFlush();
    }
  }
}

/**
 * Sends what was just queued once the response is out, so an acknowledgement or an invite
 * leaves within seconds instead of at the next daily cron (audit C8). The cron stays as the
 * retry path. `after()` only works inside a request; elsewhere the cron picks the rows up.
 */
function scheduleOutboxFlush() {
  try {
    after(async () => {
      try {
        await processOutbox(20);
      } catch (error) {
        logger.warn({ err: (error as Error).message }, "outbox_flush_failed");
      }
    });
  } catch {
    // Outside a request scope (scripts, tests): the cron remains the delivery path.
  }
}

/** Entry point used by server actions after they perform the change. Never throws. */
export async function dispatchEvent(event: PlatformEvent): Promise<void> {
  try {
    const admin = createAdminClient();
    switch (event.type) {
      case "company_status": {
        const { data: company } = await admin
          .from("companies")
          .select("id, name")
          .eq("id", event.companyId)
          .maybeSingle();
        if (!company) return;
        await deliver(event.type, {
          recipients: await companyRecipients(company.id),
          key: `company_${event.status}`,
          vars: { company: company.name, status: event.status },
          link: "/company",
          template: "company-status",
        });
        return;
      }
      case "job_status": {
        const { data: job } = await admin
          .from("jobs")
          .select("id, title, company_id")
          .eq("id", event.jobId)
          .maybeSingle();
        if (!job) return;
        await deliver(event.type, {
          recipients: await companyRecipients(job.company_id),
          key: `job_${event.status}`,
          vars: { job: job.title, message: event.message ?? "", status: event.status },
          link:
            event.status === "changes_requested"
              ? `/company/jobs/${job.id}/edit`
              : `/company/jobs/${job.id}/pipeline`,
          template: "job-status",
        });
        return;
      }
      case "new_application": {
        const ctx = await applicationContext(event.applicationId);
        if (!ctx) return;
        const hour = new Date().toISOString().slice(0, 13);
        // A dexee_only candidate is invisible to the company (RLS), so Dexee is told instead
        // and intermediates (decision 60).
        const dexeeOnly = ctx.candidateVisibility === "dexee_only";
        await deliver(event.type, {
          recipients: dexeeOnly
            ? await adminRecipients()
            : await companyRecipients(ctx.job.company_id),
          key: "new_application",
          vars: {
            job: ctx.job.title,
            candidate: ctx.candidateName,
            company: ctx.company?.name ?? "",
          },
          link: dexeeOnly
            ? `/admin/candidates/${ctx.candidateId}`
            : `/company/jobs/${ctx.job.id}/pipeline`,
          template: "new-application",
          dedupeKey: (r) => `new-application:${ctx.job.id}:${r.userId}:${hour}`,
        });
        return;
      }
      case "application_status": {
        const ctx = await applicationContext(event.applicationId);
        if (!ctx) return;
        const recipient = await candidateRecipient(ctx.candidateId);
        if (!recipient) return;
        await deliver(event.type, {
          recipients: [recipient],
          key: "application_status",
          vars: { job: ctx.job.title, company: ctx.company?.name ?? "Dexee", status: event.status },
          link: "/candidate/applications",
          template: "application-status",
        });
        return;
      }
      case "contact_requested": {
        const ctx = await applicationContext(event.applicationId);
        if (!ctx) return;
        await deliver(event.type, {
          recipients: await adminRecipients(),
          key: "contact_requested",
          vars: {
            job: ctx.job.title,
            company: ctx.company?.name ?? "",
            candidate: ctx.candidateName,
          },
          link: `/admin/applications?application=${ctx.application.id}`,
          template: null,
        });
        return;
      }
      case "contact_released": {
        const ctx = await applicationContext(event.applicationId);
        if (!ctx) return;
        await deliver(event.type, {
          recipients: await companyRecipients(ctx.job.company_id),
          key: "contact_released",
          vars: {
            job: ctx.job.title,
            candidate: ctx.candidateName,
            company: ctx.company?.name ?? "",
          },
          link: `/company/jobs/${ctx.job.id}/pipeline?application=${ctx.application.id}`,
          template: "contact-released",
        });
        return;
      }
      case "recommendation": {
        const ctx = await applicationContext(event.applicationId);
        if (!ctx) return;
        await deliver(event.type, {
          recipients: await companyRecipients(ctx.job.company_id),
          key: "recommendation_company",
          vars: {
            job: ctx.job.title,
            candidate: ctx.candidateName,
            company: ctx.company?.name ?? "",
          },
          link: `/company/jobs/${ctx.job.id}/pipeline?application=${ctx.application.id}`,
          template: "recommendation",
        });
        const candidate = await candidateRecipient(ctx.candidateId);
        if (candidate) {
          await deliver(event.type, {
            recipients: [candidate],
            key: "recommendation_candidate",
            vars: { job: ctx.job.title, company: ctx.company?.name ?? "Dexee" },
            link: "/candidate/applications",
            template: "recommendation",
          });
        }
        return;
      }
      case "assessment_result": {
        const { data: attempt } = await admin
          .from("assessment_attempts")
          .select("id, candidate_id, assessments (type, title)")
          .eq("id", event.attemptId)
          .maybeSingle();
        if (!attempt) return;
        const recipient = await candidateRecipient(attempt.candidate_id);
        if (!recipient) return;
        const type = attempt.assessments?.type ?? "english_written";
        await deliver(event.type, {
          recipients: [recipient],
          key: `assessment_${event.stage}`,
          vars: { assessment: attempt.assessments?.title ?? type, stage: event.stage },
          link: `/candidate/assessments/${type}`,
          template: "assessment-result",
        });
        return;
      }
      case "team_invite": {
        const { data: member } = await admin
          .from("company_members")
          .select("invited_email, companies (name), profiles:invited_by (locale)")
          .eq("id", event.memberId)
          .maybeSingle();
        if (!member?.invited_email) return;
        const locale = member.profiles?.locale ?? "en";
        await admin.from("email_outbox").insert({
          to: member.invited_email,
          template: "invite",
          locale,
          payload: {
            company: member.companies?.name ?? "Dexee",
            link: `/${locale}/invite/${event.token}`,
            kind: "company",
          } as Json,
        });
        return;
      }
      case "admin_invite": {
        await admin.from("email_outbox").insert({
          to: event.email,
          template: "invite",
          locale: event.locale,
          payload: { company: "Dexee", link: `/${event.locale}/sign-in`, kind: "admin" } as Json,
        });
        return;
      }
      case "placement_pending": {
        const ctx = await applicationContext(event.applicationId);
        if (!ctx) return;
        await deliver(event.type, {
          recipients: await adminRecipients(),
          key: "placement_pending",
          vars: {
            job: ctx.job.title,
            candidate: ctx.candidateName,
            company: ctx.company?.name ?? "",
          },
          link: `/admin/placements?application=${ctx.application.id}`,
          template: null,
        });
        return;
      }
      case "data_request": {
        const { data: request } = await admin
          .from("data_requests")
          .select("id, kind, candidates (first_name, last_name)")
          .eq("id", event.dataRequestId)
          .maybeSingle();
        if (!request) return;
        await deliver(event.type, {
          recipients: await adminRecipients(),
          key: "data_request",
          vars: {
            candidate: request.candidates
              ? `${request.candidates.first_name} ${request.candidates.last_name}`
              : "",
            kind: request.kind,
          },
          link: `/admin/candidates?data_request=${request.id}`,
          template: null,
        });
        return;
      }
      case "lead_received": {
        const { data: lead } = await admin
          .from("contact_requests")
          .select("id, name, company, role_to_fill, seniority, needed_by")
          .eq("id", event.leadId)
          .maybeSingle();
        if (!lead) return;
        await deliver(event.type, {
          recipients: await adminRecipients(),
          key: "lead_received",
          vars: {
            name: lead.name,
            company: lead.company ?? "",
            role: lead.role_to_fill ?? "",
            seniority: lead.seniority ?? "",
            needed: lead.needed_by ?? "",
          },
          link: `/admin/leads?lead=${lead.id}`,
          template: null,
        });
        return;
      }
      case "processing_failed": {
        await deliver(event.type, {
          recipients: await adminRecipients(),
          key: "processing_failed",
          vars: { attempt: event.attemptId },
          link: `/admin/assessments/attempts/${event.attemptId}`,
          template: null,
        });
        return;
      }
    }
  } catch (error) {
    logger.error({ err: (error as Error).message, event: event.type }, "dispatch_event_failed");
  }
}
