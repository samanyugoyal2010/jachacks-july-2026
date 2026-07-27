# 🔭 Glass Box

**Auditable multi-agent loan decisioning — with a consumer appeals layer.**
The audit trail *is* the data structure, and the fairness check is an independent review, not a rubber stamp.

A team of specialist agents reads a full loan-application package, writes every fact, judgment,
and rule-check into a shared **provenance graph**, and reaches a decision. A **NoDiscrimination
agent** forms its *own* verdict from permissible facts before it is ever shown the draft, then
catches decisions that leak on a protected characteristic — directly or by proxy — and can veto
in either direction. On a denial, an **Advisor** turns the outcome into a concrete, provable
reapplication plan.

**This project is mostly Jac.** The codebase is written primarily in **[Jac](https://jaseci.org)**
and we lean on it heavily: agents are walkers, the provenance graph *is* the database, access
control is enforced by edge type, and every piece of reasoning is a `by llm()` function over typed
`obj`s. `core.jac`, `agents.jac`, `run_local.jac`, `test_agents.jac` and `test_lineage.jac` carry
the entire product — all seven agents, the graph schema, the fairness rules, the veto logic and the
recourse engine live in Jac. The **Next.js** frontend renders the whole thing as a live "knowledge
constellation" plus a per-agent thought-stream, and a thin FastAPI shim moves JSON; neither of them
decides anything.

> **Working on the engine?** Read **[JAC.md](JAC.md)** — how Jac is used, setup, the verified
> syntax gotchas, the Python↔Jac bridge, and how to add an agent or change a rule.

---

## What's novel

Existing tools (Upstart, Provenir, decision-layer startups) are decision *infrastructure* — they
originate and explain credit decisions. Glass Box adds the two things they don't:

1. **A fairness check that can't rubber-stamp.** The NoDiscrimination agent reaches an independent
   verdict (its function signature *cannot* see the draft outcome), and is the only agent allowed
   to read protected + proxy facts. It vetoes a denial that leaned on a proxy (ZIP code), and it
   overturns an *approval* that violated a hard rule (debt-to-income over the limit).
2. **A consumer appeals + remediation layer.** A denial becomes an applicant action plan —
   *fixable* (missing documents) vs *substantive* (thresholds: "DTI 60%, limit 43%") — and
   "Simulate reapply" re-runs the *real* pipeline to prove the plan works. The advice is exact math
   from the same evidence and rules used to decide, so it's compliant, not synthetic.

Grounded in **ECOA / Regulation B** and **CFPB Circular 2022-03** (adverse-action notices for
algorithmic decisions).

---

## The seven agents (`core.jac`, all Jac walkers)

1. **Intake** — reads the full application package and classifies every fact by **sensitivity**:
   `PERMISSIBLE`, `PROHIBITED_BASIS` (protected characteristic), or `PROXY_RISK` (facially neutral
   but correlated — ZIP code). We deliberately *collect* demographic data — you can't detect a leak
   on a characteristic you never recorded — and gate it with access control (below).
2. **Affordability Analyst** — debt-to-income, income verification.
3. **Risk Analyst** — geographic/other signals (this is where a ZIP proxy sneaks in as a "neutral" feature).
4. **Collateral Analyst** — collateral strength.
5. **Adjudicator** — combines the analyst verdicts into a `DraftDecision`.
6. **NoDiscrimination** — independent verdict → leak detection → comparison → veto (either direction).
7. **Advisor** — on a denial, builds the reapplication plan (fixable vs substantive).

Each analyst records its **actual chain of thought** (`reasoning`), surfaced live in the UI.

### Structural blindness (not a prompt)

Access control is enforced by **edge type**, not instructions:

- `derived_from` — analyst-visible facts. Analysts traverse only this edge and never inspect the
  sensitivity label; a proxy reaches them precisely because it looks permissible.
- `restricted_from` — `PROHIBITED_BASIS` facts. **Only** the NoDiscrimination agent can traverse
  this edge. A query that cannot return a fact is a real access control; a prompt is not.

---

## Run it

```bash
# one-time setup (built on Jac 0.16.7 / Python 3.12 / Node 22)
curl -LsSf https://astral.sh/uv/install.sh | sh
uv venv --python 3.12 .venv
uv pip install --python .venv jaclang byllm fastapi "uvicorn[standard]"
( cd web-ui && npm install )

# start backend (FastAPI :8000) + frontend (Next.js :3000)
./run.sh            # deterministic — bulletproof, offline, best for judging
./run.sh groq       # full pipeline reasons on Groq (gpt-oss-120b)
```

Open **http://localhost:3000**. Five pages:

| Page | What it's for |
|---|---|
| **How it works** (`/`) | The landing page. A five-step plain-English manual, then five example applicants you can run to see different outcomes before trusting it with your own details. |
| **Apply** (`/apply`) | The real product. Enter your own income, debt, collateral and demographic details and get a decision. |
| **Bank match** (`/banks`) | Ten major banks, ranked by how likely each is to accept the same numbers. Estimated by Groq; the bank profiles are illustrative, not real underwriting criteria. |
| **Audit** (`/audit`) | The result: verdict, the Obsidian-style thought graph, each agent's deliberation, and everything we read from the application. |
| **Appeal & fix** (`/appeal`) | Unlocks **only** on a decline (a red dot appears in the nav). The specific reason, the exact change that would qualify you, and a re-check that re-runs the real decision to prove it. |

Three deliberate readability choices:

- **Raw application data is not in the graph.** It lives in a *"What we read from the application"*
  panel, grouped by category with sensitivity badges, so the constellation stays a picture of
  reasoning rather than a wall of fields.
- **Per-agent thought streams.** Each agent's actual chain of thought appears as it works, with the
  active agent highlighted — the graph shows the artifacts, this shows the deliberation.
- **The appeal flow is its own page**, so an approved applicant never sees it.

The UI came from the `UI` branch and was originally built against static mock data. It is now wired
to the live backend via `src/lib/audit/live.ts`, which maps `GraphState` / `RunCase` output into the
shapes the dashboard renders. The older frontend is kept at `web-next/` as a fallback.

Pure-Jac (no server): `.venv/bin/jac run run_local.jac` · `.venv/bin/jac dot core.jac`

### Deploying the frontend (Vercel)

The Next.js app lives in `web-ui/`, not at the repo root — pointing Vercel at the root is what
produces `404: NOT_FOUND`. `vercel.json` builds the subdirectory. If the build still misses it, set
**Root Directory → `web-ui`** in the Vercel project settings, which is the more reliable option and
makes `vercel.json` unnecessary.

Set **`GROQ_API_KEY`** as an environment variable in the Vercel project — Bank match runs as a
serverless route (`web-ui/src/app/api/banks/route.ts`) and calls Groq server-side. Without it the
page still renders, using a deterministic estimate and saying so.

**What works on Vercel and what doesn't.** `/`, `/apply` and `/banks` are fully functional. `/audit`
and `/appeal` need the Jac agent pipeline, which is a stateful local Python process and cannot run
on a serverless host — they detect this and say so rather than hanging. To demo those, run the
backend and either use `localhost` or point `GLASSBOX_API` at a host running `app.py`.

---

## The demo packages

| Package | What happens | Demonstrates |
|---|---|---|
| **Maria Alvarez** | draft DENY (ZIP proxy) → independent **APPROVE** → veto → **APPROVE** | proxy discrimination caught + flipped |
| **Jordan Lee** | draft APPROVE → independent APPROVE → **upheld** | the verifier agrees when it should |
| **Riley Kim** | draft APPROVE (collateral) → independent **DENY** → **overturned** | unsound approval blocked |
| **Sam Rivera** | DENY, DTI 60% (limit 43%) → **substantive** plan → reapply APPROVE | remediation + provable reapply |
| **Casey Doe** | DENY, income unverified → **fixable** plan (submit pay stubs) | submission-level recourse |

Jordan and Riley are the verifier test cases: a fairness check that only ever agrees is
indistinguishable from no check.

---

## The LLM layer (`agents.jac`, Jac's `by llm()`)

`by llm()` functions filling typed `obj`s — the `sem` string *is* the prompt.

- **MockLLM** (default): pre-baked typed outputs, so the pipeline runs offline.
- **Groq** (`GLASSBOX_LLM=groq`): `groq/openai/gpt-oss-120b` (`llama-3.3-70b-versatile` was
  deprecated 2026-06-17). The **verdict and leak checks stay deterministic on purpose** — a
  compliance rule is not a vibe; the LLM writes the reading + coaching narratives around the real
  numbers. The independent-review LLM signature never receives the draft outcome.

Offline self-test: `.venv/bin/jac run test_agents.jac`

---

## Architecture

```
  Next.js (web-ui) — audit dashboard: provenance graph, thought graph,
                     agent timeline, policy panel, node inspector
        │  src/lib/audit/live.ts maps the Jac output into the UI's types
        │  /api/{run,graph,lineage,reset} proxied to the backend (next.config.ts)
        │  /api/banks is a Next route handler — no backend, so it works on Vercel
        ▼
  app.py  — thin FastAPI shim: runs walkers on one shared root, serves JSON
        ▼
  core.jac    7 agents, provenance graph, sensitivity + structural blindness,
              independent review, veto, recourse
  agents.jac  by llm(): extract_facts, independent_review, explanation, action plan
  data/policy.yaml   the NO-DISCRIMINATION rules
```

Everything that decides is Jac. `app.py` and Next.js are transport + rendering — the Python file is
a few dozen lines of shim, and the TypeScript only draws what the Jac walkers already decided. If
you delete the frontend the product still runs end to end (`jac run run_local.jac`); if you delete
the Jac there is nothing left.

## Verification

`verify_gates.py` proves the five gates from a fresh graph: builds clean, the fairness flip, the
verifier upholds *and* overturns an approval, a clean persistence dir, and the offline mock path.

```bash
rm -rf .jac && .venv/bin/python verify_gates.py    # backend gates
( cd web-next && npm run build )                    # frontend builds clean
```

## Files

- `core.jac` — nodes, edges, the 7 agents, `GraphState` / `Lineage` / `Reset`.
- `agents.jac` — the `by llm()` reasoning layer (MockLLM + Groq).
- `app.py` — FastAPI backend.
- `web-next/` — Next.js frontend: `app/page.jsx` (Apply), `app/appeal/page.jsx` (Appeal & fix),
  `app/simulator/page.jsx` (How it works), `components/` (Constellation, DataPanel, Streams, Nav),
  `lib/api.js` (backend calls + the `reasoningGraph` filter that keeps facts out of the graph).
- `data/policy.yaml` — the NO-DISCRIMINATION rules. `run.sh` — launcher.
- `verify_gates.py`, `test_agents.jac`, `run_local.jac`, `test_lineage.jac` — tests / drivers.
