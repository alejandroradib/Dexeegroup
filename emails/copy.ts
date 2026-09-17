/** Bilingual copy for every email template (SPEC 12). Placeholders use {name} syntax. */
export type EmailLocale = "en" | "es";

export type TemplateName = "company-status" | "job-status" | "new-application" | "application-status" | "contact-released" | "recommendation" | "assessment-result" | "invite";

type TemplateCopy = { subject: string; heading: string; body: string; cta: string };

export const EMAIL_COPY: Record<TemplateName, Record<EmailLocale, TemplateCopy>> = {
  "company-status": {
    en: { subject: "Your Dexee company status: {status}", heading: "Company status updated", body: "The status of {company} on Dexee is now {status}. Verified companies publish vacancies directly and receive vetted applicants.", cta: "Open your dashboard" },
    es: { subject: "Estado de su empresa en Dexee: {status}", heading: "Estado de la empresa actualizado", body: "El estado de {company} en Dexee ahora es {status}. Las empresas verificadas publican vacantes directamente y reciben postulantes verificados.", cta: "Abrir el panel" },
  },
  "job-status": {
    en: { subject: "Vacancy update: {job}", heading: "Vacancy update", body: "Your vacancy {job} changed to {status}. {message}", cta: "View vacancy" },
    es: { subject: "Novedad de vacante: {job}", heading: "Novedad de vacante", body: "Su vacante {job} cambió a {status}. {message}", cta: "Ver vacante" },
  },
  "new-application": {
    en: { subject: "New applicants for {job}", heading: "New application", body: "{candidate} applied to {job}. Review the profile and Dexee screening badges in your pipeline.", cta: "Open pipeline" },
    es: { subject: "Nuevos postulantes para {job}", heading: "Nueva postulación", body: "{candidate} se postuló a {job}. Revise el perfil y las insignias de tamizaje Dexee en su pipeline.", cta: "Abrir pipeline" },
  },
  "application-status": {
    en: { subject: "Your application for {job} moved to {status}", heading: "Application update", body: "{company} moved your application for {job} to {status}.", cta: "View applications" },
    es: { subject: "Tu postulación para {job} pasó a {status}", heading: "Novedad de postulación", body: "{company} movió tu postulación para {job} a {status}.", cta: "Ver postulaciones" },
  },
  "contact-released": {
    en: { subject: "Contact details released: {candidate}", heading: "Contact details released", body: "Dexee released the contact details of {candidate} for {job}. You can now reach out directly and download the resume from the pipeline.", cta: "Open candidate" },
    es: { subject: "Datos de contacto liberados: {candidate}", heading: "Datos de contacto liberados", body: "Dexee liberó los datos de contacto de {candidate} para {job}. Ya puede contactar directamente y descargar la hoja de vida desde el pipeline.", cta: "Abrir candidato" },
  },
  recommendation: {
    en: { subject: "Dexee recommendation for {job}", heading: "A Dexee recommendation", body: "Dexee shortlisted {candidate} for {job} at {company}. Recommended candidates were reviewed by our team.", cta: "View details" },
    es: { subject: "Recomendación de Dexee para {job}", heading: "Una recomendación de Dexee", body: "Dexee pasó a lista corta a {candidate} para {job} en {company}. Los candidatos recomendados fueron revisados por nuestro equipo.", cta: "Ver detalles" },
  },
  "assessment-result": {
    en: { subject: "Your {assessment} result", heading: "Assessment update", body: "There is news about your {assessment}: {stage}. Open your assessments to see the details. Results are Dexee screening results, not certifications.", cta: "View result" },
    es: { subject: "Tu resultado de {assessment}", heading: "Novedad de evaluación", body: "Hay novedades sobre tu {assessment}: {stage}. Abre tus evaluaciones para ver los detalles. Los resultados son resultados de tamizaje de Dexee, no certificaciones.", cta: "Ver resultado" },
  },
  invite: {
    en: { subject: "You are invited to {company} on Dexee", heading: "Join {company} on Dexee", body: "You were invited to join {company} on the Dexee Talent Platform. Create your password to accept the invitation.", cta: "Accept invitation" },
    es: { subject: "Invitación a {company} en Dexee", heading: "Únase a {company} en Dexee", body: "Le invitaron a unirse a {company} en la Plataforma de Talento Dexee. Cree su contraseña para aceptar la invitación.", cta: "Aceptar invitación" },
  },
};

export function fillTemplate(text: string, vars: Record<string, unknown>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => (vars[key] === undefined || vars[key] === null ? "" : String(vars[key]))).replace(/\s{2,}/g, " ").trim();
}

export function isTemplateName(value: string): value is TemplateName {
  return value in EMAIL_COPY;
}
