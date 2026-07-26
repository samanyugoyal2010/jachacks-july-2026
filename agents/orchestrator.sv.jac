"""The orchestrator: route what the user said, act, then speak.

WHY THIS IS NOT A ReAct TOOL LOOP
---------------------------------
The first version passed five tools to llama-3.3-70b and let byLLM run a ReAct
loop. Two things broke, both observed live:

  1. The model emitted tool calls as literal TEXT - a reply containing
     `<function=read_page_aloud> {...} </function>` - so the tool never ran and
     the user got markup read aloud.
  2. Five tool schemas plus the system prompt cost ~2k tokens per turn against
     a 12k tokens-per-minute free-tier ceiling, so the third turn of a
     conversation started getting rate-limited.

So routing is a structured-output classification instead. The model picks an
intent against an enforced enum schema - which Groq's gpt-oss models do
reliably - and Jac dispatches deterministically. This is strictly better here:

  * control flow is deterministic and debuggable
  * two LLM calls per turn instead of up to four ReAct iterations
  * far fewer tokens, which is the actual binding constraint
  * it fits the tools-vs-schema rule cleanly - neither call uses tools

The specialists are unchanged, so this is still genuinely multi-agent: the
router, the fact extractor, the page Q&A agent and the page planner are four
different agents on different models with different contracts. Only the
*dispatch* stopped being probabilistic.
"""

include graph;
import from llm { struct_llm, chat_llm }
import from agents.profile { remember_fact, whats_known }
import from agents.page { rebuild_page, ask_about_page, read_page_aloud, has_page }

# ─────────────────────────────── routing ───────────────────────────────

enum Intent {
    REMEMBER_FACT,
    REBUILD_PAGE,
    ASK_ABOUT_PAGE,
    READ_PAGE_ALOUD,
    RECALL_PROFILE,
    SMALL_TALK
}

sem Intent.REMEMBER_FACT = "The user revealed something about themselves: a preference, an interest, an accessibility need, a dislike.";
sem Intent.REBUILD_PAGE = "The user wants this page rebuilt, redesigned, personalized, simplified or made easier to read.";
sem Intent.ASK_ABOUT_PAGE = "The user asked a question about what is on this page.";
sem Intent.READ_PAGE_ALOUD = "The user wants the page read out, summarized or explained.";
sem Intent.RECALL_PROFILE = "The user asked what you know or remember about them.";
sem Intent.SMALL_TALK = "Anything else: greetings, thanks, chit-chat, or an unclear request.";

obj RouteDecision {
    has intent: Intent;
    has fact_snippet: str;
    has question: str;
}

sem RouteDecision.fact_snippet = "If the user revealed anything about themselves, the exact part of what they said that reveals it. Empty string otherwise. Fill this in even when the main intent is something else.";
sem RouteDecision.question = "If the user asked a question about the page, that question. Empty string otherwise.";

"""Classify what the user wants."""
def route(transcript: str) -> RouteDecision by struct_llm(
    temperature=0.0,
    max_tokens=2000
);

sem route = """
The user is looking at a web page and talking to a voice assistant about it.
Classify what they want into exactly one primary intent.

Note that a single utterance can both reveal something about the user AND ask
for something. If they say "I'm dyslexic, can you make this readable", the
primary intent is REBUILD_PAGE and fact_snippet is "I'm dyslexic". Always fill
in fact_snippet when the user says anything about themselves, whatever the
primary intent is.
""";
sem route.transcript = "What the user just said, transcribed from speech.";

# ─────────────────────────────── speaking ───────────────────────────────

"""Turn the outcome of an action into something natural to say out loud."""
def speak(user_said: str, what_happened: str) -> str by chat_llm(
    temperature=0.6,
    max_tokens=300
);

sem speak = """
You are a voice assistant. Write the reply that will be spoken aloud to the
user, based on what they said and the internal result of what you just did for
them.

Rules:
- One to three short spoken sentences, in your own words.
- Never repeat the internal result verbatim. It is a note to you, not to them.
  If it says "stored: is dyslexic", say something like "Got it, I'll remember
  that."
- Never output JSON, HTML, markdown, bullet points, code, function calls or
  URLs. Never read a URL out character by character.
- Do not mention tools, functions, intents or how you work.
- If the internal result is an error, apologise briefly in one sentence and say
  what you could not do.
""";
sem speak.user_said = "What the user said.";
sem speak.what_happened = "The internal result of the action taken. Not user-facing text.";

# ────────────────────────────── dispatch ──────────────────────────────

"""Route one utterance, run the matching action, and return what to say."""
def orchestrate(transcript: str, profile_summary: str, page_title: str) -> str {
    try {
        decision = route(transcript);
    } except Exception as e {
        print(f"[orchestrator] route failed: {e}");
        return "Sorry, I didn't catch that. Could you say it again?";
    }

    # A fact can ride along with any intent, so store it before dispatching.
    side_note = "";
    if decision.fact_snippet.strip() != "" {
        side_note = remember_fact(decision.fact_snippet);
    }

    outcome = "";
    if decision.intent == Intent.REMEMBER_FACT {
        outcome = side_note if side_note != "" else remember_fact(transcript);
    } elif decision.intent == Intent.REBUILD_PAGE {
        outcome = rebuild_page();
    } elif decision.intent == Intent.ASK_ABOUT_PAGE {
        q = decision.question if decision.question.strip() != "" else transcript;
        outcome = ask_about_page(q);
    } elif decision.intent == Intent.READ_PAGE_ALOUD {
        outcome = read_page_aloud();
    } elif decision.intent == Intent.RECALL_PROFILE {
        known = whats_known();
        outcome = f"what is known about the user: {known}";
    } else {
        ctx = f"the user is on a page titled '{page_title}'" if page_title != "" else "no page context";
        outcome = f"just conversation; {ctx}";
        if side_note != "" {
            outcome = f"{outcome}. also {side_note}";
        }
    }

    try {
        return speak(transcript, outcome);
    } except Exception as e {
        print(f"[orchestrator] speak failed: {e}");
        return outcome;
    }
}
