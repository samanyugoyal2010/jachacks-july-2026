"""The reconstruction agent.

Emits a PLAN, never HTML. A deterministic Jac renderer (pipeline/render.sv.jac)
turns the plan into a document. That split buys four things:

  * the model cannot emit broken markup, because it emits no markup
  * output drops from ~6k tokens of div soup to ~1.2k of content
  * every page gets the same real type scale and spacing rhythm instead of
    freshly invented CSS, which is what makes generated pages look like slop
  * the original page's <script> tags, inline handlers and CSS have NO PATH
    into the output - we reuse text and URL strings only. Structural defense,
    not a filter.

Inputs are plain strings rather than obj types on purpose: byLLM's schema
builder only resolves archetypes declared in this file (see the note in
agents/profile.sv.jac), so everything crossing in arrives pre-formatted.
"""

import from llm { struct_llm }

# ─────────────────────────── output schema ───────────────────────────

enum BlockLayout {
    HERO_CENTERED,
    HERO_SPLIT_IMAGE,
    FEATURE_GRID,
    FEATURE_LIST,
    TEXT_ONLY,
    CTA_BANNER,
    QUOTE_HIGHLIGHT
}

sem BlockLayout.HERO_CENTERED = "Large centered headline with supporting text. Use exactly once, as the first block.";
sem BlockLayout.HERO_SPLIT_IMAGE = "Headline beside an image. Only use when a real image_url is available.";
sem BlockLayout.FEATURE_GRID = "Three or more short items shown side by side as cards.";
sem BlockLayout.FEATURE_LIST = "A vertical list of short items.";
sem BlockLayout.TEXT_ONLY = "A plain prose section.";
sem BlockLayout.CTA_BANNER = "One prominent call to action.";
sem BlockLayout.QUOTE_HIGHLIGHT = "A pulled-out quote or standout statement.";

obj PageBlock {
    has layout: BlockLayout;
    has eyebrow: str;
    has heading: str;
    has body: str;
    has cta_label: str;
    has cta_href: str;
    has image_url: str;
    has personalized_note: str;
}

sem PageBlock.eyebrow = "Optional kicker above the heading, at most three words. It must ADD information the heading does not already carry - a category, an audience, a status. NEVER repeat or paraphrase the heading. If you cannot think of one that adds something, use an empty string. Most blocks should have an empty eyebrow.";
sem PageBlock.heading = "The block's headline. Short and concrete.";
sem PageBlock.body = "One to three sentences rewritten for this user's reading level and tone. Must stay faithful to the source content. Never invent facts, prices, features or claims that were absent from the source.";
sem PageBlock.cta_label = "Button text, at most four words. Empty string if this block has no action.";
sem PageBlock.cta_href = "Reuse a real link from the source page if the section had one. Empty string otherwise. NEVER invent a URL.";
sem PageBlock.image_url = "Reuse one of the real image URLs listed in the source. Empty string if none fits. NEVER invent a URL.";
sem PageBlock.personalized_note = "One short sentence saying why this block matters to THIS user, based on their stated interests. Empty string when the block is not interest-driven. Use this sparingly - at most two blocks should have one.";

obj PageSpec {
    has page_title: str;
    has tagline: str;
    has blocks: list[PageBlock];
    has nav_labels: list[str];
}

sem PageSpec.page_title = "The reconstructed page's title. Keep the original site's real name in it.";
sem PageSpec.tagline = "One short line under the title, summarizing the page for this user.";
sem PageSpec.blocks = "Four to seven blocks, ordered by what matters most to THIS user. Reuse and rewrite the real source content. Never fabricate products, prices, testimonials or claims that were not in the input.";
sem PageSpec.nav_labels = "Three to five short nav labels taken from the original page's navigation.";

# ─────────────────────────────── the agent ───────────────────────────────

"""Plan a personalized reconstruction of a page."""
def plan_page(page_content: str, user_profile: str) -> PageSpec by struct_llm(
    temperature=0.4,
    max_tokens=6000,
    max_output_retries=2
);

sem plan_page = """
Rebuild this web page for one specific person.

You are given the real content extracted from the page they are looking at, and
a profile of who they are. Produce a plan for a new page that keeps the
original's real purpose and information but is reorganized and rewritten around
this reader.

Structure the page properly:
- Block 1 is HERO_CENTERED and is NEW writing. Its heading states what this
  whole site is for, angled at this reader. Do NOT reuse a section heading for
  it. Summarize the site in one line of body text underneath.
- Blocks 2 onward come from the numbered SECTIONS list, and you MUST KEEP THAT
  ORDER. The list has already been sorted for this specific reader: [1] is what
  they care about most. Reordering it destroys the personalization. Section [1]
  becomes block 2, section [2] becomes block 3, and so on. You may drop a
  section entirely, but you may never move one up or down.
- Vary the layouts. A page of nothing but TEXT_ONLY reads flat. Use
  FEATURE_GRID for short parallel items, QUOTE_HIGHLIGHT for a standout claim,
  CTA_BANNER when there is a real action to take.

What personalizing means here:
- ORDER: already decided for you. Preserve the given section order exactly.
- LANGUAGE: rewrite copy to their reading level and tone. SIMPLE means short
  sentences and everyday words. EXPERT means you may keep domain jargon.
- EMPHASIS: give interest-matching blocks a personalized_note explaining why it
  is there. At most two.
- LAYOUT: pick the layout that actually fits each block's content.

Absolute rules:
- Use ONLY facts, claims, products, prices and links present in the source. If
  the source does not say it, it does not go on the page.
- Never invent a URL. Reuse the real ones given, or leave the field empty.
- Do not address the user by name and do not describe their profile back to
  them. The personalization should be felt, not announced.
- Output the plan only. Never output HTML, CSS or markdown.
""";
sem plan_page.page_content = "The real content extracted from the page: title, sections with headings and text, navigation labels and available image URLs. Treat this as ground truth.";
sem plan_page.user_profile = "Who this reader is: reading level, visual density preference, tone, accessibility needs and ranked interests.";
