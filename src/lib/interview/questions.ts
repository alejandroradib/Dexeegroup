import type { Database } from "@/types/database";

type RoleFamily = Database["public"]["Enums"]["role_family"];
export type InterviewLocale = "en" | "es";
export type InterviewQuestion = {
  id: string;
  text: string;
  focus: "experience" | "achievement" | "motivation" | "collaboration" | "role";
};

type Bilingual = { en: string; es: string };

/** Generic questions asked in every mock interview (original content). */
const GENERIC: { id: string; focus: InterviewQuestion["focus"]; text: Bilingual }[] = [
  {
    id: "g1",
    focus: "experience",
    text: {
      en: "Tell me about your professional background and the type of work you do best.",
      es: "Cuéntame sobre tu trayectoria profesional y el tipo de trabajo que mejor haces.",
    },
  },
  {
    id: "g2",
    focus: "achievement",
    text: {
      en: "Describe a specific achievement you are proud of. What was the situation, what did you do and what was the measurable result?",
      es: "Describe un logro específico del que estés orgulloso. ¿Cuál era la situación, qué hiciste y cuál fue el resultado medible?",
    },
  },
  {
    id: "g3",
    focus: "collaboration",
    text: {
      en: "Tell me about a time you had to coordinate with a remote team or a client in another time zone. How did you keep everyone aligned?",
      es: "Cuéntame de una ocasión en la que tuviste que coordinarte con un equipo remoto o un cliente en otra zona horaria. ¿Cómo mantuviste a todos alineados?",
    },
  },
  {
    id: "g4",
    focus: "motivation",
    text: {
      en: "Why do you want to work with a US company from Colombia, and what do you expect from your next role?",
      es: "¿Por qué quieres trabajar con una empresa de Estados Unidos desde Colombia y qué esperas de tu próximo rol?",
    },
  },
];

/** Two role-specific questions per family (original content). */
const ROLE_SPECIFIC: Record<RoleFamily, { id: string; text: Bilingual }[]> = {
  finance_accounting: [
    {
      id: "r1",
      text: {
        en: "Walk me through how you run a month-end close. Where do errors usually appear and how do you catch them?",
        es: "Explícame cómo ejecutas un cierre de mes. ¿Dónde suelen aparecer los errores y cómo los detectas?",
      },
    },
    {
      id: "r2",
      text: {
        en: "A US controller asks for a reconciliation you have never prepared under US GAAP. What do you do in the first two days?",
        es: "Un controller en EE. UU. te pide una conciliación que nunca has preparado bajo US GAAP. ¿Qué haces en los primeros dos días?",
      },
    },
  ],
  software_engineering: [
    {
      id: "r1",
      text: {
        en: "Describe a production incident you handled. How did you find the cause and what changed afterwards?",
        es: "Describe un incidente en producción que hayas manejado. ¿Cómo encontraste la causa y qué cambió después?",
      },
    },
    {
      id: "r2",
      text: {
        en: "How do you approach a feature request that is vague? Walk me through the questions you ask before writing code.",
        es: "¿Cómo abordas una solicitud de funcionalidad que es vaga? Cuéntame qué preguntas haces antes de escribir código.",
      },
    },
  ],
  data: [
    {
      id: "r1",
      text: {
        en: "Tell me about a dashboard or analysis that changed a business decision. How did you make sure the numbers were right?",
        es: "Cuéntame de un tablero o análisis que cambió una decisión de negocio. ¿Cómo te aseguraste de que los números fueran correctos?",
      },
    },
    {
      id: "r2",
      text: {
        en: "A stakeholder disputes your metric definition. How do you resolve it?",
        es: "Un interesado cuestiona la definición de tu métrica. ¿Cómo lo resuelves?",
      },
    },
  ],
  customer_support: [
    {
      id: "r1",
      text: {
        en: "Describe a difficult customer conversation you turned around. What exactly did you say?",
        es: "Describe una conversación difícil con un cliente que lograste encaminar. ¿Qué dijiste exactamente?",
      },
    },
    {
      id: "r2",
      text: {
        en: "How do you prioritize when several tickets arrive at the same time and one customer is escalating?",
        es: "¿Cómo priorizas cuando llegan varios tickets al mismo tiempo y un cliente está escalando?",
      },
    },
  ],
  sales_sdr: [
    {
      id: "r1",
      text: {
        en: "Walk me through how you research and open a conversation with a prospect who has never heard of your company.",
        es: "Cuéntame cómo investigas y abres una conversación con un prospecto que nunca ha oído de tu empresa.",
      },
    },
    {
      id: "r2",
      text: {
        en: "Tell me about a month you missed quota. What did you change the following month?",
        es: "Cuéntame de un mes en que no cumpliste la cuota. ¿Qué cambiaste el mes siguiente?",
      },
    },
  ],
  marketing: [
    {
      id: "r1",
      text: {
        en: "Describe a campaign you ran end to end. How did you measure success and what would you do differently?",
        es: "Describe una campaña que hayas ejecutado de principio a fin. ¿Cómo mediste el éxito y qué harías diferente?",
      },
    },
    {
      id: "r2",
      text: {
        en: "How do you adapt messaging for a US audience when the product team is in another country?",
        es: "¿Cómo adaptas el mensaje para una audiencia de EE. UU. cuando el equipo de producto está en otro país?",
      },
    },
  ],
  design: [
    {
      id: "r1",
      text: {
        en: "Tell me about a design decision you defended with evidence. What was the evidence?",
        es: "Cuéntame de una decisión de diseño que defendiste con evidencia. ¿Cuál era la evidencia?",
      },
    },
    {
      id: "r2",
      text: {
        en: "How do you collect feedback from users you cannot meet in person?",
        es: "¿Cómo recoges retroalimentación de usuarios que no puedes conocer en persona?",
      },
    },
  ],
  operations_va: [
    {
      id: "r1",
      text: {
        en: "An executive gives you three urgent tasks with conflicting deadlines. How do you organize the day and communicate trade-offs?",
        es: "Un ejecutivo te da tres tareas urgentes con plazos en conflicto. ¿Cómo organizas el día y comunicas las prioridades?",
      },
    },
    {
      id: "r2",
      text: {
        en: "Describe a process you documented or improved for someone else to follow.",
        es: "Describe un proceso que documentaste o mejoraste para que otra persona lo siguiera.",
      },
    },
  ],
  hr: [
    {
      id: "r1",
      text: {
        en: "Tell me about a hiring process you ran. How did you keep candidates and managers informed?",
        es: "Cuéntame de un proceso de selección que lideraste. ¿Cómo mantuviste informados a candidatos y jefes?",
      },
    },
    {
      id: "r2",
      text: {
        en: "How do you handle a confidential employee concern while keeping the manager in the loop?",
        es: "¿Cómo manejas una inquietud confidencial de un empleado manteniendo informado al jefe?",
      },
    },
  ],
  legal: [
    {
      id: "r1",
      text: {
        en: "Explain a contract clause you negotiated and the risk it addressed, in plain language.",
        es: "Explica una cláusula contractual que negociaste y el riesgo que cubría, en lenguaje sencillo.",
      },
    },
    {
      id: "r2",
      text: {
        en: "How do you keep track of compliance deadlines across two jurisdictions?",
        es: "¿Cómo haces seguimiento a plazos de cumplimiento en dos jurisdicciones?",
      },
    },
  ],
  project_management: [
    {
      id: "r1",
      text: {
        en: "Describe a project that fell behind schedule. How did you recover it and what did you tell the client?",
        es: "Describe un proyecto que se atrasó. ¿Cómo lo recuperaste y qué le dijiste al cliente?",
      },
    },
    {
      id: "r2",
      text: {
        en: "How do you run a status update for stakeholders who only have five minutes?",
        es: "¿Cómo presentas un avance a interesados que solo tienen cinco minutos?",
      },
    },
  ],
  other: [
    {
      id: "r1",
      text: {
        en: "Describe the most complex problem you solved in your field and how you approached it.",
        es: "Describe el problema más complejo que has resuelto en tu campo y cómo lo abordaste.",
      },
    },
    {
      id: "r2",
      text: {
        en: "How do you learn a new tool or process quickly when nobody is available to train you?",
        es: "¿Cómo aprendes rápido una herramienta o proceso nuevo cuando nadie está disponible para capacitarte?",
      },
    },
  ],
};

export const INTERVIEW_QUESTION_COUNT = 6;
export const INTERVIEW_COOLDOWN_DAYS = 30;
export const INTERVIEW_MIN_WORDS = 30;

export function buildInterviewQuestions(
  roleFamily: RoleFamily,
  locale: InterviewLocale,
): InterviewQuestion[] {
  const generic = GENERIC.map((q) => ({ id: q.id, text: q.text[locale], focus: q.focus }));
  const role = ROLE_SPECIFIC[roleFamily].map((q) => ({
    id: q.id,
    text: q.text[locale],
    focus: "role" as const,
  }));
  return [generic[0]!, generic[1]!, role[0]!, generic[2]!, role[1]!, generic[3]!];
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
