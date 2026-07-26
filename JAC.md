# How Glass Box uses Jac

**Short answer: yes — heavily. Jac *is* the product.** All eight decisioning agents, the
provenance graph, the access-control model, and the LLM reasoning are written in Jac. Python and
Next.js do nothing but transport and pixels.

This doc is for picking the project up cold: the mental model, the setup, the syntax gotchas we
already paid for, and how to make the changes you're most likely to want.

---

## 1. What is actually in Jac

| File | Lines | Contents |
|---|---|---|
| **`core.jac`** | ~720 | **8 node types, 11 edge types, 12 walkers.** The whole engine. |
| **`agents.jac`** | ~57 | **4 `by llm()` functions** + the MockLLM/Groq provider globals. |
| `run_local.jac` | 13 | CLI driver — runs a case and prints the trail. |
| `test_agents.jac` | 19 | Self-test of the LLM layer (works offline). |
| `test_lineage.jac` | 22 | Checks lineage traces back to the application. |

The 12 walkers in `core.jac`:

**The 8 agents** — `Intake`, `AffordabilityAnalyst`, `RiskAnalyst`, `CollateralAnalyst`,
`Adjudicator`, `NoDiscriminationAgent`, `Finalizer`, `Advisor`
**Orchestration + queries** — `RunCase` (runs the pipeline), `Reset`, `GraphState` (the JSON the UI
polls), `Lineage` (walks any node back to the application)

### What is *not* in Jac

- `app.py` (100 lines) — a FastAPI shim. It calls `jac_import("core")` and spawns walkers. It
  contains **no thresholds, no rules, no verdict logic** — grep it for `dti`/`approve`/`veto` and
  you get nothing but a docstring.
- `web-next/` — React rendering. The only numbers in there are demo applicant data and prose.

If you want to change how a decision is made, you edit Jac. There is nowhere else to do it.

---

## 2. Mental model (30 seconds)

Jac is Python-like, but the data model is a **graph** and the functions that walk it are
**walkers**.

```jac
node Fact { has key: str; has value: str; }        # a graph node type
edge derived_from: Application --> Fact {}          # a typed edge, with declared endpoints

walker AffordabilityAnalyst {                       # an "agent"
    can judge with Application entry {              # ability: runs when it visits an Application
        facts = [here ->:derived_from:->];          # traverse: outbound derived_from edges
        # ... reason ...
        here +>:supports:+> Assessment(...);        # write a new node onto the graph
        report {"agent": "affordability"};          # goes back to the caller
    }
}
```

- `here` = the node the walker is currently on. `self` = the walker.
- `root` = the persistent graph root. Everything hangs off it.
- **The graph is the database.** No ORM, no migrations, no serializers. `jac start`/`jac run`
  persist to `./.jac/`.

### The one architectural idea worth understanding

Access control is **structural, by edge type** — not a prompt:

```jac
edge derived_from:    Application --> Fact {}   # analysts CAN traverse this
edge restricted_from: Application --> Fact {}   # ONLY NoDiscriminationAgent traverses this
```

`Intake` routes every `PROHIBITED_BASIS` fact (marital status, public assistance, age) onto
`restricted_from`. The analysts only ever query `derived_from`, so they **physically cannot read**
a protected characteristic. A query that can't return a fact is a real access control; a prompt
saying "please ignore this" is not.

`PROXY_RISK` facts (ZIP code) stay on `derived_from` **on purpose** — they look neutral, so an
analyst picks one up, and that's exactly the leak `NoDiscriminationAgent` is there to catch.

---

## 3. Setup

The system Python on this Mac is 3.9 (Xcode) and **Jac cannot run on it** — needs 3.11+. We use a
`uv`-managed venv. Everything is already installed; to rebuild from scratch:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh     # uv lands in ~/.local/bin
uv venv --python 3.12 .venv
uv pip install --python .venv jaclang byllm fastapi "uvicorn[standard]"
```

Always call Jac through the venv:

```bash
.venv/bin/jac --version          # 0.16.7
.venv/bin/jac check core.jac     # type check — run this constantly
.venv/bin/jac run run_local.jac  # run a case, print the decision trail
.venv/bin/jac dot core.jac       # emit the graph as DOT
.venv/bin/jac format core.jac
```

**`rm -rf .jac` between runs.** `jac run` persists the graph, so re-running duplicates nodes, and
if you changed a `node` definition you'll get `NodeAnchor ... is not a valid reference`. Deleting
`.jac/` fixes it. This will bite you at least once.

Run the whole app (backend + frontend):

```bash
./run.sh          # deterministic
./run.sh groq     # LLM reasoning on Groq
```

---

## 4. Syntax gotchas — all of these cost us real time

These are verified against **Jac 0.16.7**. Docs and LLMs will confidently give you the wrong form.

| Do this | Not this | Note |
|---|---|---|
| `can go with Root entry` | `` can go with `root entry `` | bare `Root` |
| `[-->[?:Application]]` | ``[-->](`?Application)`` | node type filter nests inside the arrows |
| `a +>:cites:+> b;` | `a +>cites+> b` | **create** uses `+` on both sides |
| `[a ->:cites:->]` | `[a -->:cites:-->]` | **read** uses single arrows |
| `[n <-:vetoes:<-]` | — | typed **reverse** read; this works, we tested it |
| `has reports: list[dict] = [];` | `has reports: list[dict];` | the `= []` is required or spawn fails |
| `def f(x: str, fallback: str)` | `def f(x: str, default: str)` | `default` is a **reserved keyword** |
| `has facts: dict[str, str]` | `has facts: dict` | bare generics fail the type checker |
| `disengage;` | `return;` | to stop a walker inside an ability |

**Two more that are easy to miss:**

- **Local variable names must not collide with edge type names.** We had an edge `drafts` and a
  local `drafts = [...]`; type inference silently broke. Rename the local (`draft_list`).
- **`by llm()` return types must be `obj`, never `node`.** Have the LLM fill an `obj`, then copy
  its fields into a node to persist. This is the single most important shape rule.
- **`++>` returns a LIST**, not a node. `made = here ++> Application(...)` → use `made[0]`.

---

## 5. The LLM layer (`agents.jac`)

There is no prompt string anywhere. The `sem` declaration **is** the prompt:

```jac
obj PolicyFinding { has rule_id: str; has passed: bool; has finding: str; }
sem PolicyFinding.passed = "false only when this factor is one the rule prohibits.";

def independent_review(permissible_facts: str, rules: str) -> str by llm();
sem independent_review = "You are an independent reviewer. Given ONLY these permissible facts...";
```

Provider switch is one global:

```jac
glob llm = GROQ if os.getenv("GLASSBOX_LLM", "mock") == "groq" else MOCK;
```

- **MockLLM** is the default — pre-baked typed outputs, runs with the network off. Use it for dev.
- **Groq** = `groq/openai/gpt-oss-120b`. Note `llama-3.3-70b-versatile` was **deprecated
  2026-06-17**; don't reach for it.
- `Model(...)` and `MockLLM(...)` take **`config={...}`**, not kwargs (`config={"temperature":0.2}`).

**Deliberate design choice:** the verdict logic and the leak check are **deterministic**, not LLM.
A compliance rule is not a vibe, and a regulator will not accept "the model felt it was fine." The
LLM does document reading and writes the human-facing narratives *around* numbers the
deterministic code computed. Keep it that way — it's the whole trust argument.

---

## 6. How Python talks to Jac

`app.py` does exactly three things. If you need a new endpoint, copy this shape:

```python
from jaclang import JacRuntimeInterface as R
core = R.jac_import("core", base_path=str(BASE))[0]   # load the Jac program once
ROOT = R.root()                                        # ONE shared root for the process

def run_walker(name, attrs=None):
    w = R.spawn_walker(name, attrs or {}, module_name="core")
    R.spawn(w, ROOT)          # <-- spawn_walker only CREATES; this EXECUTES it
    return w
```

**Two traps here:**

1. **`spawn_walker` does not run the walker.** You must call `R.spawn(w, ROOT)`. Forgetting this
   gives you an untouched walker and empty results.
2. **Read results off walker `has` fields, not the report channel.** The report channel is flushed
   by the API layer and isn't readable this way. That's why `GraphState` has `has graph: dict`,
   `Lineage` has `has result: dict`, `RunCase` has `has summary: dict` — we set them in Jac and
   read them in Python. Follow that pattern for anything new.

Also: **one shared root.** `jac start`'s own server scopes the graph per authenticated user, so a
walker run under one token can't see another's graph — that's why we use our own shim with a single
`ROOT` instead. Don't "fix" this by switching to `jac start` without handling auth.

---

## 7. Making common changes

**Add a new analyst agent**

1. Write the walker in `core.jac`, next to the others:
   ```jac
   walker CreditHistoryAnalyst {
       can judge with Application entry {
           facts: list[Fact] = [here ->:derived_from:->];   // permissible tier only
           a = Assessment(agent="credit_history", verdict="thin",
                          rationale="...", reasoning="my chain of thought...");
           here +>:supports:+> a;
           for f in facts { if f.key == "credit_lines" { a +>:cites:+> f; } }
           report {"agent": "credit_history", "verdict": "thin"};
       }
   }
   ```
2. Spawn it in `RunCase` (`target spawn CreditHistoryAnalyst();`) before `Adjudicator`.
3. Add a friendly label in `web-next/components/Streams.jsx` → `ROLE`.
   The thought-stream UI picks it up automatically from `summary.trace`.

**Add a new fact field**

Add the key to `classify()` (sensitivity) and `categorize()` (which UI group) in `core.jac`. Both
are plain lookup functions. Add the input to the form in `web-next/app/page.jsx`.

**Change a lending rule**

`glob DTI_LIMIT: float = 0.43;` in `core.jac`, and mirror it in `data/policy.yaml` so the
human-readable rules don't drift from the code.

**Change what the graph shows**

`GraphState` in `core.jac` builds the node/edge JSON. The UI hides raw `Fact` nodes via
`reasoningGraph()` in `web-next/lib/api.js` — facts render in the DataPanel instead, so the
constellation stays about reasoning.

---

## 8. Verify before you commit

```bash
.venv/bin/jac check core.jac        # must be 0 errors
.venv/bin/jac check agents.jac
rm -rf .jac && .venv/bin/python verify_gates.py    # the 5 acceptance gates
( cd web-next && npm run build )                    # frontend must build
```

`verify_gates.py` asserts the behaviour that actually matters:

- Maria: draft DENY (ZIP proxy) → veto → final **APPROVE**
- Jordan: draft APPROVE → reviewer **upholds**
- Riley: draft APPROVE → reviewer **overturns** it (broke the DTI rule)
- The reviewer **disagrees** with the draft on Maria and Riley → proves it isn't a rubber stamp
- Sam → `substantive` recourse, Casey → `fixable` recourse

If you touch the review or veto logic, these are the tests that catch you. A fairness check that
only ever agrees is the same as no fairness check, and that's the first thing a judge will probe.

> ⚠️ Don't run `npm run build` while `next dev` is running — it corrupts the dev `.next` cache and
> the app serves unstyled HTML. Fix: `rm -rf web-next/.next` and restart.

---

## 9. Useful reading

`jac guide` lists ~25 curated reference guides — terse and gotcha-focused, better than the docs:

```bash
.venv/bin/jac guide jac-walker-patterns     # traversal, entry points, report/spawn
.venv/bin/jac guide jac-node-edge-patterns  # graph shape, filters, typed edges
.venv/bin/jac guide jac-by-llm              # by llm(), sem, MockLLM, providers
.venv/bin/jac guide jac-debugging
```
