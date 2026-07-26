"""Page-aware tools: what the agent can do about the page you are looking at.

The extension's content script sends the extracted page with every turn. The
orchestrator's tools cannot receive it as an argument - the LLM would have to
invent the value - so the walker stashes it here first with `set_current_page`
and the tools read it back. One request at a time, which is exactly the shape
of a voice conversation.
"""

include graph;

import from llm { chat_llm, fast_llm }

glob current_page: dict = {};

def set_current_page(payload: dict) {
    current_page = payload;
}

def has_page -> bool {
    return len(current_page) > 0 and str(current_page.get("title", "")) != "";
}

"""Flatten the current page into plain text for grounding an LLM answer."""
def page_as_text(limit: int) -> str {
    if not has_page() {
        return "";
    }
    parts = [f"PAGE TITLE: {current_page.get('title', '')}"];
    parts.append(f"URL: {current_page.get('url', '')}");
    secs = current_page.get("sections", []);
    for s in secs {
        heading = str(s.get("heading", ""));
        body = str(s.get("body", ""));
        parts.append(f"\n## {heading}\n{body}");
    }
    body_text = str(current_page.get("text", ""));
    if len(secs) == 0 and body_text != "" {
        parts.append(body_text);
    }
    joined = "\n".join(parts);
    if len(joined) > limit {
        return joined[:limit];
    }
    return joined;
}

# ─────────────────────── grounded question answering ───────────────────────

"""Answer a question using only the supplied page text."""
def answer_from_page(question: str, page_text: str) -> str by fast_llm(
    temperature=0.1,
    max_tokens=400
);

sem answer_from_page = """
Answer the user's question using ONLY the page content provided. This is going
to be spoken aloud, so reply in one to three short sentences with no markdown
and no lists. If the page does not contain the answer, say so plainly rather
than guessing.
""";
sem answer_from_page.question = "What the user asked about the page.";
sem answer_from_page.page_text = "The full text extracted from the page the user is looking at.";

"""Answer a question about the page the user is currently looking at."""
def ask_about_page(question: str) -> str {
    if not has_page() {
        return "no page content is available for this tab";
    }
    try {
        return answer_from_page(question, page_as_text(9000));
    } except Exception as e {
        return f"could not read the page: {e}";
    }
}

sem ask_about_page = "Answer a question about the content of the web page the user is currently looking at. Use this for questions like 'what does this page say', 'is there a refund policy', 'how much does it cost'.";
sem ask_about_page.question = "The user's question about the page.";

# ───────────────────────────── read aloud ─────────────────────────────

"""Summarize page text for speech at a given reading level."""
def summarize_for_speech(page_text: str, reading_level: str) -> str by fast_llm(
    temperature=0.3,
    max_tokens=500
);

sem summarize_for_speech = """
Summarize this web page so it can be read out loud. Four to six short spoken
sentences. Lead with what the page is actually for, then the two or three
things that matter most. No markdown, no lists, no URLs. Match the requested
reading level.
""";
sem summarize_for_speech.page_text = "The full text extracted from the page.";
sem summarize_for_speech.reading_level = "SIMPLE, STANDARD or EXPERT.";

"""Read or summarize the current page out loud."""
def read_page_aloud -> str {
    if not has_page() {
        return "no page content is available for this tab";
    }
    try {
        return summarize_for_speech(page_as_text(9000), "STANDARD");
    } except Exception as e {
        return f"could not read the page: {e}";
    }
}

sem read_page_aloud = "Read out or summarize the page the user is currently looking at. Use this when they ask you to read, summarize, explain or 'tell me about' this page. The text you return will be spoken to them, so pass it through as your reply.";

# ─────────────────────────── reconstruction ───────────────────────────
# Real implementation lands in M4 (rank -> plan_page -> render_page).

glob last_recon_id: str = "";

def set_last_recon(recon_id: str) {
    last_recon_id = recon_id;
}

def take_last_recon -> str {
    out = last_recon_id;
    last_recon_id = "";
    return out;
}

"""Rebuild the current page, personalized to the stored profile."""
def rebuild_page -> str {
    if not has_page() {
        return "no page content is available for this tab";
    }
    return "reconstruction is not wired up yet";
}

sem rebuild_page = "Rebuild the web page the user is currently looking at as a new page personalized to them, keeping the original's real content. Use this when they ask to redesign, rebuild, personalize, simplify or fix this page.";
