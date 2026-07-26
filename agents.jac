"""Glass Box - the byLLM reasoning layer.

These are the LLM-backed agent capabilities. In the demo they run on Groq
(fast, so the graph builds live). MockLLM lets the whole pipeline run offline
with pre-baked typed outputs. `core.jac` includes this file and calls these
functions when GLASSBOX_LLM=groq; otherwise it uses a deterministic path.
"""
import os;
import from byllm.lib { Model, MockLLM }

# ---- typed outputs the LLM must fill (never a `node`, always an `obj`) ----
obj ExtractedFact {
    has key: str;
    has value: str;
    has confidence: float;
}
sem ExtractedFact.key = "snake_case name of the fact. Use exactly these keys when present: annual_income, monthly_debt, receives_public_assistance.";
sem ExtractedFact.value = "the literal value as stated. For annual_income and monthly_debt give digits only (no $ or commas). For receives_public_assistance give 'true' or 'false'.";
sem ExtractedFact.confidence = "1.0 if stated verbatim, lower if inferred.";

# ---- the LLM-backed agent functions (the prompt IS the sem string) ----
def extract_facts(application_text: str) -> list[ExtractedFact] by llm();
sem extract_facts =
    "Extract atomic, typed facts from a loan application. Extract only what is stated.";

# NOTE: the signature deliberately does NOT include the draft outcome. The
# independent review must form its own view before it is ever shown the draft.
def independent_review(permissible_facts: str, rules: str) -> str by llm();
sem independent_review =
    "You are an independent reviewer. Given ONLY these permissible facts and rules, reason in one "
    "or two sentences about whether the application should be approved. You have NOT been told what "
    "anyone else decided. State your own view and why.";

def plain_language_explanation(outcome: str, permissible_reasons: list[str]) -> str by llm();
sem plain_language_explanation =
    "Write a 2-sentence, plain-language adverse-action style explanation of the outcome using ONLY the permissible reasons given. Do not mention any prohibited factor.";

def draft_action_plan(outcome: str, denial_reason: str, steps: list[str]) -> str by llm();
sem draft_action_plan =
    "Write a warm, encouraging 2-3 sentence message to a denied loan applicant. Name the denial reason plainly, then tell them the concrete steps below will put them on track to qualify on reapplication. Do not invent new numbers; only reference the steps given.";

# ---- provider selection ----
# MockLLM (offline, demo-safe) unless GLASSBOX_LLM=groq. Outputs feed the
# offline self-test in test_agents.jac (extract -> independent_review -> explanation -> action plan).
glob MOCK = MockLLM(model_name="mockllm", config={"outputs": [
    [ExtractedFact(key="annual_income", value="52000", confidence=1.0),
     ExtractedFact(key="monthly_debt", value="900", confidence=1.0),
     ExtractedFact(key="zip_code", value="94112", confidence=1.0)],
    "On the permissible facts alone, debt-to-income is within the limit, so I would approve.",
    "Your application was approved on affordability grounds. The decision used only permissible factors.",
    "You were close. Reduce your monthly obligations a little and you should qualify on reapplication."
]});

# Groq: llama-3.3-70b-versatile was deprecated 2026-06-17 -> gpt-oss-120b / qwen3-32b.
glob GROQ = Model(model_name="groq/openai/gpt-oss-120b", config={"temperature": 0.2});

glob llm = GROQ if os.getenv("GLASSBOX_LLM", "mock") == "groq" else MOCK;
