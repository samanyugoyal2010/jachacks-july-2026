# Voice Agent — rebuild any page around you

A Chrome extension with a [Jac](https://github.com/jaseci-labs/jac) brain. Talk to it on any
website. It learns who you are across conversations, and on request rebuilds the page you're
looking at as a new page personalized to you — keeping the original's real content.

> **"I'm dyslexic and I care about trail running gear."**
> → stored as structured facts, derived into `reading_level=SIMPLE`, `accessibility=LARGE_TEXT`,
> `interests=[trail running]`
>
> **"Rebuild this page for me."**
> → trail-running content promoted to the top, copy rewritten simpler, 20px base text,
> spacious spacing, the site's real brand colours kept.

Everything except the browser shell is Jac: the persistent graph, four LLM agents, the REST API,
and the HTML renderer.

---

## Setup

**1. Install Jac and the dependencies**

```bash
curl -fsSL https://raw.githubusercontent.com/jaseci-labs/jaseci/main/scripts/install.sh | bash
jac install
```

**2. Add a Groq API key** — free at [console.groq.com/keys](https://console.groq.com/keys)

```bash
echo 'GROQ_API_KEY=gsk_your_key_here' > .env
```

**3. Start the backend**

```bash
./dev.sh restart
```

**4. Build and load the extension**

```bash
cd extension && npm install && node build.mjs
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the
`extension/` folder.

**5. Use it.** Open any website. Either click the **Rebuild this page** button bottom-right, or hit
`⌘⇧U` / `Ctrl+Shift+U` to open the side panel and talk. The first time you use the mic, Chrome opens
a one-time permission tab — allow it once and it persists.

---

## How it works

```
 browser mic ──webm/opus──▶ offscreen doc ──▶ service worker ──▶ POST /walker/Converse
                                                                          │
                                                          Groq Whisper (speech → text)
                                                                          │
                                                      ROUTER  gpt-oss-120b, enum schema
                                                                          │
             ┌──────────────┬──────────────┬─────────────┬────────────────┤
      remember_fact    rebuild_page   ask_about_page  read_aloud    recall_profile
             │              │
     extract_facts    rank → plan_page → render_page
      (schema)         (code)  (schema)   (pure Jac)
             │              │
             ▼              ▼
        PreferenceFact   Reconstruction          ← persistent graph under `root`
                                │
                        SPEAK  llama-3.3-70b
                                │
                        Groq Orpheus (text → speech)
                                │
   ◀── {transcript, spoken_reply, audio_b64, html, recon_id}
                                │
                 content script → <iframe srcdoc> overlay
```

### The design rules, and why

**The LLM never writes HTML.** It emits a small structured `PageSpec`; a hand-written Jac renderer
turns that into the document. So the model cannot produce broken markup, output is ~1.2k tokens
instead of ~6k, every page gets the same real type scale and spacing rhythm, and — most importantly —
the source page's `<script>` tags, inline handlers and CSS have *no path* into the output. We reuse
text and URL strings only. That's a structural defense, not a filter.

**Anything reliability-critical lives in code, not the prompt.** Contrast ratios, font sizes and
motion settings are correctness, not taste. So is ordering: the planner reorders sections no matter
how firmly the prompt forbids it, which buries the one thing the user cares about — so
`enforce_interest_order` re-sorts the blocks after planning. Same for kickers that just restate the
heading, and for forcing the first block to be a hero.

**An agent has tools, or an enforced return schema — never both.** Groq returns
`400 json mode cannot be combined with tool/function calling` when both are sent. byLLM happens to
absorb this, but the split is kept as a safety margin and because it's better architecture.

**Routing is a structured-output classification, not a ReAct loop.** llama-3.3-70b was observed
emitting tool calls as literal text (`<function=read_page_aloud> {...}`), and five tool schemas cost
~2k tokens/turn against a **12k tokens-per-minute** free-tier ceiling — the real binding limit.
Classifying an intent against an enum and dispatching in Jac is more reliable, ~2 calls per turn,
and far cheaper.

### Models

| Role | Model | Why |
|---|---|---|
| Routing, extraction, planning | `groq/openai/gpt-oss-120b` | only Groq models supporting strict `json_schema` |
| Speaking, page Q&A | `groq/llama-3.3-70b-versatile` | better prose; no schema needed |
| Fallback | `groq/llama-3.1-8b-instant` | 14.4k RPD headroom for development |

All three are `ModelPool`s with fallback chains, so a per-minute token refusal degrades instead of
failing the turn.

---

## Development

```bash
./dev.sh restart          # kill, boot, wait for /health
./dev.sh say "..."        # one conversation turn
./dev.sh profile          # what the agent knows about you
./dev.sh reset            # wipe the graph
./dev.sh log              # tail the server

jac check .               # type-check everything
cd extension && node build.mjs --watch
```

Test the pipeline without a browser:

```bash
python3 - <<'PY'
import json, urllib.request
fx = json.load(open("fixtures/patagonia.json"))
req = urllib.request.Request("http://localhost:8000/walker/Converse",
    data=json.dumps({"text":"Rebuild this page for me.","page":fx["page"]}).encode(),
    headers={"Content-Type":"application/json"})
r = json.load(urllib.request.urlopen(req))["data"]["reports"][0]
print(r["spoken_reply"]); open("/tmp/out.html","w").write(r["html"])
PY
open /tmp/out.html
```

`fixtures/patagonia.json` is the easy case (rich section bodies).
`fixtures/patagonia_live.json` is the hard one — captured from the real homepage, where every
visible heading has no prose under it and the planner must fall back to full page text.

**The graph persists in `.jac/` between runs.** That's the point — it's the database. Use
`jac clean --all` between experiments, but *not* when you're testing persistence.

---

## Layout

```
llm.sv.jac              model assignment + the tools-vs-schema rule
graph.sv.jac            nodes, edges, and every graph read/write
endpoints.sv.jac        Converse, GetProfile, AddFact, GetHistory, ResetAll
agents/
  orchestrator.sv.jac   intent routing + the speaking agent
  profile.sv.jac        fact extraction, profile derivation
  planner.sv.jac        the reconstruction agent (emits PageSpec, never HTML)
  page.sv.jac           page-aware actions + the rebuild pipeline
pipeline/
  rank.sv.jac           interest ranking and prompt formatting (no LLM)
  render.sv.jac         PageSpec → HTML, the design system
  serve.sv.jac          GetSite permalink walker
services/speech.sv.jac  Groq Whisper + Orpheus
extension/              MV3: service worker, offscreen recorder, content script, side panel
```

## Known limits

- `@restspec` raw-HTML routing doesn't work under `jac start` 0.34.7 — the custom path loses to the
  client static server. Doesn't matter: host-page `frame-src` CSP blocks an iframe pointing at
  localhost anyway, so the HTML has to travel as a string into `srcdoc` regardless.
- A `by llm()` return type must be declared in the *same file* as the function. Across modules
  (`import` **or** `include`) byLLM's schema builder gets a bare string and dies with
  `'str' object has no attribute 'fields'`.
- `:pub` walkers share one global `root`, so this is single-user. Switching to `:priv` gives each
  authenticated user an isolated graph.
