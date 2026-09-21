/**
 * Prints SQL that loads a clearly labelled demo data set into a project: one recruiter
 * account with a verified company and four jobs, one candidate account with three validated
 * results (DISC left for the person to take), and four background candidates who already
 * applied, each with four valid results and a ready fit analysis so the recommended panel
 * shows top 3 and top 5 on the first visit.
 *
 * Every row carries the id prefix dd000000- and every account uses an @demo.dexeegroup.com
 * address, so `scripts/seed-demo.ts --cleanup` prints the SQL that removes it all.
 * Idempotent: rows are inserted with `on conflict do nothing`.
 *
 *   npx tsx scripts/seed-demo.ts > demo.sql          # then apply with execute_sql or psql
 *   npx tsx scripts/seed-demo.ts --cleanup > rm.sql
 */
import { scoreDisc, type DiscItem, type Style } from "../src/lib/assessments/disc";
import { discReport } from "../src/lib/assessments/disc-report";
import { oralLevel } from "../src/lib/assessments/english-oral";
import {
  combineWrittenLevels,
  scoreMcq,
  writingLevel,
  type Band,
  type McqItem,
} from "../src/lib/assessments/english-written";
import {
  FACTORS,
  scoreWorkstyle,
  type Factor,
  type LikertItem,
} from "../src/lib/assessments/workstyle";
import { workstyleReport } from "../src/lib/assessments/workstyle-report";

/**
 * The accounts' password comes from the environment and is never written to the repo. The
 * value used before this rule is in git history and is treated as burned (decision 57).
 */
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD;
if (!DEMO_PASSWORD || DEMO_PASSWORD.length < 12) {
  console.error(
    "DEMO_SEED_PASSWORD is not set (or is shorter than 12 characters). Set it in the environment before running this script, for example:\n  DEMO_SEED_PASSWORD='<a new random value>' npx tsx scripts/seed-demo.ts > demo.sql\nKeep the value in the handover notes, not in the repository.",
  );
  process.exit(1);
}
const P = "dd000000-0000-4000-8000-0000000000";
const id = (suffix: string) => `${P}${suffix.padStart(2, "0")}`;
/** 24 chars plus 8 zeros: room for a marker, the person number and a type digit. */
const ATTEMPT_PREFIX = "dd000000-0000-4000-8000-00000000";
const ASSESSMENT = {
  english_written: "aa000000-0000-4000-8000-000000000001",
  english_oral: "aa000000-0000-4000-8000-000000000002",
  psychometric: "aa000000-0000-4000-8000-000000000003",
  disc: "aa000000-0000-4000-8000-000000000004",
} as const;
const ADMIN = "(select id from public.profiles where role = 'admin' order by created_at limit 1)";

const lit = (v: string | null | undefined): string =>
  v === null || v === undefined ? "null" : `'${v.replace(/'/g, "''")}'`;
const json = (v: unknown): string => `${lit(JSON.stringify(v))}::jsonb`;
const arr = (v: string[], type = "text"): string => `array[${v.map(lit).join(",")}]::${type}[]`;
const days = (n: number) => `now() - interval '${n} days'`;

// ---------------------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------------------
type Person = {
  n: string;
  email: string;
  role: "company" | "candidate";
  fullName: string;
  first: string;
  last: string;
};
const RECRUITER: Person = {
  n: "01",
  email: "demo.empresa@demo.dexeegroup.com",
  role: "company",
  fullName: "Reclutador Demo",
  first: "Reclutador",
  last: "Demo",
};
const CANDIDATES: (Person & {
  headline: string;
  summary: string;
  city: string;
  years: number;
  family: string;
  skills: string[];
  desired: string[];
  salary: number;
  availability: string;
  self: string;
  experience: [string, string, string, string | null, string][];
  education: [string, string, string, number, number];
})[] = [
  {
    n: "02",
    email: "demo.candidato@demo.dexeegroup.com",
    role: "candidate",
    fullName: "Camila Demo",
    first: "Camila",
    last: "Demo",
    headline: "Perfil demo: especialista bilingüe de soporte al cliente",
    summary:
      "Cuatro años atendiendo clientes de salud y fintech en Estados Unidos por teléfono, chat y correo. Esta cuenta es de demostración y sus datos son ficticios.",
    city: "Barranquilla",
    years: 4,
    family: "customer_support",
    skills: ["Customer support", "Zendesk", "HubSpot", "Healthcare admin", "Escalations"],
    desired: ["Customer Support Specialist", "Patient Coordinator"],
    salary: 1500,
    availability: "immediate",
    self: "B2",
    experience: [
      [
        "Clinica Demo Health",
        "Coordinadora de pacientes",
        "2023-02-01",
        null,
        "Agenda, verificación de seguros y seguimiento de pacientes para clínicas en Florida.",
      ],
      [
        "FinDemo Payments",
        "Agente de soporte bilingüe",
        "2021-01-01",
        "2023-01-31",
        "Soporte de primer nivel por chat y correo para usuarios en Estados Unidos.",
      ],
    ],
    education: ["Universidad del Norte", "Profesional", "Administración de empresas", 2016, 2020],
  },
  {
    n: "03",
    email: "andres@demo.dexeegroup.com",
    role: "candidate",
    fullName: "Andrés Demo",
    first: "Andrés",
    last: "Demo",
    headline: "Perfil demo: contador senior, US GAAP y NetSuite",
    summary:
      "Siete años en contabilidad para filiales de empresas de Estados Unidos, cuatro liderando el cierre mensual. Datos ficticios de demostración.",
    city: "Barranquilla",
    years: 7,
    family: "finance_accounting",
    skills: ["US GAAP", "NetSuite", "Month-end close", "Excel", "Audit support"],
    desired: ["Senior Accountant", "Accounting Manager"],
    salary: 2900,
    availability: "two_weeks",
    self: "C1",
    experience: [
      [
        "Grupo Logístico Demo",
        "Contador senior",
        "2021-03-01",
        null,
        "Cierre mensual, conciliaciones y soporte a auditoría para una filial en Texas.",
      ],
      [
        "Demo BPO Services",
        "Analista contable",
        "2018-01-15",
        "2021-02-28",
        "Cuentas por pagar y activos fijos para clientes en Estados Unidos.",
      ],
    ],
    education: ["Universidad del Atlántico", "Profesional", "Contaduría pública", 2012, 2017],
  },
  {
    n: "04",
    email: "mariana@demo.dexeegroup.com",
    role: "candidate",
    fullName: "Mariana Demo",
    first: "Mariana",
    last: "Demo",
    headline: "Perfil demo: analista contable, QuickBooks y cuentas por pagar",
    summary:
      "Cinco años en contabilidad para pequeñas empresas de Estados Unidos, con foco en cuentas por pagar y conciliaciones. Datos ficticios de demostración.",
    city: "Medellín",
    years: 5,
    family: "finance_accounting",
    skills: ["QuickBooks", "Accounts payable", "Reconciliations", "Excel", "Bill.com"],
    desired: ["Staff Accountant", "AP Specialist"],
    salary: 2200,
    availability: "one_month",
    self: "B2",
    experience: [
      [
        "Demo Accounting Partners",
        "Analista contable",
        "2020-06-01",
        null,
        "Cartera de doce clientes en Estados Unidos: conciliaciones, cuentas por pagar y reportes mensuales.",
      ],
    ],
    education: ["Universidad EAFIT", "Profesional", "Contaduría pública", 2014, 2019],
  },
  {
    n: "05",
    email: "santiago@demo.dexeegroup.com",
    role: "candidate",
    fullName: "Santiago Demo",
    first: "Santiago",
    last: "Demo",
    headline: "Perfil demo: auxiliar contable en transición a US GAAP",
    summary:
      "Tres años en contabilidad local y un año apoyando reportes para una matriz en Estados Unidos. Datos ficticios de demostración.",
    city: "Bogotá",
    years: 3,
    family: "finance_accounting",
    skills: ["Excel", "SAP", "IFRS", "Bank reconciliations"],
    desired: ["Staff Accountant", "Junior Accountant"],
    salary: 1600,
    availability: "immediate",
    self: "B2",
    experience: [
      [
        "Demo Manufacturing SAS",
        "Auxiliar contable",
        "2022-08-01",
        null,
        "Registro contable, conciliaciones bancarias y apoyo al reporte mensual para la casa matriz.",
      ],
    ],
    education: [
      "Universidad Nacional de Colombia",
      "Profesional",
      "Contaduría pública",
      2017,
      2022,
    ],
  },
  {
    n: "06",
    email: "valentina@demo.dexeegroup.com",
    role: "candidate",
    fullName: "Valentina Demo",
    first: "Valentina",
    last: "Demo",
    headline: "Perfil demo: líder de soporte al cliente, equipos remotos",
    summary:
      "Cuatro años en soporte para software B2B en Estados Unidos, el último liderando un equipo de cinco agentes. Datos ficticios de demostración.",
    city: "Cartagena",
    years: 4,
    family: "customer_support",
    skills: ["Customer support", "Intercom", "Team lead", "SLA management", "Onboarding"],
    desired: ["Customer Support Lead", "Customer Success"],
    salary: 1900,
    availability: "two_weeks",
    self: "C1",
    experience: [
      [
        "Demo SaaS Inc.",
        "Líder de soporte",
        "2024-01-01",
        null,
        "Equipo de cinco agentes con SLA publicados para clientes en Estados Unidos.",
      ],
      [
        "Demo SaaS Inc.",
        "Agente de soporte",
        "2021-05-01",
        "2023-12-31",
        "Soporte técnico de primer y segundo nivel por chat y correo.",
      ],
    ],
    education: [
      "Universidad Tecnológica de Bolívar",
      "Profesional",
      "Ingeniería industrial",
      2015,
      2020,
    ],
  },
];

// ---------------------------------------------------------------------------------------
// Results, computed with the product's own scoring functions
// ---------------------------------------------------------------------------------------
type Cefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
const WRITTEN_PROFILE: Record<
  "B1" | "B2" | "C1",
  { correct: [number, number, number]; writing: number }
> = {
  B1: { correct: [11, 6, 2], writing: 8 },
  B2: { correct: [13, 11, 5], writing: 12 },
  C1: { correct: [14, 13, 9], writing: 15 },
};
function writtenAttempt(level: "B1" | "B2" | "C1") {
  const quotas: [Band, number][] = [
    ["band1", 14],
    ["band2", 14],
    ["band3", 12],
  ];
  const items: McqItem[] = [];
  const answers: { question_id: string; selected_option: string | null }[] = [];
  const profile = WRITTEN_PROFILE[level];
  quotas.forEach(([band, total], bi) => {
    for (let i = 0; i < total; i += 1) {
      const qid = `${band}-${i}`;
      items.push({ id: qid, band, correct: "a" });
      answers.push({
        question_id: qid,
        selected_option: i < (profile.correct[bi] ?? 0) ? "a" : "b",
      });
    }
  });
  const mcq = scoreMcq(items, answers);
  const t = profile.writing;
  const scores = {
    task_achievement: Math.min(5, Math.ceil(t / 4)),
    coherence: Math.min(5, Math.round(t / 4)),
    lexical_range: Math.min(5, Math.floor(t / 4)),
    grammatical_accuracy:
      t -
      Math.min(5, Math.ceil(t / 4)) -
      Math.min(5, Math.round(t / 4)) -
      Math.min(5, Math.floor(t / 4)),
  };
  const writing = {
    ...scores,
    total: t,
    level: writingLevel(t),
    feedback: [
      "La respuesta cubre la tarea y propone una solución concreta al cliente.",
      "Las ideas están ordenadas; conviene usar conectores más variados.",
      "Revise los artículos y las preposiciones en frases largas.",
    ],
    flags: { off_topic: false, too_short: false },
  };
  const combined = combineWrittenLevels(mcq.level, writing);
  return {
    final_level: combined.finalLevel as Cefr,
    ai_level: writing.level as Cefr,
    final_score: Math.round(mcq.overall * 1000) / 10,
    ai_result: { mcq, writing, combined, writing_status: "graded" },
    report: {
      mcq: { correct: mcq.correct, total: mcq.total, bands: mcq.bands, level: mcq.level },
      writing: { total: writing.total, level: writing.level, feedback: writing.feedback, scores },
      final_level: combined.finalLevel,
      reasons: combined.reasons,
    },
  };
}

const ORAL_TOTALS: Record<"B1" | "B2" | "C1", number[]> = {
  B1: [8, 9, 9, 8],
  B2: [12, 13, 12, 13],
  C1: [15, 16, 15, 14],
};
function oralAttempt(level: "B1" | "B2" | "C1", n: string) {
  const answers = ORAL_TOTALS[level].map((total, i) => {
    const base = Math.floor(total / 4);
    const extra = total - base * 4;
    return {
      question_id: `${ATTEMPT_PREFIX.slice(0, -1)}b${n}0${i + 1}`,
      fluency: base + (extra > 0 ? 1 : 0),
      coherence: base + (extra > 1 ? 1 : 0),
      lexical_range: base + (extra > 2 ? 1 : 0),
      grammatical_accuracy: base,
      total,
      comment: "Respuesta clara y pertinente; demo generada para ilustrar el formato.",
    };
  });
  const computed = oralLevel(answers);
  return {
    ai_level: computed.level as Cefr,
    final_level: computed.level as Cefr,
    ai_result: {
      answers,
      feedback: [
        "Habla con fluidez suficiente para una llamada de trabajo.",
        "Estructura las respuestas con un inicio, un desarrollo y un cierre.",
        "Amplíe el vocabulario específico de su campo.",
      ],
      average: computed.average,
      computed,
      wpm: answers.map((a) => ({ question_id: a.question_id, wpm: 118 })),
    },
  };
}

const LIKERT: Record<"high" | "mid" | "low", number[]> = {
  high: [5, 4, 5, 4, 5, 4, 5, 4, 5, 4],
  mid: [3, 4, 3, 3, 4, 3, 3, 3, 4, 3],
  low: [2, 3, 2, 2, 3, 2, 2, 2, 3, 2],
};
function psychometricAttempt(bands: Record<Factor, "high" | "mid" | "low">, sjtCorrect: number) {
  const items: LikertItem[] = [];
  const answers: { question_id: string; likert_value: number }[] = [];
  for (const factor of FACTORS) {
    LIKERT[bands[factor]].forEach((v, i) => {
      const qid = `${factor}-${i}`;
      items.push({ id: qid, factor, reverse: false });
      answers.push({ question_id: qid, likert_value: v });
    });
  }
  const sjtItems = Array.from({ length: 10 }, (_, i) => ({ id: `sjt-${i}`, best: "c" }));
  const sjtAnswers = sjtItems.map((it, i) => ({
    question_id: it.id,
    selected_option: i < sjtCorrect ? "c" : "a",
  }));
  const scores = scoreWorkstyle(items, answers, sjtItems, sjtAnswers);
  return { final_score: scores.sjt.score, ai_result: scores, report: workstyleReport(scores) };
}

function discAttempt(bands: Record<Style, "high" | "mid" | "low">) {
  const items: DiscItem[] = [];
  const answers: { question_id: string; likert_value: number }[] = [];
  for (const style of ["D", "I", "S", "C"] as Style[]) {
    LIKERT[bands[style]].slice(0, 7).forEach((v, i) => {
      const qid = `${style}-${i}`;
      items.push({ id: qid, style, reverse: false });
      answers.push({ question_id: qid, likert_value: v });
    });
  }
  const scores = scoreDisc(items, answers);
  return {
    final_score: scores.styles[scores.primary].scaled,
    ai_result: scores,
    report: discReport(scores),
  };
}

type Results = {
  written: "B1" | "B2" | "C1";
  oral: "B1" | "B2" | "C1";
  bigFive: Record<Factor, "high" | "mid" | "low">;
  disc: Record<Style, "high" | "mid" | "low"> | null;
  sjt: number;
  daysAgo: number;
};
const RESULTS: Record<string, Results> = {
  "02": {
    written: "B2",
    oral: "B2",
    bigFive: {
      extraversion: "high",
      agreeableness: "high",
      conscientiousness: "mid",
      emotional_stability: "mid",
      intellect: "mid",
    },
    disc: null,
    sjt: 8,
    daysAgo: 9,
  },
  "03": {
    written: "C1",
    oral: "C1",
    bigFive: {
      extraversion: "mid",
      agreeableness: "mid",
      conscientiousness: "high",
      emotional_stability: "high",
      intellect: "mid",
    },
    disc: { D: "high", I: "mid", S: "mid", C: "high" },
    sjt: 9,
    daysAgo: 21,
  },
  "04": {
    written: "B2",
    oral: "B2",
    bigFive: {
      extraversion: "mid",
      agreeableness: "high",
      conscientiousness: "high",
      emotional_stability: "mid",
      intellect: "low",
    },
    disc: { D: "low", I: "mid", S: "high", C: "mid" },
    sjt: 7,
    daysAgo: 15,
  },
  "05": {
    written: "B2",
    oral: "B1",
    bigFive: {
      extraversion: "low",
      agreeableness: "mid",
      conscientiousness: "mid",
      emotional_stability: "mid",
      intellect: "high",
    },
    disc: { D: "mid", I: "low", S: "mid", C: "high" },
    sjt: 6,
    daysAgo: 12,
  },
  "06": {
    written: "C1",
    oral: "B2",
    bigFive: {
      extraversion: "high",
      agreeableness: "mid",
      conscientiousness: "mid",
      emotional_stability: "high",
      intellect: "mid",
    },
    disc: { D: "mid", I: "high", S: "low", C: "mid" },
    sjt: 8,
    daysAgo: 18,
  },
};

function attemptRows(n: string, r: Results): string[] {
  const cid = id(n);
  const rows: string[] = [];
  const base = (suffix: string, assessment: string, limitMin: number, ago: number) =>
    `('${ATTEMPT_PREFIX}a${n}${suffix}'::uuid, '${assessment}', '${cid}', 'validated', ${days(ago)} - interval '${limitMin} minutes', ${days(ago)} - interval '${limitMin} minutes' + interval '${limitMin} minutes', ${days(ago)} - interval '5 minutes'`;
  const w = writtenAttempt(r.written);
  rows.push(
    `${base("1", ASSESSMENT.english_written, 45, r.daysAgo + 2)}, ${json(w.ai_result)}, '${w.ai_level}', '${w.final_level}', ${w.final_score}, ${json(w.report)}, ${days(r.daysAgo + 2)}, null, false)`,
  );
  const o = oralAttempt(r.oral, n);
  rows.push(
    `${base("2", ASSESSMENT.english_oral, 30, r.daysAgo + 1)}, ${json(o.ai_result)}, '${o.ai_level}', '${o.final_level}', null, null, ${days(r.daysAgo + 1)}, ${ADMIN}, false)`,
  );
  const p = psychometricAttempt(r.bigFive, r.sjt);
  rows.push(
    `${base("3", ASSESSMENT.psychometric, 1440, r.daysAgo)}, ${json(p.ai_result)}, null, null, ${p.final_score}, ${json(p.report)}, ${days(r.daysAgo)}, null, true)`,
  );
  if (r.disc) {
    const d = discAttempt(r.disc);
    rows.push(
      `${base("4", ASSESSMENT.disc, 1440, r.daysAgo)}, ${json(d.ai_result)}, null, null, ${d.final_score}, ${json(d.report)}, ${days(r.daysAgo)}, null, true)`,
    );
  }
  return rows;
}

// ---------------------------------------------------------------------------------------
// Company, jobs, applications, fit
// ---------------------------------------------------------------------------------------
const COMPANY = id("b1");
type Job = {
  n: string;
  title: string;
  family: string;
  seniority: string;
  english: string;
  min: number;
  max: number;
  contract: string;
  status: "published" | "draft";
  ago: number;
  desc: string;
  resp: string;
  req: string;
  skills: string[];
  hours: number;
  overlap: string;
  employment: string;
};
const JOBS: Job[] = [
  {
    n: "e1",
    title: "Contador senior US GAAP (demo)",
    family: "finance_accounting",
    seniority: "senior",
    english: "B2",
    min: 2600,
    max: 3300,
    contract: "dexee_eor",
    status: "published",
    ago: 14,
    hours: 40,
    overlap: "full_et",
    employment: "full_time",
    desc: "Vacante de demostración. Lidere el cierre mensual de una red de clínicas ambulatorias en Florida y reporte al controller en Estados Unidos.",
    resp: "- Preparar asientos, conciliaciones y el paquete de cierre mensual\n- Mantener el registro de activos fijos y las provisiones\n- Apoyar la auditoría anual\n- Mejorar las listas de verificación del cierre",
    req: "- Cinco años o más en contabilidad, al menos dos con US GAAP\n- NetSuite o QuickBooks Online\n- Excel avanzado\n- Inglés B2 para llamadas diarias con el equipo en Estados Unidos",
    skills: ["US GAAP", "NetSuite", "QuickBooks", "Excel", "Month-end close"],
  },
  {
    n: "e2",
    title: "Especialista bilingüe de soporte al paciente (demo)",
    family: "customer_support",
    seniority: "mid",
    english: "B2",
    min: 1400,
    max: 1800,
    contract: "dexee_eor",
    status: "published",
    ago: 10,
    hours: 40,
    overlap: "4h",
    employment: "full_time",
    desc: "Vacante de demostración. Atienda a pacientes de clínicas en Florida por teléfono y chat, en inglés y español, y coordine citas y verificaciones de seguro.",
    resp: "- Responder llamadas y chats de pacientes\n- Agendar y confirmar citas\n- Verificar cobertura de seguros\n- Escalar casos clínicos al equipo en Estados Unidos",
    req: "- Tres años o más en soporte al cliente para Estados Unidos\n- Experiencia en salud o seguros\n- Inglés B2 hablado\n- Disponibilidad en horario del este",
    skills: [
      "Customer support",
      "Healthcare admin",
      "Zendesk",
      "Scheduling",
      "Insurance verification",
    ],
  },
  {
    n: "e3",
    title: "Asistente ejecutiva remota (demo)",
    family: "operations_va",
    seniority: "mid",
    english: "B2",
    min: 1200,
    max: 1600,
    contract: "independent_contractor",
    status: "published",
    ago: 6,
    hours: 30,
    overlap: "4h",
    employment: "part_time",
    desc: "Vacante de demostración. Apoye a la directora de operaciones con agenda, viajes, seguimiento de proveedores y preparación de reportes.",
    resp: "- Gestionar agenda y correo\n- Coordinar viajes y reuniones\n- Preparar reportes semanales\n- Hacer seguimiento a proveedores",
    req: "- Dos años o más como asistente para ejecutivos en Estados Unidos\n- Google Workspace y Notion\n- Inglés B2 escrito y hablado",
    skills: ["Calendar management", "Google Workspace", "Notion", "Travel coordination"],
  },
  {
    n: "e4",
    title: "Analista de datos de facturación (demo)",
    family: "data",
    seniority: "mid",
    english: "B2",
    min: 2200,
    max: 2800,
    contract: "dexee_eor",
    status: "draft",
    ago: 1,
    hours: 40,
    overlap: "4h",
    employment: "full_time",
    desc: "Borrador de demostración. Construya tableros de facturación y cobranza para las clínicas.",
    resp: "- Modelar datos de facturación en SQL\n- Mantener tableros en Looker",
    req: "- SQL avanzado\n- Looker o Power BI",
    skills: ["SQL", "Looker", "dbt"],
  },
];

type App = {
  n: string;
  job: string;
  cand: string;
  status: string;
  ago: number;
  note: string | null;
  fit: {
    score: number;
    summary: string;
    strengths: string[];
    gaps: string[];
    evidence: Record<string, number>;
  };
};
const APPS: App[] = [
  {
    n: "f1",
    job: "e1",
    cand: "03",
    status: "shortlisted",
    ago: 12,
    note: "Disponible para entrevistas en horario del este.",
    fit: {
      score: 88,
      summary:
        "Siete años en contabilidad para filiales de Estados Unidos, cuatro liderando el cierre mensual con NetSuite. Inglés C1 verificado, por encima del B2 requerido. La única brecha es la experiencia directa en el sector salud.",
      strengths: [
        "Cierre mensual y soporte a auditoría en una filial de Texas",
        "NetSuite y US GAAP en el nivel que exige el rol",
        "Inglés C1 verificado en oral y escrito",
      ],
      gaps: ["Sin experiencia previa en facturación de salud"],
      evidence: { experience_match: 5, skills_match: 5, english_match: 5, seniority_match: 4 },
    },
  },
  {
    n: "f2",
    job: "e1",
    cand: "04",
    status: "screening",
    ago: 9,
    note: null,
    fit: {
      score: 76,
      summary:
        "Cinco años en contabilidad para pequeñas empresas de Estados Unidos con QuickBooks. Cumple el inglés B2. El brief pide liderar el cierre completo y su experiencia se concentra en cuentas por pagar.",
      strengths: ["QuickBooks Online y conciliaciones para doce clientes", "Inglés B2 verificado"],
      gaps: ["No ha liderado un cierre mensual completo", "Sin experiencia con NetSuite"],
      evidence: { experience_match: 4, skills_match: 3, english_match: 4, seniority_match: 3 },
    },
  },
  {
    n: "f3",
    job: "e1",
    cand: "05",
    status: "applied",
    ago: 5,
    note: "Interesado en crecer hacia US GAAP.",
    fit: {
      score: 64,
      summary:
        "Tres años en contabilidad local y un año apoyando reportes para una matriz en Estados Unidos. Perfil junior para un rol senior; el inglés oral verificado es B1, por debajo del B2 requerido.",
      strengths: ["Conciliaciones bancarias y reporte mensual a casa matriz", "Excel y SAP"],
      gaps: [
        "Inglés oral B1 frente al B2 requerido",
        "Sin experiencia directa en US GAAP",
        "Seniority por debajo del brief",
      ],
      evidence: { experience_match: 2, skills_match: 3, english_match: 2, seniority_match: 2 },
    },
  },
  {
    n: "f4",
    job: "e1",
    cand: "06",
    status: "applied",
    ago: 3,
    note: null,
    fit: {
      score: 51,
      summary:
        "Trayectoria sólida en soporte al cliente, pero sin experiencia contable. El inglés C1 escrito y B2 oral cumplen el requisito; el resto del brief no se cubre.",
      strengths: ["Inglés verificado por encima del requisito", "Liderazgo de un equipo remoto"],
      gaps: ["Sin experiencia en contabilidad ni US GAAP", "Familia de rol distinta a la vacante"],
      evidence: { experience_match: 1, skills_match: 1, english_match: 5, seniority_match: 3 },
    },
  },
  {
    n: "f5",
    job: "e2",
    cand: "06",
    status: "screening",
    ago: 7,
    note: "Puede empezar en dos semanas.",
    fit: {
      score: 84,
      summary:
        "Cuatro años en soporte para software B2B en Estados Unidos y un año liderando un equipo de cinco agentes con SLA publicados. Inglés verificado por encima del B2. Falta experiencia específica en salud o seguros.",
      strengths: [
        "Soporte por chat y correo para clientes de Estados Unidos",
        "Lideró un equipo remoto con SLA",
        "Inglés C1 escrito y B2 oral verificados",
      ],
      gaps: ["Sin experiencia en salud o verificación de seguros"],
      evidence: { experience_match: 4, skills_match: 4, english_match: 5, seniority_match: 4 },
    },
  },
  {
    n: "f6",
    job: "e2",
    cand: "04",
    status: "applied",
    ago: 4,
    note: null,
    fit: {
      score: 58,
      summary:
        "Perfil contable con trato frecuente con clientes de Estados Unidos, pero sin experiencia en soporte al paciente ni en herramientas de mesa de ayuda. Cumple el inglés B2.",
      strengths: ["Comunicación escrita con clientes de Estados Unidos", "Inglés B2 verificado"],
      gaps: ["Sin experiencia en soporte al cliente", "Sin experiencia en salud"],
      evidence: { experience_match: 2, skills_match: 2, english_match: 4, seniority_match: 3 },
    },
  },
];

function seedSql(): string {
  const out: string[] = ["begin;", "set local search_path = public, extensions;"];
  const people: Person[] = [RECRUITER, ...CANDIDATES];

  out.push(
    "insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at) values",
    people
      .map(
        (p) =>
          `  ('${id(p.n)}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${lit(p.email)}, extensions.crypt(${lit(DEMO_PASSWORD)}, extensions.gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', ${json({ role: p.role, full_name: p.fullName, locale: "es" })}, '', '', '', '', now(), now())`,
      )
      .join(",\n") + "\non conflict (id) do nothing;",
    "insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)",
    "select gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now()",
    `from auth.users u where u.id::text like '${P}%' and not exists (select 1 from auth.identities i where i.user_id = u.id)`,
    "on conflict do nothing;",
  );

  out.push(
    "insert into public.companies (id, owner_user_id, name, legal_name, website, sector, country, state, city, size, description, status, verified_at, verified_by, hiring_needs) values",
    `  ('${COMPANY}', '${id(RECRUITER.n)}', 'Demo Health Partners', 'Demo Health Partners LLC (cuenta de demostración)', 'https://demo.dexeegroup.com', 'healthcare', 'US', 'FL', 'Tampa', 's51_200', 'Empresa de demostración. Servicios administrativos y de facturación para clínicas ambulatorias en Florida. Todos los datos de esta cuenta son ficticios.', 'verified', ${days(30)}, ${ADMIN}, ${json({ role_families: ["finance_accounting", "customer_support", "operations_va"], expected_hires: 6, preferred_contract_types: ["dexee_eor", "independent_contractor"] })})`,
    "on conflict (id) do nothing;",
  );

  out.push(
    "insert into public.jobs (id, company_id, title, role_family, seniority, description, responsibilities, requirements, skills, english_level_required, employment_type, work_mode, contract_type, hours_per_week, timezone_overlap, salary_min_usd, salary_max_usd, show_salary, confidential_company, status, published_at, created_by) values",
    JOBS.map(
      (j) =>
        `  ('${id(j.n)}', '${COMPANY}', ${lit(j.title)}, '${j.family}', '${j.seniority}', ${lit(j.desc)}, ${lit(j.resp)}, ${lit(j.req)}, ${arr(j.skills)}, '${j.english}', '${j.employment}', 'remote', '${j.contract}', ${j.hours}, '${j.overlap}', ${j.min}, ${j.max}, true, false, '${j.status}', ${j.status === "published" ? days(j.ago) : "null"}, '${id(RECRUITER.n)}')`,
    ).join(",\n") + "\non conflict (id) do nothing;",
  );

  out.push(
    "insert into public.candidates (id, first_name, last_name, headline, summary, country, city, years_experience, role_family, skills, desired_roles, desired_salary_min_usd, availability, preferred_contract_types, english_self_level, data_consent_at, data_consent_version, consent_flags) values",
    CANDIDATES.map(
      (c) =>
        `  ('${id(c.n)}', ${lit(c.first)}, ${lit(c.last)}, ${lit(c.headline)}, ${lit(c.summary)}, 'CO', ${lit(c.city)}, ${c.years}, '${c.family}', ${arr(c.skills)}, ${arr(c.desired)}, ${c.salary}, '${c.availability}', array['dexee_eor','independent_contractor']::public.contract_type[], '${c.self}', ${days(40)}, '2026-09-01', ${json({ terms: true, data_policy: true, job_contact: true, analytics: false, version: "2026-09-01" })})`,
    ).join(",\n") + "\non conflict (id) do nothing;",
    "insert into public.candidate_contacts (candidate_id, email, phone, linkedin_url, portfolio_url, resume_path) values",
    CANDIDATES.map(
      (c) => `  ('${id(c.n)}', ${lit(c.email)}, '+57 300 000 00${c.n}', null, null, null)`,
    ).join(",\n") + "\non conflict (candidate_id) do nothing;",
    "insert into public.candidate_experience (candidate_id, company, title, start_date, end_date, is_current, description, sort_order)",
    "select * from (values",
    CANDIDATES.flatMap((c) =>
      c.experience.map(
        ([company, title, start, end, desc], i) =>
          `  ('${id(c.n)}'::uuid, ${lit(company)}, ${lit(title)}, '${start}'::date, ${end ? `'${end}'::date` : "null::date"}, ${end ? "false" : "true"}, ${lit(desc)}, ${i})`,
      ),
    ).join(",\n") +
      ") v(candidate_id, company, title, start_date, end_date, is_current, description, sort_order)",
    "where not exists (select 1 from public.candidate_experience e where e.candidate_id = v.candidate_id);",
    "insert into public.candidate_education (candidate_id, institution, degree, field, start_year, end_year)",
    "select * from (values",
    CANDIDATES.map(
      (c) =>
        `  ('${id(c.n)}'::uuid, ${lit(c.education[0])}, ${lit(c.education[1])}, ${lit(c.education[2])}, ${c.education[3]}, ${c.education[4]})`,
    ).join(",\n") + ") v(candidate_id, institution, degree, field, start_year, end_year)",
    "where not exists (select 1 from public.candidate_education e where e.candidate_id = v.candidate_id);",
  );

  out.push(
    "insert into public.assessment_attempts (id, assessment_id, candidate_id, status, started_at, expires_at, submitted_at, ai_result, ai_level, final_level, final_score, report, validated_at, validated_by, visible_to_companies) values",
    Object.entries(RESULTS)
      .flatMap(([n, r]) => attemptRows(n, r))
      .map((r) => `  ${r}`)
      .join(",\n") + "\non conflict (id) do nothing;",
  );

  out.push(
    "insert into public.applications (id, job_id, candidate_id, status, source, cover_note, created_at) values",
    APPS.map(
      (a) =>
        `  ('${id(a.n)}', '${id(a.job)}', '${id(a.cand)}', '${a.status}', 'candidate', ${lit(a.note)}, ${days(a.ago)})`,
    ).join(",\n") + "\non conflict (id) do nothing;",
    "insert into public.application_fit (application_id, status, score, summary, strengths, gaps, evidence, model, prompt_version, inputs_hash, attempts, computed_at) values",
    APPS.map(
      (a) =>
        `  ('${id(a.n)}', 'ready', ${a.fit.score}, ${lit(a.fit.summary)}, ${arr(a.fit.strengths)}, ${arr(a.fit.gaps)}, ${json(a.fit.evidence)}, 'demo-seed', 'candidate-fit.v1', 'demo-seed', 1, ${days(a.ago)})`,
    ).join(",\n") + "\non conflict (application_id) do nothing;",
    "insert into public.notes (candidate_id, application_id, author_user_id, body, visibility)",
    `select '${id("03")}', '${id("f1")}', '${id(RECRUITER.n)}', 'Nota demo: entrevista técnica propuesta para el jueves con el controller.', 'company'`,
    `where not exists (select 1 from public.notes where application_id = '${id("f1")}');`,
    `update public.candidates set profile_completeness = public.compute_profile_completeness(id) where id::text like '${P}%';`,
    "commit;",
  );
  return out.join("\n") + "\n";
}

function cleanupSql(): string {
  return (
    [
      "begin;",
      `delete from public.notes where author_user_id::text like '${P}%' or candidate_id::text like '${P}%';`,
      `delete from public.applications where id::text like '${P}%';`,
      `delete from public.assessment_attempts where candidate_id::text like '${P}%';`,
      `delete from public.jobs where company_id = '${COMPANY}';`,
      `delete from public.companies where id = '${COMPANY}';`,
      `delete from public.candidates where id::text like '${P}%';`,
      `delete from auth.users where id::text like '${P}%';`,
      "commit;",
    ].join("\n") + "\n"
  );
}

/**
 * `--part head|attempts=<nn>|tail` prints one self-contained transaction, for tools that cap the
 * size of a single statement batch (the Supabase MCP `execute_sql`, for example).
 */
function partSql(part: string): string {
  const full = seedSql().split("\n");
  const line = (needle: string) => full.findIndex((l) => l.startsWith(needle));
  const attemptsAt = line("insert into public.assessment_attempts");
  const appsAt = line("insert into public.applications");
  if (part === "head") return ["begin;", ...full.slice(2, attemptsAt), "commit;"].join("\n") + "\n";
  if (part === "tail") return ["begin;", ...full.slice(appsAt)].join("\n") + "\n";
  const nn = part.replace("attempts=", "");
  const r = RESULTS[nn];
  if (!r) throw new Error(`unknown part ${part}`);
  return (
    [
      "begin;",
      "insert into public.assessment_attempts (id, assessment_id, candidate_id, status, started_at, expires_at, submitted_at, ai_result, ai_level, final_level, final_score, report, validated_at, validated_by, visible_to_companies) values",
      attemptRows(nn, r)
        .map((row) => `  ${row}`)
        .join(",\n") + "\non conflict (id) do nothing;",
      "commit;",
    ].join("\n") + "\n"
  );
}

const partArg = process.argv.find((a) => a.startsWith("--part="));
process.stdout.write(
  process.argv.includes("--cleanup")
    ? cleanupSql()
    : partArg
      ? partSql(partArg.slice(7))
      : seedSql(),
);
