"""Profile agents: turn speech into structured, persisted knowledge.

Two LLM calls live here, both on `struct_llm` with an enforced return schema
and NO tools - see the tools-vs-schema rule in llm.sv.jac.

WHY THE TYPES ARE DECLARED HERE AND NOT IN A SHARED MODULE
----------------------------------------------------------
byLLM builds the JSON output schema by reflecting over the return type AND its
semantic (`sem`) registry entries. That lookup only resolves when the `obj` is
declared in the SAME FILE as the `by llm()` function. Reach the type through
`import from other_module` - or even `include other_module` - and byLLM's
schema builder receives a bare string instead of the archetype and dies with:

    'str' object has no attribute 'fields'

...at schema.impl.jac:111, where it does `info.fields`. Verified empirically:
identical code passes with the obj local and fails with it imported.

So: every agent declares the types it returns. That costs a little duplication
and buys correctness, and it happens to give each agent ownership of its own
output contract.
"""

include graph;
import from llm { struct_llm }

# ─────────────────────────── output schemas ───────────────────────────

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
sem UserInterest.weight = "0.0 to 1.0 strength of this interest.";

obj UserProfile {
    has reading_level: ReadingLevel;
    has density: VisualDensity;
    has tone: ToneTarget;
    has accessibility: A11yNeed;
    has interests: list[UserInterest];
    has dark_mode: bool;
}

# ─────────────────────────── fact extraction ───────────────────────────

obj FactList {
    has facts: list[ProfileFact];
}

sem FactList.facts = "Every distinct fact about the user found in the speech. Empty list if the speech says nothing concrete about the user themselves.";

"""Pull every structured fact about the user out of something they said."""
def extract_facts(speech: str) -> FactList by struct_llm(
    temperature=0.0,
    max_tokens=2500
);

sem extract_facts = """
Extract EVERY distinct fact about the USER from this snippet of speech - what
they like, need, prefer, dislike or care about. One utterance often contains
more than one: "I'm dyslexic and I care about trail running gear" contains two,
an accessibility need and an interest. Split them.

Write each value as a short third-person statement, for example 'is dyslexic',
'prefers dark mode', 'follows trail running'. Only include facts about the USER
themselves - not about the page, the weather, or anything else. If the speech
says nothing concrete about the user, return an empty list.
""";
sem extract_facts.speech = "What the user just said.";

# ─────────────────────── profile derivation ───────────────────────

"""Collapse raw observed facts into a structured personalization profile."""
def derive_profile(facts: str) -> UserProfile by struct_llm(
    temperature=0.2,
    max_tokens=2500
);

sem derive_profile = """
Turn these raw observed facts about one user into a structured personalization
profile. Infer sensibly: someone dyslexic wants SIMPLE reading level and
LARGE_TEXT accessibility; someone who complains about clutter wants SPACIOUS
density. Where a preference was never expressed at all, choose the neutral
default: STANDARD, BALANCED, NEUTRAL_PROFESSIONAL, NONE, dark_mode false. Turn
every topic the user cares about into an interests entry, weighted by how
strongly they expressed it.
""";
sem derive_profile.facts = "Every fact observed about this user so far, one per line.";

"""A profile with no personalization applied. Used when nothing is known or the LLM fails."""
def neutral_profile -> UserProfile {
    return UserProfile(
        reading_level=ReadingLevel.STANDARD,
        density=VisualDensity.BALANCED,
        tone=ToneTarget.NEUTRAL_PROFESSIONAL,
        accessibility=A11yNeed.NONE,
        interests=[],
        dark_mode=False
    );
}

"""Read the stored facts and derive the current profile, falling back to neutral."""
def current_profile -> UserProfile {
    facts = all_facts();
    if len(facts) == 0 {
        return neutral_profile();
    }
    try {
        return derive_profile("\n".join(facts));
    } except Exception as e {
        print(f"[profile] derive_profile failed, using neutral: {e}");
        return neutral_profile();
    }
}

"""Render the derived profile as the plain text the page planner consumes."""
def profile_as_text -> str {
    p = current_profile();
    lines = [
        f"reading level: {str(p.reading_level).split('.')[-1]}",
        f"visual density: {str(p.density).split('.')[-1]}",
        f"tone: {str(p.tone).split('.')[-1]}",
        f"accessibility: {str(p.accessibility).split('.')[-1]}",
        f"dark mode: {p.dark_mode}"
    ];
    if len(p.interests) > 0 {
        topics = ", ".join([f"{i.topic} ({i.weight})" for i in p.interests]);
        lines.append(f"interests: {topics}");
    } else {
        lines.append("interests: none stated");
    }
    return "\n".join(lines);
}

# ───────────────────────────── the tool ─────────────────────────────
# Plain Jac def (no LLM of its own) that the orchestrator calls. Its body
# invokes extract_fact - the documented byLLM agent-to-agent delegation
# pattern: a tool body calling another `by llm()` function.

"""Store everything the user just revealed about themselves."""
def remember_fact(speech: str) -> str {
    try {
        found = extract_facts(speech);
    } except Exception as e {
        print(f"[profile] extract_facts failed: {e}");
        return f"could not extract a fact: {e}";
    }
    results = [];
    for f in found.facts {
        if f.value.strip() == "" {
            continue;
        }
        kind_name = str(f.kind).split(".")[-1];
        results.append(store_fact(kind_name, f.value.strip()));
    }
    if len(results) == 0 {
        return "nothing concrete about the user in that; not stored";
    }
    return "; ".join(results);
}

sem remember_fact = "Store a preference, interest, accessibility need or personal fact the user just revealed about themselves. Call this whenever the user says something about who they are or what they like.";
sem remember_fact.speech = "The part of what the user said that reveals something about them.";

"""Report what is currently known about the user."""
def whats_known -> str {
    return summarize_profile();
}

sem whats_known = "Look up everything currently remembered about this user. Call this when the user asks what you know about them.";
