"""Shared types for the voice agent.

Every `obj` here is either an LLM output schema (the return type of a `by llm()`
function, which byLLM enforces) or a payload shape crossing the extension
boundary. Enums are used aggressively over free-text fields: they are far more
reliable for Groq structured output and they keep generation prompts small.

`sem` strings are the ONLY text that reaches the model. Docstrings do not.
"""

# ─────────────────────────── user profile ───────────────────────────

enum FactKind {
    INTEREST,
    ACCESSIBILITY,
    AESTHETIC,
    READING_LEVEL,
    COLOR,
    OTHER
}

sem FactKind.INTEREST = "A topic, product category or subject the user cares about.";
sem FactKind.ACCESSIBILITY = "A vision, reading or motion need, e.g. dyslexia, low vision, motion sensitivity.";
sem FactKind.AESTHETIC = "A visual style preference, e.g. minimalist, dense, playful.";
sem FactKind.READING_LEVEL = "How simple or technical the user wants text to be.";
sem FactKind.COLOR = "A colour or light/dark preference.";
sem FactKind.OTHER = "Anything else, or nothing concrete was stated.";

obj ProfileFact {
    has kind: FactKind;
    has value: str;
}

sem ProfileFact = "One fact about the user, extracted from something they said.";
sem ProfileFact.value = "Short third-person statement, e.g. 'prefers dark mode', 'is dyslexic', 'follows trail running'. Empty string if nothing concrete about the user was stated.";

enum ReadingLevel { SIMPLE, STANDARD, EXPERT }

sem ReadingLevel.SIMPLE = "Short sentences, common words, generous line breaks.";
sem ReadingLevel.STANDARD = "Ordinary web prose.";
sem ReadingLevel.EXPERT = "Dense, retains domain jargon from the source.";

enum VisualDensity { SPACIOUS, BALANCED, DENSE }

sem VisualDensity.SPACIOUS = "Lots of whitespace, fewer things per screen.";
sem VisualDensity.DENSE = "Tight spacing, more content above the fold.";

enum ToneTarget { WARM_CONVERSATIONAL, NEUTRAL_PROFESSIONAL, DIRECT_TERSE, ENTHUSIASTIC }

enum A11yNeed { NONE, LARGE_TEXT, HIGH_CONTRAST, REDUCED_MOTION, LARGE_TEXT_AND_HIGH_CONTRAST }

sem A11yNeed.LARGE_TEXT = "Needs a larger base font size.";
sem A11yNeed.HIGH_CONTRAST = "Needs stronger foreground/background contrast.";
sem A11yNeed.REDUCED_MOTION = "Animation and transitions should be suppressed.";

obj UserInterest {
    has topic: str;
    has weight: float;
}

sem UserInterest.topic = "Short keyword or phrase the user cares about, e.g. 'trail running', 'budget options'.";
sem UserInterest.weight = "0.0 to 1.0 strength of this interest. Used to rank which page sections get promoted.";

obj UserProfile {
    has reading_level: ReadingLevel;
    has density: VisualDensity;
    has tone: ToneTarget;
    has accessibility: A11yNeed;
    has interests: list[UserInterest];
    has dark_mode: bool;
}

sem UserProfile = "A structured personalization profile derived from everything observed about one user.";

# ─────────────────────── extracted page content ───────────────────────
# Populated by the Chrome extension content script from the LIVE rendered DOM,
# not by a server-side fetch. See extension/content/content.js.

obj PageSection {
    has heading: str;
    has body: str;
    has importance: int;
}

sem PageSection.importance = "1 to 5 prominence on the original page, from heading level and document position. 5 is most prominent.";
sem PageSection.body = "Plain text under this heading, already truncated by the extractor.";

obj PageImage {
    has url: str;
    has alt: str;
}

obj PageLink {
    has label: str;
    has href: str;
}

obj PageBrand {
    has primary: str;
    has accent: str;
    has font_body: str;
    has logo: str;
}

sem PageBrand = "The original site's real visual identity, read from resolved computed styles in the browser.";
sem PageBrand.primary = "Primary brand colour as a CSS colour string.";

obj PageContent {
    has url: str;
    has domain: str;
    has title: str;
    has text: str;
    has sections: list[PageSection];
    has nav: list[PageLink];
    has images: list[PageImage];
    has brand: PageBrand;
}

sem PageContent = "Everything extracted from the page the user is currently looking at. Treat `sections` as ground-truth source content.";

enum SiteKind { ECOMMERCE, NEWS_BLOG, SAAS_MARKETING, PORTFOLIO, DOCS_REFERENCE, OTHER }

enum SiteTone { CORPORATE_FORMAL, PLAYFUL_CASUAL, LUXURY_MINIMAL, TECHNICAL_DENSE, EDITORIAL_WARM, UNKNOWN }

enum FontMood { SERIF_EDITORIAL, GEOMETRIC_SANS, ROUNDED_FRIENDLY, MONO_TECHNICAL, UNKNOWN }

# ──────────────────────── reconstruction plan ────────────────────────
# What the page planner emits. Deliberately NOT html: a deterministic Jac
# renderer turns this into a document, so the model cannot emit broken markup
# and the original page's scripts/styles have no path into the output.

enum BlockLayout {
    HERO_CENTERED,
    HERO_SPLIT_IMAGE,
    FEATURE_GRID,
    FEATURE_LIST,
    TEXT_ONLY,
    CTA_BANNER,
    QUOTE_HIGHLIGHT
}

sem BlockLayout.HERO_CENTERED = "Large centered headline with supporting text. Use once, at the top.";
sem BlockLayout.HERO_SPLIT_IMAGE = "Headline beside an image. Use only when a good image_url exists.";
sem BlockLayout.FEATURE_GRID = "Several short items side by side in cards.";
sem BlockLayout.FEATURE_LIST = "A vertical list of short items.";
sem BlockLayout.TEXT_ONLY = "A plain prose section.";
sem BlockLayout.CTA_BANNER = "A single prominent call to action.";
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

sem PageBlock.eyebrow = "Optional short label above the heading, at most four words. Empty string if not applicable.";
sem PageBlock.body = "One to three sentences, rewritten for the target reading level and tone. Must stay faithful to the source section's real content and claims. Never invent facts, prices or features that were absent from the source.";
sem PageBlock.cta_label = "Button text, at most four words. Empty string if this block has no action.";
sem PageBlock.cta_href = "Reuse the original page's real link if the source section had one. Empty string otherwise. Never invent a URL.";
sem PageBlock.image_url = "Reuse one of the original page's real image URLs, or empty string. Never invent a URL.";
sem PageBlock.personalized_note = "One short sentence saying why this block was surfaced for this particular user, based on their interests. Empty string if this block is not personalization-driven.";

obj PageSpec {
    has page_title: str;
    has tagline: str;
    has blocks: list[PageBlock];
    has nav_labels: list[str];
}

sem PageSpec = "A complete plan for the reconstructed page.";
sem PageSpec.tagline = "One short line under the title summarizing the page for this user.";
sem PageSpec.blocks = "Four to seven content blocks, ordered by what matters most to this specific user. Reuse and rewrite the real source content. Never fabricate products, prices, testimonials or claims that were not in the input.";
sem PageSpec.nav_labels = "Three to five short nav labels drawn from the original page's navigation.";
