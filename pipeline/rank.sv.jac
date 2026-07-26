"""Turn a raw extracted-page payload into the text the planner reads.

Two jobs, both deterministic:

  1. Rank sections by how well they match what the user cares about, so the
     model chooses among pre-ranked candidates instead of ranking from scratch.
     A small model does that badly; substring matching does it perfectly.
  2. Cap everything, so the prompt fits Groq's window and TPM budget.

No LLM here on purpose. Anything that must be reliable stays in code.
"""

# Hard caps. The payload arrives from a browser, so treat it as hostile.
glob MAX_SECTIONS: int = 10;
glob MAX_BODY: int = 420;
glob MAX_NAV: int = 8;
glob MAX_IMAGES: int = 6;
glob MAX_TEXT: int = 6000;

"""Score a section by how strongly it matches the user's interest topics."""
def score_section(heading: str, body: str, topics: list[str], base: int) -> float {
    hay = (heading + " " + body).lower();
    score = float(base);
    for t in topics {
        needle = t.lower().strip();
        if needle == "" {
            continue;
        }
        if needle in hay {
            score += 10.0;
            continue;
        }
        # Partial credit when individual words of the topic appear.
        words = [w for w in needle.split(" ") if len(w) > 3];
        hits = 0;
        for w in words {
            if w in hay {
                hits += 1;
            }
        }
        if len(words) > 0 and hits > 0 {
            score += 6.0 * (float(hits) / float(len(words)));
        }
    }
    return score;
}

"""Pull the user's interest topics out of the derived-profile text."""
def topics_from_profile(profile_text: str) -> list[str] {
    for line in profile_text.split("\n") {
        if line.lower().startswith("interests:") {
            rest = line.split(":", 1)[1].strip();
            if rest == "" or rest.lower().startswith("none") {
                return [];
            }
            out = [];
            for chunk in rest.split(",") {
                topic = chunk.split("(")[0].strip();
                if topic != "" {
                    out.append(topic);
                }
            }
            return out;
        }
    }
    return [];
}

"""Format an extracted page as ranked, capped plain text for the planner."""
def page_for_planner(page: dict, profile_text: str) -> str {
    topics = topics_from_profile(profile_text);

    title = str(page.get("title", "")).strip();
    url = str(page.get("url", "")).strip();
    lines: list[str] = [f"TITLE: {title}", f"URL: {url}"];

    desc = str(page.get("description", "")).strip();
    if desc != "" {
        lines.append(f"DESCRIPTION: {desc[:300]}");
    }

    brand = page.get("brand", {});
    if isinstance(brand, dict) and len(brand) > 0 {
        lines.append(
            f"BRAND: primary={brand.get('primary', '')} accent={brand.get('accent', '')} font={brand.get('fontBody', '')}"
        );
    }

    nav = page.get("nav", []);
    if isinstance(nav, list) and len(nav) > 0 {
        labels = [];
        for n in nav[:MAX_NAV] {
            label = str(n.get("label", "")).strip();
            if label != "" and len(label) < 40 {
                labels.append(label);
            }
        }
        if len(labels) > 0 {
            lines.append("NAVIGATION: " + " | ".join(labels));
        }
    }

    images = page.get("images", []);
    if isinstance(images, list) and len(images) > 0 {
        lines.append("AVAILABLE IMAGE URLS (reuse these, never invent one):");
        for img in images[:MAX_IMAGES] {
            src = str(img.get("url", "")).strip();
            alt = str(img.get("alt", "")).strip();
            if src.startswith("http") {
                lines.append(f"  - {src}  (alt: {alt[:80]})");
            }
        }
    }

    # Rank sections. DOM order is the tie-breaker, so earlier sections win ties.
    raw_sections = page.get("sections", []);
    scored = [];
    if isinstance(raw_sections, list) {
        idx = 0;
        for s in raw_sections {
            heading = str(s.get("heading", "")).strip();
            body = str(s.get("body", "")).strip();
            if heading == "" and body == "" {
                continue;
            }
            level = int(s.get("level", 2));
            base = max(0, 6 - level) * 2 + max(0, 12 - idx);
            scored.append({
                "heading": heading,
                "body": body[:MAX_BODY],
                "score": score_section(heading, body, topics, base)
            });
            idx += 1;
        }
    }
    scored.sort(key=lambda (s: dict) { -s["score"]; });

    if len(scored) > 0 {
        lines.append("");
        lines.append("SECTIONS, already ordered by relevance to this reader:");
        rank = 1;
        for s in scored[:MAX_SECTIONS] {
            lines.append(f"\n[{rank}] {s['heading']}");
            if s["body"] != "" {
                lines.append(str(s["body"]));
            }
            rank += 1;
        }
    } else {
        body_text = str(page.get("text", "")).strip();
        if body_text != "" {
            lines.append("");
            lines.append("PAGE TEXT:");
            lines.append(body_text[:MAX_TEXT]);
        }
    }

    out = "\n".join(lines);
    if len(out) > MAX_TEXT {
        return out[:MAX_TEXT];
    }
    return out;
}

"""True when the payload has enough real content to be worth planning over."""
def extraction_quality(page: dict) -> float {
    title = str(page.get("title", "")).strip();
    text = str(page.get("text", "")).strip();
    secs = page.get("sections", []);
    n_secs = len(secs) if isinstance(secs, list) else 0;

    score = 0.0;
    if title != "" {
        score += 0.2;
    }
    if len(text) > 400 {
        score += 0.4;
    } elif len(text) > 100 {
        score += 0.15;
    }
    if n_secs >= 3 {
        score += 0.4;
    } elif n_secs >= 1 {
        score += 0.2;
    }
    return score;
}
