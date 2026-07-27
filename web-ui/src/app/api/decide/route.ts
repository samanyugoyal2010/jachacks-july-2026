/**
 * The decision pipeline, run on Groq.
 *
 * Vercel cannot host the Jac engine (it holds its provenance graph in process
 * memory and the dependency tree is ~350MB against a 250MB function limit), so
 * a deployed /apply has no way to reach core.jac. This route runs the same
 * seven agents as Groq calls and emits the same `summary` + `graph` shapes the
 * audit dashboard already renders.
 *
 * WHAT DIFFERS FROM core.jac: there, the verdicts are deterministic — DTI 43%
 * is a hard limit enforced in code. Here the model forms them, so the same
 * applicant can get different answers on different runs. Local `./run.sh` still
 * uses the deterministic Jac engine and takes priority over this route.
 *
 * WHAT DOES NOT DIFFER, because it is structural rather than prompted:
 *
 *   1. Access control. Fact classification is a key lookup, not a judgement, so
 *      it stays in code. PROHIBITED_BASIS facts are never serialized into the
 *      analyst or adjudicator request bodies. A fact that is not in the request
 *      cannot influence the answer — that holds for an LLM as much as anything.
 *   2. Independence of the review. The reviewer is dispatched CONCURRENTLY with
 *      the adjudicator, from the analyst output alone. Its request is built and
 *      sent before a draft exists, so it cannot be anchored on one.
 *   3. The veto arithmetic. Comparing the independent verdict to the draft, and
 *      deciding what that means, is done below in code — not asked of a model.
 */
import { type NextRequest, NextResponse } from "next/server";
import { GroqError, askGroqJson, loadGroqKey } from "~/lib/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// mirrors core.jac:20-27
const DTI_LIMIT = 0.43;
const ELEVATED_ZIPS = ["94112", "94124", "94621"];
const NO_DISCRIMINATION_RULE =
  "NO-DISCRIMINATION (ECOA / Regulation B): a credit decision must not rely on a prohibited basis " +
  "(race, color, religion, national origin, sex, marital status, age, receipt of public assistance) " +
  "nor on a facially neutral proxy for one (e.g. ZIP code). Debt-to-income and verified income are " +
  "permissible factors; the affordability limit is a hard rule collateral cannot override.";

// ---------- helpers mirrored from core.jac ----------
const cleanNum = (s: string): number => {
  const d = String(s ?? "").replace(/[^0-9.]/g, "");
  const n = Number.parseFloat(d);
  return Number.isFinite(n) ? n : 0;
};
const normBool = (s: string | undefined, fallback = false): boolean =>
  s === undefined || s === ""
    ? fallback
    : ["true", "yes", "y", "1"].includes(String(s).trim().toLowerCase());
const money = (x: number) => `$${Math.round(x).toLocaleString("en-US")}`;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const roundTo = (x: number, n: number, up: boolean) => {
  const base = Math.floor(x / n) * n;
  return up && x > base ? base + n : base;
};

/** core.jac:116 — the lookup that makes leak detection possible. */
function classify(key: string): string {
  const prohibited = [
    "marital_status",
    "receives_public_assistance",
    "age_bracket",
    "age",
    "race",
    "religion",
    "sex",
    "national_origin",
  ];
  const proxy = ["zip_code", "zipcode", "postal_code"];
  if (prohibited.includes(key)) return "PROHIBITED_BASIS";
  if (proxy.includes(key)) return "PROXY_RISK";
  return "PERMISSIBLE";
}

/** core.jac:126 */
function categorize(key: string): string {
  const g: Record<string, string> = {};
  const put = (keys: string[], v: string) => {
    for (const k of keys) g[k] = v;
  };
  put(["name", "id_type", "id_verified"], "identification");
  put(
    ["annual_income", "employment", "tenure_years", "monthly_debt"],
    "income",
  );
  put(
    ["pay_stub_present", "tax_doc_present", "income_verified"],
    "income_proof",
  );
  put(
    ["collateral_type", "collateral_value", "collateral_appraised"],
    "collateral",
  );
  put(
    ["references", "cosigner", "banking_relationship_years"],
    "applicant_network",
  );
  put(
    ["zip_code", "marital_status", "receives_public_assistance", "age_bracket"],
    "demographic",
  );
  return g[key] ?? "other";
}

// ---------- graph building ----------
interface GNode {
  id: string;
  type: string;
  label: string;
  data: Record<string, unknown>;
}
interface GEdge {
  src: string;
  dst: string;
  rel: string;
}

class Graph {
  nodes: GNode[] = [];
  edges: GEdge[] = [];
  add(type: string, label: string, data: Record<string, unknown>): string {
    const id = crypto.randomUUID().replace(/-/g, "");
    this.nodes.push({ id, type, label, data });
    return id;
  }
  link(src: string, dst: string, rel: string) {
    this.edges.push({ src, dst, rel });
  }
}

interface Fact {
  id: string;
  key: string;
  value: string;
  sensitivity: string;
}

// ---------- the shapes each agent must return ----------
interface AnalystOut {
  affordability: { verdict: string; rationale: string; reasoning: string };
  risk: { verdict: string; rationale: string; reasoning: string };
  collateral: { verdict: string; rationale: string; reasoning: string };
}
interface DraftOut {
  outcome: string;
  reasons: string[];
  relied_on: string[];
  reasoning: string;
}
interface ReviewOut {
  independent_verdict: string;
  reasoning: string;
}
interface AdvisorOut {
  mode: string;
  summary: string;
  steps: {
    factor: string;
    current: string;
    target: string;
    action: string;
    impact: string;
  }[];
}

const factLines = (facts: Fact[]) =>
  facts.map((f) => `- ${f.key}: ${f.value}`).join("\n") || "- (none)";

const norm = (s: string, allowed: string[], fallback: string) => {
  const v = String(s ?? "")
    .trim()
    .toUpperCase();
  return allowed.includes(v) ? v : fallback;
};

// ---------- the agents ----------
function analystPrompt(
  visible: Fact[],
  dti: number,
  verified: boolean,
  zipElevated: boolean,
): string {
  return `You are three independent credit analysts at a lender. Assess this application.

FACTS AVAILABLE TO YOU
${factLines(visible)}

Computed debt-to-income: ${pct(dti)} (the lender's affordability limit is ${pct(DTI_LIMIT)}).
Income documented: ${verified ? "yes" : "no — no pay stub or tax document on file"}.
Area lookup: the applicant's ZIP ${zipElevated ? "IS" : "is NOT"} on the lender's high-default list.

Each analyst writes its own verdict and its real chain of thought.

1. AFFORDABILITY — judge whether the applicant can afford this loan.
   verdict must be one of: "affordable", "unaffordable", "unverified".
   Use "unverified" if income is not documented; you cannot assess an unverified figure.
2. RISK — judge geographic and other risk signals. You treat ZIP code as an ordinary
   neutral geographic feature, like any other column.
   verdict must be "${zipElevated ? "elevated" : "standard"}" — the area lookup above settles it.
   Explain your reasoning in terms of what the lookup told you.
3. COLLATERAL — judge collateral strength.
   verdict must be one of: "strong", "present", "none".

Return ONLY JSON:
{"affordability":{"verdict":"...","rationale":"<short phrase>","reasoning":"<2-3 sentences, cite the actual numbers>"},
 "risk":{"verdict":"...","rationale":"<short phrase>","reasoning":"<2-3 sentences>"},
 "collateral":{"verdict":"...","rationale":"<short phrase>","reasoning":"<2-3 sentences>"}}`;
}

function draftPrompt(a: AnalystOut, dti: number): string {
  return `You are the adjudicator at a lender. Three analysts have reported. Reach a draft decision.

AFFORDABILITY: ${a.affordability.verdict} — ${a.affordability.rationale}
RISK: ${a.risk.verdict} — ${a.risk.rationale}
COLLATERAL: ${a.collateral.verdict} — ${a.collateral.rationale}

Debt-to-income is ${pct(dti)}; the affordability limit is ${pct(DTI_LIMIT)}.

THIS LENDER'S CREDIT POLICY, in order of precedence. Apply it; it is not yours to revise:
  1. Income that could not be verified is a decline — affordability cannot be assessed.
  2. An applicant the risk analyst marked "elevated" is declined on area risk.
  3. Otherwise approve if the affordability analyst returned "affordable".
  4. Strong collateral may carry an approval somewhat above the affordability limit.
  5. Otherwise decline on debt-to-income.

Decide. outcome must be "APPROVE" or "DENY".
"relied_on" lists the factors you actually leaned on, as short phrases — name area risk
explicitly if rule 2 is what drove you.
"reasons" is what you would tell the applicant.

Return ONLY JSON:
{"outcome":"APPROVE"|"DENY","reasons":["..."],"relied_on":["..."],"reasoning":"<2-3 sentences>"}`;
}

/**
 * The reviewer forms its verdict from permissible facts alone. It is NOT asked
 * to detect leaks: that is done structurally below, by checking which facts the
 * analysts actually cited (core.jac:328). Asking a model "was this
 * discriminatory?" produced a veto on every single application in testing,
 * which is the rubber-stamp failure inverted — useless either way.
 */
function reviewPrompt(visible: Fact[], dti: number, verified: boolean): string {
  return `You are an independent reviewer at a lender. You have NOT been told what anyone else
decided; reach your own verdict.

THE RULES YOU APPLY
${NO_DISCRIMINATION_RULE}
AFFORDABILITY: debt-to-income at or above ${pct(DTI_LIMIT)} is a permissible ground for denial. This
is a HARD rule — strong collateral does not override it, and an approval that breaches it is unsound.
INCOME-VERIFICATION: affordability may only be assessed on documented income. If income is not
documented you cannot assess it, and your verdict must be DENY.

PERMISSIBLE FACTS
${factLines(visible.filter((f) => f.sensitivity === "PERMISSIBLE"))}

Computed debt-to-income: ${pct(dti)} (limit ${pct(DTI_LIMIT)}).
Income documented: ${verified ? "yes" : "NO"}.

Apply the rules above to these facts and state your verdict.
independent_verdict must be "APPROVE" or "DENY".

Return ONLY JSON:
{"independent_verdict":"APPROVE"|"DENY","reasoning":"<2-3 sentences citing the actual numbers>"}`;
}

function advisorPrompt(
  reasons: string[],
  mode: string,
  dti: number,
  income: number,
  debt: number,
  missing: string[],
): string {
  return `You are an advisor helping a declined loan applicant qualify on reapplication.

Why they were declined: ${reasons.join(" ")}
Debt-to-income: ${pct(dti)} against a ${pct(DTI_LIMIT)} limit.
Annual income ${money(income)}, monthly debt ${money(debt)}.
${missing.length ? `Missing documents: ${missing.join(", ")}.` : "Their paperwork is complete."}
This is a ${mode} problem${mode === "fixable" ? " — paperwork, not money" : " — the numbers themselves"}.

Write a warm, concrete plan. Every number must come from above; invent nothing.
NEVER mention race, religion, sex, national origin, marital status, age, or public assistance.

Return ONLY JSON:
{"mode":"${mode}","summary":"<2-3 encouraging sentences naming the reason plainly>",
 "steps":[{"factor":"<e.g. monthly_debt>","current":"<value>","target":"<value>","action":"<what to do>","impact":"<what it changes>"}]}`;
}

// ---------- handler ----------
export async function POST(req: NextRequest) {
  const key = loadGroqKey();
  if (!key) {
    return NextResponse.json(
      {
        error:
          "No GROQ_API_KEY is configured, so there is no engine to decide with.",
      },
      { status: 503 },
    );
  }

  let caseId = "MY-APPLICATION";
  let raw: Record<string, string> = {};
  try {
    const body = await req.json();
    if (body?.case_id) caseId = String(body.case_id);
    if (body?.facts && typeof body.facts === "object") raw = body.facts;
  } catch {
    return NextResponse.json({ error: "malformed request" }, { status: 400 });
  }

  const g = new Graph();

  // ----- Intake: classify, then route by sensitivity -----
  const appId = g.add("Application", caseId, {
    case_id: caseId,
    status: "received",
    raw_text: "",
    package_complete: true,
    missing_docs: [] as string[],
  });

  const visible: Fact[] = [];
  const protectedFacts: Fact[] = [];
  for (const [k, v] of Object.entries(raw)) {
    if (v === "" || v === undefined) continue;
    const sensitivity = classify(k);
    const id = g.add("Fact", `${k} = ${v}`, {
      key: k,
      value: v,
      category: categorize(k),
      sensitivity,
      source: "application",
      verified: k === "income_verified" ? normBool(v, true) : true,
      confidence: 1.0,
    });
    const f: Fact = { id, key: k, value: v, sensitivity };
    if (sensitivity === "PROHIBITED_BASIS") {
      protectedFacts.push(f);
      g.link(appId, id, "restricted_from");
    } else {
      visible.push(f);
      g.link(appId, id, "derived_from");
    }
  }

  const income = cleanNum(raw.annual_income ?? "0");
  const debt = cleanNum(raw.monthly_debt ?? "0");
  const dti = income > 0 ? (debt * 12) / income : 0;
  const verified = normBool(raw.income_verified, true);

  const missing: string[] = [];
  if (!verified) missing.push("income verification (pay stubs or tax return)");
  if (
    (raw.collateral_type ?? "none") !== "none" &&
    !normBool(raw.collateral_appraised, true)
  ) {
    missing.push("collateral appraisal");
  }
  const appNode = g.nodes.find((n) => n.id === appId) as GNode;
  appNode.data.missing_docs = missing;
  appNode.data.package_complete = missing.length === 0;

  try {
    // Whether a ZIP is on the high-default list is a lookup, not a judgement
    // (core.jac:225), so it is answered here. That also makes the `cites` edge
    // below deterministic, and leak detection reads those edges.
    const zip = raw.zip_code ?? "";
    const zipElevated = zip !== "" && ELEVATED_ZIPS.includes(zip);

    // ----- Round 1: the three analysts. Protected facts are not in this prompt. -----
    const analysts = await askGroqJson<AnalystOut>(
      key,
      analystPrompt(visible, dti, verified, zipElevated),
    );
    analysts.risk.verdict = zipElevated ? "elevated" : "standard";

    const mkAssessment = (
      agent: string,
      o: { verdict: string; rationale: string; reasoning: string },
      citeKeys: string[],
    ) => {
      const id = g.add("Assessment", `${agent}: ${o.verdict}`, {
        agent,
        verdict: o.verdict,
        rationale: o.rationale,
        reasoning: o.reasoning,
      });
      g.link(appId, id, "supports");
      for (const f of visible)
        if (citeKeys.includes(f.key)) g.link(id, f.id, "cites");
      return id;
    };

    mkAssessment("affordability", analysts.affordability, [
      "annual_income",
      "monthly_debt",
    ]);
    // the risk agent cites the ZIP exactly when the ZIP is what drove it — that
    // edge is what the leak scan keys on
    mkAssessment("risk", analysts.risk, zipElevated ? ["zip_code"] : []);
    mkAssessment("collateral", analysts.collateral, [
      "collateral_type",
      "collateral_value",
    ]);

    // ----- Round 2: adjudicator and reviewer, concurrently. -----
    // The reviewer's request is built and sent before any draft exists.
    const [draft, review] = await Promise.all([
      askGroqJson<DraftOut>(key, draftPrompt(analysts, dti)),
      askGroqJson<ReviewOut>(key, reviewPrompt(visible, dti, verified)),
    ]);

    const draftOutcome = norm(draft.outcome, ["APPROVE", "DENY"], "DENY");
    const indep = norm(review.independent_verdict, ["APPROVE", "DENY"], "DENY");

    const draftId = g.add("DraftDecision", `DRAFT: ${draftOutcome}`, {
      outcome: draftOutcome,
      reasons: draft.reasons ?? [],
      relied_on: draft.relied_on ?? [],
    });
    g.link(appId, draftId, "drafts");

    // ----- Leak detection: structural, from the cites edges (core.jac:328) -----
    // Whether an assessment leaned on a non-permissible fact is a fact about the
    // graph, not a judgement call, so it is answered by reading the graph.
    const citedIds = new Set(
      g.edges.filter((e) => e.rel === "cites").map((e) => e.dst),
    );
    const leaked = [...visible, ...protectedFacts].filter(
      (f) => citedIds.has(f.id) && f.sensitivity !== "PERMISSIBLE",
    );

    // ----- The veto arithmetic stays in code (core.jac:337) -----
    const agree = indep === draftOutcome;
    const leak = leaked.length > 0;
    const vetoed = leak || (draftOutcome === "APPROVE" && indep === "DENY");

    let finding: string;
    if (leak) {
      const lf = leaked[0];
      const kind =
        lf.sensitivity === "PROXY_RISK"
          ? "a proxy for a protected class"
          : "a prohibited basis";
      finding =
        `The draft relied on '${lf.key}' (=${lf.value}), ${kind} under NO-DISCRIMINATION. ` +
        `Vetoing and re-deciding on permissible factors only.`;
    } else if (draftOutcome === "APPROVE" && indep === "DENY") {
      finding = `The draft APPROVED, but my independent review is DENY. The approval is unsound; vetoing.`;
    } else if (!agree) {
      finding = `My independent review (${indep}) disagrees with the draft (${draftOutcome}). No prohibited dependence found; recording the disagreement.`;
    } else {
      finding = `My independent review (${indep}) agrees with the draft. Upheld.`;
    }

    const reviewId = g.add(
      "Review",
      `REVIEW: ${indep}${vetoed ? " VETO" : agree ? "" : " (disagree)"}`,
      {
        independent_verdict: indep,
        draft_outcome: draftOutcome,
        agree,
        vetoed,
        leak,
        leak_factor: leak ? leaked[0].key : "",
        finding,
        reasoning: `${review.reasoning} ${protectedFacts.length} protected fact(s) on file were readable only to me.`,
      },
    );
    g.link(draftId, reviewId, "reviews");
    if (vetoed) g.link(reviewId, draftId, "vetoes");

    // ----- Finalize: a veto is resolved by adopting the independent verdict -----
    const finalOutcome = vetoed ? indep : draftOutcome;
    const finalReasons =
      vetoed && leak
        ? ["Re-decided on permissible factors only."]
        : (draft.reasons ?? []);
    const finalRelied =
      finalOutcome === "APPROVE"
        ? ["debt-to-income within limit"]
        : vetoed && leak
          ? ["permissible factors only"]
          : (draft.relied_on ?? []);

    const decId = g.add("Decision", `FINAL: ${finalOutcome}`, {
      outcome: finalOutcome,
      reasons: finalReasons,
      relied_on: finalRelied,
      explanation: "",
      vetoed_once: vetoed,
    });
    g.link(appId, decId, "finalizes");
    appNode.data.status = "decided";

    // ----- Round 3: advisor, only on a denial -----
    let planMode = "";
    let advisor: AdvisorOut | null = null;
    if (finalOutcome === "DENY") {
      planMode =
        !appNode.data.package_complete || !verified ? "fixable" : "substantive";
      advisor = await askGroqJson<AdvisorOut>(
        key,
        advisorPrompt(finalReasons, planMode, dti, income, debt, missing),
      );

      // core.jac:484 asserts recourse never cites a prohibited basis. Keep that
      // guarantee: a model wrote this text, so check it rather than trust it.
      const blob = [
        advisor.summary,
        ...(advisor.steps ?? []).flatMap((s) => [s.action, s.impact]),
      ]
        .join(" ")
        .toLowerCase();
      const banned = [
        "marital",
        "public assistance",
        "welfare",
        "age bracket",
        " age ",
        "race",
        "religion",
        "national origin",
      ];
      if (banned.some((t) => blob.includes(t))) {
        advisor = {
          mode: planMode,
          summary:
            planMode === "fixable"
              ? "Your application is missing required documents, so we could not fully assess it. Provide the item(s) below and your decision may change on reapplication."
              : `You were declined because your debt-to-income ratio is ${pct(dti)}; our limit is ${pct(DTI_LIMIT)}. The step below brings you within the limit.`,
          steps: advisor.steps ?? [],
        };
      }

      // reapply_facts must be machine-usable for the /appeal re-check, so the
      // numbers are computed here rather than parsed back out of prose
      const reapply: Record<string, string> = {};
      if (planMode === "fixable") {
        for (const f of visible) reapply[f.key] = f.value;
        reapply.income_verified = "true";
        reapply.pay_stub_present = "true";
        reapply.collateral_appraised = "true";
      } else {
        const targetDti = DTI_LIMIT - 0.02;
        const recDebt = roundTo((income * targetDti) / 12, 50, false);
        reapply.annual_income = String(Math.round(income));
        reapply.monthly_debt = String(Math.round(recDebt));
        reapply.income_verified = "true";
      }

      const steps = (advisor.steps ?? []).slice(0, 3);
      const planId = g.add("RemediationPlan", "REAPPLY PLAN", {
        target_outcome: "APPROVE",
        mode: planMode,
        summary: advisor.summary,
        feasible: true,
        reapply_facts: reapply,
        steps: steps.map((s) => ({ ...s, status: "todo" })),
      });
      g.link(decId, planId, "advises");
      for (const s of steps) {
        const sid = g.add(
          "RemediationStep",
          `${s.factor}: ${s.current} -> ${s.target}`,
          {
            ...s,
            status: "todo",
          },
        );
        g.link(planId, sid, "step_of");
        const target = visible.find((f) => f.key === s.factor);
        if (target) g.link(sid, target.id, "targets_fact");
      }
    }

    // ----- the ordered thought-stream the UI replays -----
    const trace = [
      {
        agent: "Intake",
        verdict: `${visible.length} visible + ${protectedFacts.length} protected facts`,
        reasoning:
          "Read the application package and classified every fact by sensitivity. Protected " +
          "characteristics were routed to a restricted channel the analysts cannot read.",
      },
      {
        agent: "Affordability",
        verdict: analysts.affordability.verdict,
        reasoning: analysts.affordability.reasoning,
      },
      {
        agent: "Risk",
        verdict: analysts.risk.verdict,
        reasoning: analysts.risk.reasoning,
      },
      {
        agent: "Collateral",
        verdict: analysts.collateral.verdict,
        reasoning: analysts.collateral.reasoning,
      },
      {
        agent: "Adjudicator",
        verdict: draftOutcome,
        reasoning: draft.reasoning ?? "",
      },
      {
        agent: "NoDiscrimination",
        verdict: `${indep}${vetoed ? " / VETO" : agree ? " / upheld" : " / disagree"}`,
        reasoning: `${review.reasoning} ${finding}`,
      },
      ...(advisor
        ? [
            {
              agent: "Advisor",
              verdict: `${planMode} remediation`,
              reasoning: advisor.summary,
            },
          ]
        : []),
    ];

    return NextResponse.json({
      summary: {
        case_id: caseId,
        draft_outcome: draftOutcome,
        final_outcome: finalOutcome,
        flipped: vetoed && finalOutcome !== draftOutcome,
        denied: finalOutcome === "DENY",
        has_plan: !!advisor,
        plan_mode: planMode,
        independent_verdict: indep,
        vetoed,
        agree,
        engine: "groq",
        trace,
      },
      graph: { nodes: g.nodes, edges: g.edges },
    });
  } catch (e) {
    const msg =
      e instanceof GroqError ? e.message : "the reasoning model failed";
    console.error(`[decide] ${msg}`, e);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
