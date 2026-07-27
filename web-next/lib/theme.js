// Node styling for the constellation. Colour by type; facts re-colour by sensitivity.
export const TYPE = {
  Application: { color: "#5b9dff", glow: "#5b9dff" },
  Fact: { color: "#8593a8", glow: "#8593a8" },
  Assessment: { color: "#2dd4bf", glow: "#2dd4bf" },
  DraftDecision: { color: "#f2b13c", glow: "#f2b13c" },
  Review: { color: "#c084fc", glow: "#c084fc" },
  Decision: { color: "#3ecf8e", glow: "#3ecf8e" },
  RemediationPlan: { color: "#a78bfa", glow: "#a78bfa" },
  RemediationStep: { color: "#c4b5fd", glow: "#c4b5fd" },
};

export const SENSITIVITY = {
  PERMISSIBLE: { color: "#8593a8", label: "permissible" },
  PROXY_RISK: { color: "#f2b13c", label: "proxy risk" },
  PROHIBITED_BASIS: { color: "#ff5c6c", label: "prohibited basis" },
};

// Reveal order maps trace agents to the node types they produce.
export const AGENT_STAGE = {
  Intake: ["Application", "Fact"],
  Affordability: ["Assessment:affordability"],
  Risk: ["Assessment:risk"],
  Collateral: ["Assessment:collateral"],
  Adjudicator: ["DraftDecision"],
  NoDiscrimination: ["Review", "Decision"],
  Advisor: ["RemediationPlan", "RemediationStep"],
};

export function nodeColor(n) {
  if (n.type === "Fact" && n.data?.sensitivity) {
    return SENSITIVITY[n.data.sensitivity]?.color || "#8593a8";
  }
  if (n.type === "Review") return n.data?.vetoed ? "#ff5c6c" : "#c084fc";
  if (n.type === "Decision" || n.type === "DraftDecision")
    return n.data?.outcome === "APPROVE" ? "#3ecf8e" : (n.type === "DraftDecision" ? "#f2b13c" : "#ff5c6c");
  return TYPE[n.type]?.color || "#8899aa";
}
