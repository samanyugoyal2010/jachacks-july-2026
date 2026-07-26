"use client";
import Link from "next/link";
import { CASES } from "../../lib/cases";

const STEPS = [
  { n: 1, t: "You submit an application", d: "Seven specialist agents read it. Demographic fields are stored on a restricted channel the scoring agents physically cannot read." },
  { n: 2, t: "Three analysts assess it", d: "Affordability (debt-to-income), Risk, and Collateral each write down their reasoning and the exact facts they used." },
  { n: 3, t: "An adjudicator drafts a call", d: "It combines the analyst verdicts into a draft approve or decline." },
  { n: 4, t: "An independent reviewer checks the work", d: "It reaches its own verdict before it is allowed to see the draft, then checks whether the draft leaned on a protected characteristic — or a stand-in for one, like your ZIP code. It can overturn either direction." },
  { n: 5, t: "If declined, you get a plan", d: "Either the paperwork you're missing, or the exact number that has to change — plus a button to re-run the real decision and prove the fix works." },
];

export default function Simulator() {
  return (
    <div className="page narrow">
      <div className="lead">
        <h1>How it works</h1>
        <p>Glass Box decides, then shows its work. Read the five steps, then run a real example
          end-to-end to see what an applicant actually experiences.</p>
      </div>

      <div className="steps">
        {STEPS.map((s) => (
          <div key={s.n} className="howstep">
            <div className="hn">{s.n}</div>
            <div><b>{s.t}</b><p>{s.d}</p></div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 26 }}>Try a real example</h2>
      <p className="muted" style={{ marginTop: -4 }}>
        Each of these is a complete application that exercises a different path. Pick one and it runs
        the actual pipeline — same code as a live application.
      </p>
      <div className="caselist">
        {CASES.map((c) => (
          <Link key={c.id} href={`/?demo=${c.id}`} className="casecard">
            <div className="cctop"><b>{c.name}</b><span className="cctag">{c.tag}</span></div>
            <p>{c.desc}</p>
            <span className="ccgo">Run this example →</span>
          </Link>
        ))}
      </div>

      <div className="card" style={{ marginTop: 22 }}>
        <h3>Why the fairness check is real</h3>
        <p className="cardnote">
          Most systems ask a model to "double-check" a decision it has already been shown — so it agrees.
          Here the reviewer forms its verdict from permissible facts <b>before</b> it can see the draft, and
          it's the only agent allowed to read protected data. Run <b>Maria</b> to watch it overturn a
          discriminatory decline, and <b>Riley</b> to watch it overturn an approval that broke the rules.
          A check that only ever agrees is the same as no check at all.
        </p>
      </div>
    </div>
  );
}
