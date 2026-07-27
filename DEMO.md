# Glass Box — Demo Script

Values below were **run against the live backend** and produce the stated outcomes. Type them into
**Apply** exactly as written. Don't improvise the numbers — the thresholds are real (DTI limit 43%,
ZIP proxy list), so small changes flip the result.

> Setup: `./run.sh` → open **http://localhost:3000**. Do a throwaway run before you present so the
> dev server is warm. If you ran a demo already, hit **Reset** on the audit page first.

---

## ACT 1 — "The problem nobody can see" (your main wow)

**Persona: Dana Whitfield.** She can comfortably afford this loan. She gets declined anyway,
because the risk model leans on her ZIP code — which is a stand-in for race. The reviewer catches it.

Type into **Apply**:

| Field | Value |
|---|---|
| Full name | `Dana Whitfield` |
| Annual income ($) | `64000` |
| Monthly debt payments ($) | `1100` |
| Employment | Full time |
| Years at your job | `5` |
| Can you document your income? | **Yes — pay stubs or tax return** |
| Collateral → Type | **Vehicle** |
| Collateral → Estimated value ($) | `14000` |
| Collateral → Appraised? | **Appraised** |
| ZIP code | `94124` |
| Marital status | **Single** |
| Receiving public assistance? | **Yes** |
| Age bracket | **25–34** |

**Verified result:** draft `DENY` → independent verdict `APPROVE` → **veto** → final **`APPROVE`**

### What to say, in order

1. **Before you submit** — *"She earns $64k and pays $1,100 a month. She can afford this. Watch what happens anyway."*
2. **Point at the demographic box** — *"We deliberately collect her marital status, age, and that she's on public assistance. Most systems hide this. You can't prove a decision didn't use a characteristic you never recorded — and the scoring agents physically can't read it. That's enforced by the data layer, not a prompt."*
3. **Orchestration panel** — *"Seven agents. Three assess in parallel, none of them can see protected data."*
4. **Risk Analyst's thought stream** — it says ZIP 94124 is a high-default area. *"It thinks it's being neutral. It's using geography, which in the US is a proxy for race. This is how discrimination actually happens — nobody types 'deny her for being Black.'"*
5. **Adjudicator drafts DENY.** Pause here. *"In any normal system, this is the end. She gets a form letter."*
6. **Policy Verifier turns red.** *"It decided APPROVE on its own — before it was allowed to see the draft. Then it found the draft leaning on ZIP code and vetoed it."*
7. **Final: APPROVE.** *"The system caught its own discrimination and reversed it. No human in the loop."*

**The line to land:** *"The check works because it can't rubber-stamp — it forms its verdict before it's shown the answer."*

---

## ACT 2 — "A fair no, with a way back"

Different applicant, honest decline. Shows the recourse layer and the **denied → approved** journey.

Type into **Apply** (hit *Start a new application* / Reset first):

| Field | Value |
|---|---|
| Full name | `Marcus Ellery` |
| Annual income ($) | `48000` |
| Monthly debt payments ($) | `2100` |
| Employment | Full time |
| Can you document your income? | **Yes — pay stubs or tax return** |
| Collateral → Type | **None** |
| ZIP code | `94301` |
| *(leave demographics blank / defaults)* | |

**Verified result:** final **`DENY`** · plan mode **substantive** · *"debt-to-income ratio is 52%; our limit is 43%"*

Then click **"Declined — see how to fix it →"**. The Appeal page shows (verified):

- **Pay down $500 of monthly obligations** — `$2,100 → $1,600`, DTI **52% → 40%**
- *or* **Increase documented income to $62,000** — DTI **52% → 41%**

Click **"Re-check with this fix applied"** → **"You would be approved."**

### What to say

> *"This one is a real no — he genuinely can't afford it, and the reviewer independently agreed. But he doesn't get a form letter. He gets the exact number: 52%, limit 43%. Pay down $500 and you qualify. And this button re-runs the actual decision engine on the corrected application — so that's not a promise, it's a result."*

**The line to land:** *"Equity isn't only about catching bias. It's about a no that tells you how to turn it into a yes."*

---

## BACKUP — "It's paperwork, not money"

If you have time, or if Act 2 lands flat. Shows the system distinguishing a *submission* problem
from a *money* problem.

| Field | Value |
|---|---|
| Full name | `Priya Raman` |
| Annual income ($) | `72000` |
| Monthly debt payments ($) | `1300` |
| Employment | **Self employed** |
| Can you document your income? | **No documents yet** |
| ZIP code | `94301` |

**Verified result:** final **`DENY`** · plan mode **fixable** → *"Submit income verification (pay stubs or tax return)."*

> *"She earns plenty. Her debt-to-income is fine. She's self-employed with no pay stubs — so the
> affordability agent refused to guess. It's declined as a paperwork problem, not a money problem,
> and it tells her exactly which document to send."*

---

## If a judge pushes back

**"Couldn't the reviewer just always agree?"**
> Run **Riley** from the How-it-works page — the reviewer overturns an *approval* there. It blocks in
> both directions. A check that only ever agrees is the same as no check.

**"Is the AI making up these numbers?"**
> No. The verdict logic and thresholds are deterministic in Jac. The LLM reads documents and writes
> the explanation *around* numbers the rules computed. A compliance rule can't be a vibe.

**"How much is real?"**
> All decisioning is Jac — 7 agents as walkers, the provenance graph as the database. Every panel
> on screen is one live run; nothing is scripted. `verify_gates.py` proves the fairness flip, both
> reviewer test cases, and that it runs offline with the network disabled.

---

## Timing (4 min)

| | |
|---|---|
| 0:00–0:30 | Landing page: the problem — form letter, no recourse |
| 0:30–2:00 | **Act 1** — Dana: discrimination caught and reversed |
| 2:00–3:15 | **Act 2** — Marcus: fair decline → plan → re-check → approved |
| 3:15–4:00 | Architecture: 7 agents, structural blindness, backward veto arrow |

**Cut first if short on time:** the Backup case, then the data panel walkthrough.
**Never cut:** Dana's veto moment, and Marcus's re-check flipping to approved.
