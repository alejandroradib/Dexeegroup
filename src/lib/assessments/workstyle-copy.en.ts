import type { Factor, Band } from "./workstyle";

export const FACTOR_LABELS_EN: Record<Factor, string> = {
  extraversion: "Extraversion",
  agreeableness: "Agreeableness",
  conscientiousness: "Conscientiousness",
  emotional_stability: "Emotional stability",
  intellect: "Openness",
};

/** Neutral descriptors per factor and band: working preferences and environments where the person tends to perform well. */
export const FACTOR_COPY_EN: Record<
  Factor,
  Record<Band, { preferences: string; environments: string }>
> = {
  extraversion: {
    low: {
      preferences:
        "Prefers focused, independent work and communicates deliberately, often in writing.",
      environments:
        "Tends to perform well in roles with deep work, clear deliverables and asynchronous collaboration.",
    },
    mid: {
      preferences: "Comfortable switching between independent work and group interaction.",
      environments: "Adapts to teams that mix heads-down time with regular meetings.",
    },
    high: {
      preferences: "Energized by frequent interaction and enjoys speaking up in meetings.",
      environments: "Tends to perform well in client-facing roles and highly collaborative teams.",
    },
  },
  agreeableness: {
    low: {
      preferences: "Direct and candid; comfortable challenging ideas and negotiating firmly.",
      environments: "Suits roles that require critical review, negotiation or enforcing standards.",
    },
    mid: {
      preferences: "Balances cooperation with the ability to push back when needed.",
      environments: "Works well in cross-functional teams with shared goals.",
    },
    high: {
      preferences: "Cooperative and attentive to others; prioritizes harmony and support.",
      environments: "Tends to perform well in support, coordination and service roles.",
    },
  },
  conscientiousness: {
    low: {
      preferences: "Flexible and spontaneous; works best with room to improvise.",
      environments:
        "Suits fast-changing contexts where priorities shift and rigid plans are impractical.",
    },
    mid: {
      preferences: "Organized when it matters, flexible when it does not.",
      environments: "Adapts to teams with moderate structure and clear priorities.",
    },
    high: {
      preferences:
        "Highly organized, dependable and detail-oriented; follows through on commitments.",
      environments:
        "Tends to perform well in roles with deadlines, compliance and process ownership.",
    },
  },
  emotional_stability: {
    low: {
      preferences: "Sensitive to pressure and alert to risks; benefits from clear expectations.",
      environments: "Works best with predictable workloads and supportive feedback.",
    },
    mid: {
      preferences: "Generally steady, with normal reactions to peaks of pressure.",
      environments: "Handles most workloads with reasonable planning.",
    },
    high: {
      preferences: "Calm under pressure and recovers quickly from setbacks.",
      environments:
        "Tends to perform well in high-stakes, deadline-driven or client-escalation contexts.",
    },
  },
  intellect: {
    low: {
      preferences: "Practical and grounded; prefers proven methods over experimentation.",
      environments: "Suits roles with established procedures and concrete tasks.",
    },
    mid: {
      preferences: "Open to new ideas while valuing what already works.",
      environments: "Adapts to teams that iterate on existing processes.",
    },
    high: {
      preferences: "Curious and imaginative; enjoys learning and exploring new approaches.",
      environments:
        "Tends to perform well in roles with problem solving, design or continuous change.",
    },
  },
};

export const SJT_SUMMARY_EN: Record<"low" | "mid" | "high", string> = {
  low: "Remote-work judgment: several situations were handled less effectively than best practice suggests. Reviewing communication and ownership habits would help.",
  mid: "Remote-work judgment: sound in most situations, with room to be more proactive in communication and expectation setting.",
  high: "Remote-work judgment: consistently chose proactive, client-oriented responses that protect trust in distributed teams.",
};

export const STRENGTHS_EN: Record<Factor, string> = {
  extraversion: "Builds rapport quickly and keeps communication flowing across the team.",
  agreeableness: "Supports colleagues and clients and keeps collaboration constructive.",
  conscientiousness: "Delivers reliably on commitments and keeps work organized.",
  emotional_stability: "Stays composed under pressure and in client escalations.",
  intellect: "Learns quickly and brings new ideas to processes and products.",
};

export const SJT_STRENGTH_EN =
  "Shows strong judgment for remote work: communicates early, owns outcomes and asks the right questions.";

export const DISCLAIMER_EN =
  "This is a Dexee screening summary of self-reported working preferences. It is not a certification or a clinical assessment.";
