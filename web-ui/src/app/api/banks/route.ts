/**
 * Bank Match — per-bank acceptance odds.
 *
 * Runs in the Next.js server runtime rather than the Python backend, so the
 * feature works on Vercel where there is no Jac/FastAPI process. It is
 * independent of the decisioning pipeline: no walker, no provenance graph.
 *
 * The bank profiles below are ILLUSTRATIVE. They are written to be plausible,
 * not to reproduce any lender's real underwriting criteria, which are not
 * public. The page says so; keep it that way.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";
const TIMEOUT_MS = 25_000;

interface Bank {
  id: string;
  name: string;
  blurb: string;
  profile: string;
}

const BANKS: Bank[] = [
  { id: "chase", name: "Chase", blurb: "Largest US bank by assets",
    profile: "Conservative on debt-to-income and prefers an existing deposit relationship. Rewards long job tenure. Rarely the easiest approval, but strong terms when it says yes." },
  { id: "bofa", name: "Bank of America", blurb: "National retail lender",
    profile: "Middle-of-the-road on DTI. Weighs verified income heavily and is noticeably friendlier to existing customers. Unverified income is close to an automatic decline." },
  { id: "wells", name: "Wells Fargo", blurb: "Large branch network",
    profile: "Relationship-driven and comparatively strict since its consent-order years. Wants documented income and stable employment; thin files struggle." },
  { id: "citi", name: "Citibank", blurb: "Global consumer bank",
    profile: "Tighter than average on DTI and focused on higher income bands. Less interested in collateral than in cash flow." },
  { id: "usbank", name: "U.S. Bank", blurb: "Midwest-anchored national bank",
    profile: "Moderate and fairly predictable. Gives real weight to appraised collateral, which can offset a borderline DTI more than most peers." },
  { id: "pnc", name: "PNC Bank", blurb: "East-coast regional at national scale",
    profile: "Pragmatic mid-market lender. Comfortable with moderate DTI when employment is stable and income is documented." },
  { id: "capone", name: "Capital One", blurb: "Data-driven consumer lender",
    profile: "The most tolerant of thinner or imperfect profiles on this list. Prices for risk rather than declining it, so approval odds stay higher across the board." },
  { id: "td", name: "TD Bank", blurb: "East-coast retail bank",
    profile: "Straightforward retail underwriting. Wants clean documentation; flexible on collateral, unremarkable on everything else." },
  { id: "truist", name: "Truist", blurb: "BB&T / SunTrust successor",
    profile: "Southeast-weighted regional. Middling DTI tolerance and a genuine preference for secured lending over unsecured." },
  { id: "amex", name: "American Express", blurb: "Premium unsecured lender",
    profile: "The most selective here. Targets high income and low DTI, lends unsecured so collateral counts for nothing, and effectively requires verified income." },
];
const BANK_IDS = new Set(BANKS.map((b) => b.id));

// ---------- credentials ----------
/** GROQ_API_KEY from the environment; locally, fall back to the repo-root .env
 *  so `./run.sh` works without a second copy of the key. On Vercel the file is
 *  absent and the env var is the only source. */
function loadKey(): string {
  const fromEnv = (process.env.GROQ_API_KEY ?? "").trim();
  if (fromEnv) return fromEnv;
  try {
    const text = readFileSync(join(process.cwd(), "..", ".env"), "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      // the committed .env is written `GROQ_API_KEY = gsk_...` with spaces
      if (t.slice(0, eq).trim() === "GROQ_API_KEY") {
        return t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {
    // no .env (normal on Vercel) — fall through
  }
  return "";
}

// ---------- applicant profile ----------
interface Profile {
  annual_income: number;
  monthly_debt: number;
  dti: number;
  income_verified: boolean;
  employment: string;
  tenure_years: number;
  collateral_type: string;
  collateral_value: number;
  collateral_appraised: boolean;
}

const num = (facts: Record<string, string>, key: string): number => {
  const digits = String(facts[key] ?? "").replace(/[^0-9.]/g, "");
  const n = Number.parseFloat(digits);
  return Number.isFinite(n) ? n : 0;
};

const truthy = (v: string | undefined, fallback: boolean): boolean =>
  v === undefined || v === "" ? fallback : ["true", "yes", "y", "1"].includes(v.trim().toLowerCase());

function toProfile(facts: Record<string, string>): Profile {
  const income = num(facts, "annual_income");
  const debt = num(facts, "monthly_debt");
  const ctype = facts.collateral_type || "none";
  return {
    annual_income: income,
    monthly_debt: debt,
    dti: income > 0 ? Math.round(((debt * 12) / income) * 10000) / 10000 : 0,
    income_verified: truthy(facts.income_verified, true),
    employment: facts.employment || "unspecified",
    tenure_years: num(facts, "tenure_years"),
    collateral_type: ctype,
    collateral_value: num(facts, "collateral_value"),
    collateral_appraised: truthy(facts.collateral_appraised, false) && ctype !== "none",
  };
}

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function describe(p: Profile): string {
  const bits = [
    `Annual income: ${usd(p.annual_income)}`,
    `Monthly debt payments: ${usd(p.monthly_debt)}`,
    `Debt-to-income ratio: ${Math.round(p.dti * 100)}%`,
    `Income documented: ${p.income_verified ? "yes" : "no — no pay stubs or tax return on file"}`,
    `Employment: ${p.employment.replace(/_/g, " ")}`,
  ];
  if (p.tenure_years) bits.push(`Years at current job: ${Math.round(p.tenure_years)}`);
  bits.push(
    p.collateral_type !== "none"
      ? `Collateral: ${p.collateral_type} worth ${usd(p.collateral_value)} (${p.collateral_appraised ? "appraised" : "not appraised"})`
      : "Collateral: none offered",
  );
  return bits.map((b) => `- ${b}`).join("\n");
}

const verdictFor = (chance: number): string =>
  chance >= 70 ? "Strong" : chance >= 50 ? "Likely" : chance >= 30 ? "Borderline" : "Unlikely";

interface Rated {
  id: string;
  name: string;
  blurb: string;
  chance: number;
  verdict: string;
  why: string;
}

// ---------- deterministic fallback ----------
/** Used when Groq is unavailable. Rough, transparent, and never blank. */
function fallback(p: Profile): Rated[] {
  const offsets: Record<string, number> = {
    capone: 14, pnc: 7, td: 5, usbank: 3, bofa: 0,
    truist: -2, chase: -6, wells: -8, citi: -10, amex: -20,
  };
  let base: number;
  let why: string;

  if (!p.income_verified) {
    base = 18;
    why = "Income is not documented, which most lenders treat as a blocking gap rather than a weakness.";
  } else {
    const pctDti = Math.round(p.dti * 100);
    if (p.dti <= 0.2) { base = 82; why = `Debt-to-income of ${pctDti}% is comfortably inside typical limits.`; }
    else if (p.dti <= 0.36) { base = 66; why = `Debt-to-income of ${pctDti}% sits in the normal approval band.`; }
    else if (p.dti <= 0.43) { base = 46; why = `Debt-to-income of ${pctDti}% is near the common 43% ceiling.`; }
    else if (p.dti <= 0.55) { base = 24; why = `Debt-to-income of ${pctDti}% is above the limit most lenders hold to.`; }
    else { base = 9; why = `Debt-to-income of ${pctDti}% is far above standard limits.`; }

    if (p.collateral_appraised && p.collateral_value >= 100000) {
      base += 8;
      why += " Appraised collateral helps at lenders that secure the loan.";
    }
  }

  return BANKS.map((b) => {
    const chance = Math.max(1, Math.min(97, base + (offsets[b.id] ?? 0)));
    return { id: b.id, name: b.name, blurb: b.blurb, chance, verdict: verdictFor(chance), why };
  }).sort((a, b) => b.chance - a.chance);
}

// ---------- Groq ----------
function prompt(p: Profile): string {
  const banks = BANKS.map((b) => `- ${b.id} (${b.name}): ${b.profile}`).join("\n");
  return `You are a lending analyst estimating how likely a personal loan applicant is to be approved at each of ten US banks.

APPLICANT
${describe(p)}

BANKS
${banks}

For each bank, estimate the percentage chance this applicant is approved, given that bank's posture. Differentiate the banks — a stricter lender should score lower than a permissive one on the same applicant. Ground every explanation in the applicant's actual numbers above; never invent figures that are not given.

Return ONLY JSON in exactly this shape:
{"banks": [{"id": "<bank id>", "chance": <integer 0-100>, "why": "<one sentence, max 25 words>"}]}

Include all ten banks, using the exact ids given.`;
}

async function askGroq(p: Profile, key: string): Promise<Rated[] | null> {
  let rated: unknown[];
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt(p) }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[banks] groq HTTP ${res.status}; using fallback`);
      return null;
    }
    const payload = await res.json();
    rated = JSON.parse(payload.choices[0].message.content).banks ?? [];
  } catch (e) {
    console.error(`[banks] groq unavailable (${e instanceof Error ? e.message : e}); using fallback`);
    return null;
  }

  // normalize: clamp, drop unknown ids, backfill anything the model skipped
  const byId = new Map<string, { chance: number; why: string }>();
  for (const row of rated) {
    const r = row as { id?: unknown; chance?: unknown; why?: unknown };
    const id = String(r.id ?? "").trim();
    if (!BANK_IDS.has(id) || byId.has(id)) continue;
    const chance = Math.round(Number(r.chance));
    if (!Number.isFinite(chance)) continue;
    byId.set(id, { chance: Math.max(0, Math.min(100, chance)), why: String(r.why ?? "").trim() });
  }
  if (byId.size === 0) {
    console.error("[banks] groq returned no usable rows; using fallback");
    return null;
  }

  const filler = new Map(fallback(p).map((r) => [r.id, r]));
  return BANKS.map((b) => {
    const f = filler.get(b.id) as Rated;
    const got = byId.get(b.id) ?? { chance: f.chance, why: f.why };
    return {
      id: b.id, name: b.name, blurb: b.blurb,
      chance: got.chance, verdict: verdictFor(got.chance), why: got.why || f.why,
    };
  }).sort((a, b) => b.chance - a.chance);
}

// ---------- handler ----------
export async function POST(req: NextRequest) {
  let facts: Record<string, string> = {};
  try {
    const body = await req.json();
    if (body && typeof body.facts === "object" && body.facts) facts = body.facts;
  } catch {
    // empty/malformed body — rate the blank profile rather than 400
  }

  const p = toProfile(facts);
  const key = loadKey();
  const results = key ? await askGroq(p, key) : null;

  if (!results) {
    return NextResponse.json({
      engine: "fallback",
      reason: key ? "Groq unavailable" : "no API key",
      profile: p,
      banks: fallback(p),
    });
  }
  return NextResponse.json({ engine: "groq", profile: p, banks: results });
}
