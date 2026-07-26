"""Page-aware tools: what the agent can do about the page you are looking at.

The extension's content script sends the extracted page with every turn. The
orchestrator's tools cannot receive it as an argument - the LLM would have to
invent the value - so the walker stashes it here first with `set_current_page`
and the tools read it back. One request at a time, which is exactly the shape
of a voice conversation.
"""

include graph;
import from llm { chat_llm, fast_llm }
import from agents.planner { plan_page, PageSpec, PageBlock, BlockLayout }
import from agents.profile { profile_as_text }
import from pipeline.rank { page_for_planner, extraction_quality, topics_from_profile, score_section }
import from pipeline.render { render_page }

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
# rank -> plan_page -> render_page -> graph. The walker picks the id up after.

glob last_recon_id: str = "";
glob last_recon_html: str = "";

def set_last_recon(recon_id: str, html: str) {
    last_recon_id = recon_id;
    last_recon_html = html;
}

def take_last_recon -> str {
    out = last_recon_id;
    last_recon_id = "";
    return out;
}

def take_last_html -> str {
    out = last_recon_html;
    last_recon_html = "";
    return out;
}

"""Reorder planned blocks so interest matches rise, and label the top one.

The hero (index 0) is pinned. Everything after it is scored against the user's
interest topics with the same matcher the section ranker uses, then sorted
stably so blocks that tie keep the planner's chosen order.
"""
def enforce_interest_order(blocks: list[PageBlock], profile_text: str) -> list[PageBlock] {
    if len(blocks) < 3 {
        return blocks;
    }
    topics = topics_from_profile(profile_text);
    if len(topics) == 0 {
        return blocks;
    }

    head = blocks[0];
    rest = blocks[1:];

    scored = [];
    i = 0;
    for b in rest {
        # Later blocks get a small position penalty so ties stay stable.
        s = score_section(b.heading, b.body, topics, 0) - (0.01 * float(i));
        scored.append({"block": b, "score": s});
        i += 1;
    }
    scored.sort(key=lambda (x: dict) { -x["score"]; });

    ordered = [head];
    promoted = False;
    for entry in scored {
        b = entry["block"];
        # Give the single best match a note if the planner did not write one,
        # so the reader can see WHY the page opens where it does.
        if not promoted and entry["score"] > 0.0 {
            if b.personalized_note.strip() == "" {
                b.personalized_note = f"Moved up because you follow {topics[0]}.";
            }
            promoted = True;
        }
        ordered.append(b);
    }
    return ordered;
}

"""Build a plan deterministically, with no LLM. The floor of the fallback chain."""
def literal_plan(page: dict) -> PageSpec {
    title = str(page.get("title", "")).strip();
    if title == "" {
        title = "This page";
    }
    blocks = [];
    secs = page.get("sections", []);
    if isinstance(secs, list) {
        for s in secs[:6] {
            heading = str(s.get("heading", "")).strip();
            body = str(s.get("body", "")).strip();
            if heading == "" and body == "" {
                continue;
            }
            blocks.append(PageBlock(
                layout=BlockLayout.TEXT_ONLY,
                eyebrow="", heading=heading if heading != "" else title,
                body=body[:400], cta_label="", cta_href="",
                image_url="", personalized_note=""
            ));
        }
    }
    if len(blocks) == 0 {
        body = str(page.get("text", "")).strip()[:600];
        blocks.append(PageBlock(
            layout=BlockLayout.HERO_CENTERED, eyebrow="", heading=title,
            body=body if body != "" else "We could not read much from this page.",
            cta_label="", cta_href="", image_url="", personalized_note=""
        ));
    }
    return PageSpec(page_title=title, tagline="", blocks=blocks, nav_labels=[]);
}

"""Rebuild the current page, personalized to the stored profile."""
def rebuild_page -> str {
    if not has_page() {
        return "no page content is available for this tab";
    }

    page = current_page;
    title = str(page.get("title", ""));
    url = str(page.get("url", ""));
    brand = page.get("brand", {});
    if not isinstance(brand, dict) {
        brand = {};
    }

    profile_text = profile_as_text();
    quality = extraction_quality(page);
    fallback_level = 0;
    spec = None;

    # Level 2: too little real content to be worth an LLM call.
    if quality < 0.3 {
        fallback_level = 2;
        spec = literal_plan(page);
    } else {
        try {
            spec = plan_page(page_for_planner(page, profile_text), profile_text);
        } except Exception as e {
            # Level 3: the planner failed. Personalization degrades to a
            # faithful plain reconstruction; the renderer is unaffected.
            print(f"[rebuild] plan_page failed, using literal plan: {e}");
            fallback_level = 3;
            spec = literal_plan(page);
        }
    }

    if len(spec.blocks) == 0 {
        fallback_level = 3;
        spec = literal_plan(page);
    }

    # The planner is told to preserve the pre-ranked section order and reliably
    # does not - it reshuffles by its own sense of importance, which buries the
    # thing the user actually cares about. Ordering is the whole product, so it
    # gets enforced here instead of hoped for. The hero stays pinned at index 0.
    spec.blocks = enforce_interest_order(spec.blocks, profile_text);

    try {
        html = render_page(
            spec, url,
            str(brand.get("primary", "")),
            str(brand.get("accent", "")),
            str(brand.get("fontBody", "")),
            str(brand.get("logo", "")),
            profile_text
        );
    } except Exception as e {
        print(f"[rebuild] render_page failed: {e}");
        return f"could not render the rebuilt page: {e}";
    }

    recon = save_reconstruction(url, title, html, fallback_level);
    set_last_recon(jid(recon), html);

    n = len(spec.blocks);
    if fallback_level == 0 {
        return f"rebuilt the page as {n} sections, reordered and rewritten for this user";
    }
    return f"rebuilt the page as {n} plain sections; personalization was skipped (fallback level {fallback_level})";
}

sem rebuild_page = "Rebuild the web page the user is currently looking at as a new page personalized to them, keeping the original's real content. Use this when they ask to redesign, rebuild, personalize, simplify or fix this page.";
