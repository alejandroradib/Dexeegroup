import type { DiscCopy } from "./disc";

export const DISC_COPY_EN: DiscCopy = {
  labels: { D: "Dominance", I: "Influence", S: "Steadiness", C: "Conscientiousness" },
  styles: {
    D: {
      low: {
        preferences:
          "Prefers to build agreement before acting and is comfortable letting others lead.",
        environments: "Tends to do well where decisions are shared and pace is set by the team.",
      },
      mid: {
        preferences: "Takes the lead when it is needed and steps back when it is not.",
        environments: "Adapts to teams with a mix of direction from above and room to decide.",
      },
      high: {
        preferences:
          "Decides quickly, pushes for results and is comfortable with friction along the way.",
        environments: "Tends to do well with clear targets, autonomy and a fast pace.",
      },
    },
    I: {
      low: {
        preferences: "Communicates deliberately, often in writing, and keeps opinions until asked.",
        environments: "Tends to do well in focused roles with asynchronous collaboration.",
      },
      mid: {
        preferences: "Comfortable presenting ideas and equally comfortable listening.",
        environments: "Adapts to teams that mix heads-down work with regular interaction.",
      },
      high: {
        preferences: "Persuades, energizes and thinks out loud; motivated by recognition.",
        environments: "Tends to do well in client-facing, sales and coordination roles.",
      },
    },
    S: {
      low: {
        preferences: "Restless with routine and quick to adapt when priorities change.",
        environments: "Tends to do well where the work changes often and speed matters.",
      },
      mid: {
        preferences: "Values stability but handles change without losing pace.",
        environments: "Adapts to teams that evolve gradually rather than by upheaval.",
      },
      high: {
        preferences: "Patient, consistent and loyal to a team; finishes what is started.",
        environments: "Tends to do well in support, operations and long-running accounts.",
      },
    },
    C: {
      low: {
        preferences: "Comfortable acting on estimates and improvising when rules are unclear.",
        environments: "Tends to do well where judgment matters more than procedure.",
      },
      mid: {
        preferences: "Follows procedure where it exists and uses judgment where it does not.",
        environments: "Adapts to teams with light process and clear quality expectations.",
      },
      high: {
        preferences:
          "Checks the work twice, prefers written procedure and values accuracy over speed.",
        environments: "Tends to do well in finance, compliance, QA and documentation-heavy roles.",
      },
    },
  },
  strengths: {
    D: "Takes ownership of outcomes and keeps momentum when decisions are hard.",
    I: "Builds rapport quickly and lifts the energy of a team.",
    S: "Brings consistency and patience; a stabilizing presence under pressure.",
    C: "Delivers accurate, well-documented work and catches what others miss.",
  },
  headlinePair: "{primary} with {secondary}",
  headlineSingle: "{primary}",
  disclaimer:
    "A Dexee screening built on the public four-factor model of workplace behaviour. It is not a certified DiSC(R) assessment and it describes preferences, not ability. Companies see descriptors only, never scores, and Dexee does not rank candidates by this profile.",
};
