import type { DiscCopy } from "./disc";

export const DISC_COPY_ES: DiscCopy = {
  labels: { D: "Dominancia", I: "Influencia", S: "Estabilidad", C: "Cumplimiento" },
  styles: {
    D: {
      low: {
        preferences:
          "Prefiere construir acuerdo antes de actuar y se siente cómodo dejando que otros lideren.",
        environments:
          "Tiende a rendir bien donde las decisiones se comparten y el ritmo lo marca el equipo.",
      },
      mid: {
        preferences: "Toma el liderazgo cuando hace falta y da un paso atrás cuando no.",
        environments: "Se adapta a equipos con dirección desde arriba y margen para decidir.",
      },
      high: {
        preferences: "Decide rápido, empuja por resultados y tolera la fricción en el camino.",
        environments: "Tiende a rendir bien con metas claras, autonomía y ritmo alto.",
      },
    },
    I: {
      low: {
        preferences:
          "Se comunica con deliberación, a menudo por escrito, y reserva su opinión hasta que se la piden.",
        environments: "Tiende a rendir bien en roles de concentración con colaboración asíncrona.",
      },
      mid: {
        preferences: "Cómodo presentando ideas y también escuchando.",
        environments:
          "Se adapta a equipos que mezclan trabajo concentrado con interacción frecuente.",
      },
      high: {
        preferences: "Persuade, da energía y piensa en voz alta; lo motiva el reconocimiento.",
        environments:
          "Tiende a rendir bien en roles comerciales, de cara al cliente y de coordinación.",
      },
    },
    S: {
      low: {
        preferences: "Se inquieta con la rutina y se adapta rápido cuando cambian las prioridades.",
        environments:
          "Tiende a rendir bien donde el trabajo cambia seguido y la velocidad importa.",
      },
      mid: {
        preferences: "Valora la estabilidad pero maneja el cambio sin perder el ritmo.",
        environments: "Se adapta a equipos que evolucionan de forma gradual y no por sacudidas.",
      },
      high: {
        preferences: "Paciente, constante y leal al equipo; termina lo que empieza.",
        environments: "Tiende a rendir bien en soporte, operaciones y cuentas de largo plazo.",
      },
    },
    C: {
      low: {
        preferences:
          "Cómodo actuando con estimaciones e improvisando cuando las reglas no están claras.",
        environments: "Tiende a rendir bien donde el criterio pesa más que el procedimiento.",
      },
      mid: {
        preferences: "Sigue el procedimiento donde existe y usa el criterio donde no.",
        environments: "Se adapta a equipos con proceso liviano y expectativas de calidad claras.",
      },
      high: {
        preferences:
          "Revisa el trabajo dos veces, prefiere el procedimiento escrito y valora la precisión sobre la velocidad.",
        environments:
          "Tiende a rendir bien en finanzas, cumplimiento, control de calidad y roles con mucha documentación.",
      },
    },
  },
  strengths: {
    D: "Se apropia de los resultados y sostiene el impulso cuando las decisiones son difíciles.",
    I: "Genera confianza rápido y eleva la energía del equipo.",
    S: "Aporta constancia y paciencia; una presencia que estabiliza bajo presión.",
    C: "Entrega trabajo preciso y bien documentado, y detecta lo que a otros se les pasa.",
  },
  headlinePair: "{primary} con {secondary}",
  headlineSingle: "{primary}",
  disclaimer:
    "Una prueba de tamizaje de Dexee construida sobre el modelo público de cuatro factores de conducta laboral. No es una evaluación DiSC(R) certificada y describe preferencias, no capacidad. Las empresas ven descriptores, nunca puntajes, y Dexee no ordena candidatos por este perfil.",
};
