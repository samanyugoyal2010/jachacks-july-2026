"use client";
import { SENSITIVITY } from "../lib/theme";

const CAT_LABEL = {
  identification: "Identification",
  income: "Income",
  income_proof: "Income proof",
  collateral: "Collateral",
  applicant_network: "Banking & references",
  demographic: "Demographic (withheld from analysts)",
  other: "Other",
};
const ORDER = ["identification", "income", "income_proof", "collateral", "applicant_network", "demographic", "other"];

// Raw application data, grouped by category — deliberately NOT in the graph,
// so the constellation stays about reasoning.
export default function DataPanel({ facts }) {
  if (!facts?.length) return null;
  const groups = {};
  facts.forEach((f) => { (groups[f.category || "other"] ||= []).push(f); });
  const protectedCount = facts.filter((f) => f.sensitivity === "PROHIBITED_BASIS").length;

  return (
    <div className="datapanel">
      <div className="dphead">
        <h2 style={{ margin: 0 }}>What we read from your application</h2>
        <span className="dpcount">{facts.length} fields{protectedCount ? ` · ${protectedCount} withheld` : ""}</span>
      </div>
      {ORDER.filter((c) => groups[c]).map((c) => (
        <div key={c} className="dpgroup">
          <div className="dpcat">{CAT_LABEL[c] || c}</div>
          {groups[c].map((f, i) => (
            <div key={i} className="dprow">
              <span className="dpk">{f.key.replace(/_/g, " ")}</span>
              <span className="dpv">{f.value}</span>
              {f.sensitivity !== "PERMISSIBLE" && (
                <span className="dpsens" style={{ color: SENSITIVITY[f.sensitivity]?.color, borderColor: SENSITIVITY[f.sensitivity]?.color + "66" }}>
                  {SENSITIVITY[f.sensitivity]?.label}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
      <p className="dpnote">
        Fields marked <b style={{ color: "var(--prohibited)" }}>prohibited basis</b> are stored on a
        restricted channel that the scoring agents cannot read at all. Fields marked{" "}
        <b style={{ color: "var(--proxy)" }}>proxy risk</b> look neutral but correlate with a
        protected class — the compliance reviewer watches for those.
      </p>
    </div>
  );
}
