"use client";

const ROLE = {
  Intake: "reads your documents",
  Affordability: "checks you can afford it",
  Risk: "looks for risk signals",
  Collateral: "values your collateral",
  Adjudicator: "makes the draft call",
  NoDiscrimination: "independent fairness review",
  Advisor: "builds your action plan",
};

function cls(v = "") {
  if (/VETO|DENY|disagree|elevated|unaffordable|unverified/i.test(v)) return "veto";
  if (/APPROVE|affordable|strong|standard|upheld/i.test(v)) return "approve";
  return "";
}

export default function Streams({ streams }) {
  if (!streams?.length) return null;
  return (
    <div className="streams">
      {streams.map((s, i) => (
        <div key={i} className={`astream on ${s.active ? "active" : ""}`}>
          <div className="h">
            <b>{s.agent}</b>
            <em className="role">{ROLE[s.agent] || ""}</em>
            <span className={`v ${cls(s.verdict)}`}>{s.verdict}</span>
          </div>
          <div className={`think ${s.active ? "blink" : ""}`}>{s.reasoning}</div>
        </div>
      ))}
    </div>
  );
}
