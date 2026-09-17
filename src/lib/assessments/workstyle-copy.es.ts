import type { Factor, Band } from "./workstyle";

export const FACTOR_LABELS_ES: Record<Factor, string> = {
  extraversion: "Extraversión",
  agreeableness: "Amabilidad",
  conscientiousness: "Responsabilidad",
  emotional_stability: "Estabilidad emocional",
  intellect: "Apertura",
};

export const FACTOR_COPY_ES: Record<
  Factor,
  Record<Band, { preferences: string; environments: string }>
> = {
  extraversion: {
    low: {
      preferences:
        "Prefiere el trabajo concentrado e independiente y se comunica de forma deliberada, con frecuencia por escrito.",
      environments:
        "Suele rendir bien en roles de trabajo profundo, entregables claros y colaboración asíncrona.",
    },
    mid: {
      preferences:
        "Se siente cómodo alternando entre trabajo independiente e interacción en grupo.",
      environments:
        "Se adapta a equipos que combinan tiempo de concentración con reuniones regulares.",
    },
    high: {
      preferences: "Se energiza con la interacción frecuente y disfruta participar en reuniones.",
      environments: "Suele rendir bien en roles de cara al cliente y equipos muy colaborativos.",
    },
  },
  agreeableness: {
    low: {
      preferences:
        "Directo y franco; se siente cómodo cuestionando ideas y negociando con firmeza.",
      environments:
        "Encaja en roles que exigen revisión crítica, negociación o hacer cumplir estándares.",
    },
    mid: {
      preferences: "Equilibra la cooperación con la capacidad de objetar cuando es necesario.",
      environments: "Trabaja bien en equipos multifuncionales con objetivos compartidos.",
    },
    high: {
      preferences: "Cooperativo y atento a los demás; prioriza la armonía y el apoyo.",
      environments: "Suele rendir bien en roles de soporte, coordinación y servicio.",
    },
  },
  conscientiousness: {
    low: {
      preferences: "Flexible y espontáneo; trabaja mejor con margen para improvisar.",
      environments:
        "Encaja en contextos cambiantes donde las prioridades se mueven y los planes rígidos no funcionan.",
    },
    mid: {
      preferences: "Organizado cuando importa, flexible cuando no.",
      environments: "Se adapta a equipos con estructura moderada y prioridades claras.",
    },
    high: {
      preferences: "Muy organizado, confiable y detallista; cumple lo que se compromete.",
      environments:
        "Suele rendir bien en roles con plazos, cumplimiento y responsabilidad sobre procesos.",
    },
  },
  emotional_stability: {
    low: {
      preferences:
        "Sensible a la presión y atento a los riesgos; se beneficia de expectativas claras.",
      environments: "Trabaja mejor con cargas de trabajo predecibles y retroalimentación de apoyo.",
    },
    mid: {
      preferences: "Generalmente estable, con reacciones normales ante picos de presión.",
      environments: "Maneja la mayoría de cargas de trabajo con una planificación razonable.",
    },
    high: {
      preferences: "Tranquilo bajo presión y se recupera rápido de los contratiempos.",
      environments:
        "Suele rendir bien en contextos de alta exigencia, plazos ajustados o escalamientos de clientes.",
    },
  },
  intellect: {
    low: {
      preferences: "Práctico y realista; prefiere métodos probados a la experimentación.",
      environments: "Encaja en roles con procedimientos establecidos y tareas concretas.",
    },
    mid: {
      preferences: "Abierto a ideas nuevas sin dejar de valorar lo que ya funciona.",
      environments: "Se adapta a equipos que iteran sobre procesos existentes.",
    },
    high: {
      preferences: "Curioso e imaginativo; disfruta aprender y explorar nuevos enfoques.",
      environments:
        "Suele rendir bien en roles de resolución de problemas, diseño o cambio continuo.",
    },
  },
};

export const SJT_SUMMARY_ES: Record<"low" | "mid" | "high", string> = {
  low: "Criterio en trabajo remoto: varias situaciones se resolvieron con menos eficacia de lo que sugiere la buena práctica. Revisar hábitos de comunicación y responsabilidad ayudaría.",
  mid: "Criterio en trabajo remoto: sólido en la mayoría de situaciones, con margen para ser más proactivo en la comunicación y la gestión de expectativas.",
  high: "Criterio en trabajo remoto: eligió consistentemente respuestas proactivas y orientadas al cliente que protegen la confianza en equipos distribuidos.",
};

export const STRENGTHS_ES: Record<Factor, string> = {
  extraversion: "Construye relaciones rápidamente y mantiene la comunicación fluida en el equipo.",
  agreeableness: "Apoya a colegas y clientes y mantiene la colaboración constructiva.",
  conscientiousness: "Cumple sus compromisos de forma confiable y mantiene el trabajo organizado.",
  emotional_stability: "Conserva la calma bajo presión y en escalamientos de clientes.",
  intellect: "Aprende rápido y aporta ideas nuevas a procesos y productos.",
};

export const SJT_STRENGTH_ES =
  "Muestra buen criterio para el trabajo remoto: comunica temprano, se hace responsable de los resultados y hace las preguntas correctas.";

export const DISCLAIMER_ES =
  "Este es un resumen de tamizaje de Dexee sobre preferencias de trabajo autodeclaradas. No es una certificación ni una evaluación clínica.";
