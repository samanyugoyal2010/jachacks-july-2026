"""PageSpec -> HTML. Pure Jac, no LLM.

This is where design quality is guaranteed instead of hoped for. The model
never writes markup; it fills in a plan, and these templates render it against
a real design system: a 1.25 modular type scale, an 8px-multiple spacing
rhythm, and the source site's actual brand colours.

The accessibility and density decisions are made HERE, in code, not by the
model - contrast ratios and font sizes are correctness, not taste.
"""

import from agents.planner { PageSpec, PageBlock, BlockLayout }

# ─────────────────────────────── escaping ───────────────────────────────
# Everything from the source page and everything from the model is untrusted
# text. It is escaped on the way in and only ever lands in a text position.

def esc(raw: str) -> str {
    out = raw.replace("&", "&amp;");
    out = out.replace("<", "&lt;");
    out = out.replace(">", "&gt;");
    out = out.replace('"', "&quot;");
    return out.replace("'", "&#39;");
}

"""Allow only absolute http(s) URLs into href/src. Anything else becomes inert."""
def safe_url(raw: str) -> str {
    u = raw.strip();
    if u.startswith("http://") or u.startswith("https://") {
        return esc(u);
    }
    return "";
}

# ──────────────────────────── design tokens ────────────────────────────

def font_stack_for(font_hint: str) -> str {
    h = font_hint.lower();
    if "serif" in h and "sans" not in h {
        return "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
    }
    if "mono" in h or "code" in h {
        return "'JetBrains Mono', 'SF Mono', Menlo, monospace";
    }
    if "rounded" in h or "nunito" in h or "quicksand" in h {
        return "'Nunito', 'Segoe UI', system-ui, sans-serif";
    }
    return "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
}

"""Pick a usable brand colour, falling back to a tasteful default."""
def brand_or(raw: str, fallback: str) -> str {
    c = raw.strip();
    if c == "" or c == "none" or "rgba(0, 0, 0, 0)" in c or "transparent" in c {
        return fallback;
    }
    if c.startswith("#") or c.startswith("rgb") or c.startswith("hsl") {
        return c;
    }
    return fallback;
}

"""Emit the CSS custom properties and base rules for one reader."""
def design_tokens(primary: str, accent: str, font_hint: str, profile: str) -> str {
    p = profile.lower();

    dense = "dense" in p;
    spacious = "spacious" in p;
    space_unit = 4 if dense else (12 if spacious else 8);

    large_text = "large_text" in p;
    high_contrast = "high_contrast" in p;
    reduced_motion = "reduced_motion" in p;
    dark = "dark mode: true" in p;

    base_size = 20 if large_text else 17;
    prim = brand_or(primary, "#3b5bdb");
    acc = brand_or(accent, prim);
    fonts = font_stack_for(font_hint);

    fg = "#f2f4f8" if dark else ("#0a0c10" if high_contrast else "#1c1f26");
    bg = "#0e1116" if dark else "#ffffff";
    muted = "#a8b2c1" if dark else ("#3d4450" if high_contrast else "#5d6673");
    surface = "#171b22" if dark else "#f7f8fa";
    border = "#2a3039" if dark else "#e4e7ec";

    motion = "*,*::before,*::after{transition:none!important;animation:none!important}" if reduced_motion else "";

    return f"""
:root {{
  --font-body: {fonts};
  --primary: {prim};
  --accent: {acc};
  --fg: {fg};
  --bg: {bg};
  --muted: {muted};
  --surface: {surface};
  --border: {border};
  --u: {space_unit}px;
  --s1: calc(var(--u) * 1);
  --s2: calc(var(--u) * 2);
  --s3: calc(var(--u) * 4);
  --s4: calc(var(--u) * 7);
  --s5: calc(var(--u) * 11);
  --fs: {base_size}px;
  --ratio: 1.25;
  --fs-sm: calc(var(--fs) / var(--ratio));
  --fs-lg: calc(var(--fs) * var(--ratio));
  --fs-xl: calc(var(--fs) * var(--ratio) * var(--ratio));
  --fs-2xl: calc(var(--fs) * var(--ratio) * var(--ratio) * var(--ratio));
  --radius: 10px;
  --maxw: 1080px;
}}
*{{box-sizing:border-box}}
html{{-webkit-text-size-adjust:100%}}
body{{
  margin:0; background:var(--bg); color:var(--fg);
  font-family:var(--font-body); font-size:var(--fs); line-height:1.6;
  -webkit-font-smoothing:antialiased;
}}
.wrap{{max-width:var(--maxw); margin:0 auto; padding:0 var(--s3)}}
h1,h2,h3{{line-height:1.15; letter-spacing:-0.02em; margin:0 0 var(--s2); font-weight:680}}
h1{{font-size:var(--fs-2xl)}}
h2{{font-size:var(--fs-xl)}}
h3{{font-size:var(--fs-lg)}}
p{{margin:0 0 var(--s2); max-width:68ch; color:var(--fg)}}
a{{color:var(--primary)}}
img{{max-width:100%; height:auto; display:block; border-radius:var(--radius)}}

.topbar{{
  display:flex; align-items:center; justify-content:space-between; gap:var(--s3);
  padding:var(--s2) var(--s3); border-bottom:1px solid var(--border);
  position:sticky; top:0; background:var(--bg); z-index:10;
}}
.brandmark{{display:flex; align-items:center; gap:var(--s1); font-weight:700; letter-spacing:-0.01em}}
.brandmark img{{height:26px; width:auto; border-radius:4px}}
.navlinks{{display:flex; gap:var(--s3); flex-wrap:wrap; color:var(--muted); font-size:var(--fs-sm)}}

.block{{padding:var(--s5) 0; border-bottom:1px solid var(--border)}}
.block:last-of-type{{border-bottom:0}}
.hero{{background:
  linear-gradient(180deg, color-mix(in srgb, var(--primary) 9%, var(--bg)), var(--bg));
  text-align:center}}
.hero p{{margin-left:auto; margin-right:auto; font-size:var(--fs-lg); color:var(--muted)}}
.split{{display:grid; grid-template-columns:1.1fr 1fr; gap:var(--s4); align-items:center}}
.grid{{display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:var(--s3)}}
.card{{background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius); padding:var(--s3)}}
.eyebrow{{font-size:var(--fs-sm); text-transform:uppercase; letter-spacing:0.09em;
  color:var(--accent); font-weight:700; margin-bottom:var(--s1)}}
.btn{{display:inline-block; margin-top:var(--s2); padding:var(--s2) var(--s3);
  background:var(--primary); color:#fff; text-decoration:none; font-weight:640;
  border-radius:var(--radius); transition:opacity .15s ease}}
.btn:hover{{opacity:.9}}
.cta{{background:var(--surface); text-align:center; border-radius:var(--radius);
  padding:var(--s4) var(--s3); margin:var(--s4) 0; border:1px solid var(--border)}}
.quote{{font-size:var(--fs-xl); line-height:1.3; font-weight:600;
  border-left:4px solid var(--accent); padding-left:var(--s3); max-width:26ch}}
.note{{font-size:var(--fs-sm); color:var(--muted); border-left:3px solid var(--accent);
  padding:var(--s1) 0 var(--s1) var(--s2); margin-top:var(--s2); background:var(--surface);
  border-radius:0 var(--radius) var(--radius) 0}}
.foot{{padding:var(--s4) 0 var(--s5); color:var(--muted); font-size:var(--fs-sm);
  border-top:1px solid var(--border); margin-top:var(--s4)}}
.foot a{{color:var(--muted)}}

@media (max-width:720px){{
  .split{{grid-template-columns:1fr}}
  .navlinks{{display:none}}
}}
@media (prefers-reduced-motion: reduce){{
  *,*::before,*::after{{transition:none!important; animation:none!important}}
}}
{motion}
""";
}

# ──────────────────────────── block templates ────────────────────────────

def render_note(b: PageBlock) -> str {
    if b.personalized_note.strip() == "" {
        return "";
    }
    return f'<p class="note">{esc(b.personalized_note)}</p>';
}

def render_cta(b: PageBlock) -> str {
    label = b.cta_label.strip();
    if label == "" {
        return "";
    }
    href = safe_url(b.cta_href);
    if href == "" {
        return f'<span class="btn" role="button">{esc(label)}</span>';
    }
    return f'<a class="btn" href="{href}" rel="noopener noreferrer nofollow" target="_blank">{esc(label)}</a>';
}

"""Normalize a label for comparison: lowercase, alphanumerics only."""
def key_of(raw: str) -> str {
    out = "";
    for ch in raw.lower() {
        if ch.isalnum() {
            out += ch;
        }
    }
    return out;
}

def render_eyebrow(b: PageBlock) -> str {
    eb = b.eyebrow.strip();
    if eb == "" {
        return "";
    }
    # Models love restating the heading as a kicker ("TRAIL RUNNING" above
    # "Trail Running"). Drop it rather than trusting the prompt to hold.
    ek = key_of(eb);
    hk = key_of(b.heading);
    if ek == hk or (len(ek) > 3 and (ek in hk or hk in ek)) {
        return "";
    }
    return f'<div class="eyebrow">{esc(eb)}</div>';
}

def render_block(b: PageBlock) -> str {
    eyebrow = render_eyebrow(b);
    heading = esc(b.heading);
    body = esc(b.body);
    note = render_note(b);
    cta = render_cta(b);
    img = safe_url(b.image_url);

    if b.layout == BlockLayout.HERO_CENTERED {
        return f'''<section class="block hero"><div class="wrap">
{eyebrow}<h1>{heading}</h1><p>{body}</p>{cta}{note}
</div></section>''';
    }

    if b.layout == BlockLayout.HERO_SPLIT_IMAGE and img != "" {
        return f'''<section class="block"><div class="wrap split">
<div>{eyebrow}<h2>{heading}</h2><p>{body}</p>{cta}{note}</div>
<div><img src="{img}" alt="" loading="lazy" referrerpolicy="no-referrer"
 onerror="this.style.display='none'"></div>
</div></section>''';
    }

    if b.layout == BlockLayout.CTA_BANNER {
        return f'''<section class="block"><div class="wrap"><div class="cta">
{eyebrow}<h2>{heading}</h2><p>{body}</p>{cta}
</div>{note}</div></section>''';
    }

    if b.layout == BlockLayout.QUOTE_HIGHLIGHT {
        return f'''<section class="block"><div class="wrap">
{eyebrow}<blockquote class="quote">{heading}</blockquote><p>{body}</p>{note}
</div></section>''';
    }

    # FEATURE_GRID / FEATURE_LIST / TEXT_ONLY, plus HERO_SPLIT_IMAGE with no
    # usable image, all render as a titled prose section. Sentence-splitting a
    # grid out of one block invents structure the model did not ask for.
    media = "";
    if img != "" {
        media = f'''<div style="margin-top:var(--s3)"><img src="{img}" alt="" loading="lazy"
 referrerpolicy="no-referrer" onerror="this.style.display='none'"></div>''';
    }
    return f'''<section class="block"><div class="wrap">
{eyebrow}<h2>{heading}</h2><p>{body}</p>{cta}{note}{media}
</div></section>''';
}

def render_topbar(spec: PageSpec, logo: str) -> str {
    mark = esc(spec.page_title);
    logo_url = safe_url(logo);
    logo_html = "";
    if logo_url != "" {
        logo_html = f'<img src="{logo_url}" alt="" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">';
    }
    links = "";
    for label in spec.nav_labels[:5] {
        clean = label.strip();
        if clean != "" {
            links += f"<span>{esc(clean)}</span>";
        }
    }
    return f'''<header class="topbar">
<div class="brandmark">{logo_html}<span>{mark}</span></div>
<nav class="navlinks">{links}</nav>
</header>''';
}

# ───────────────────────────── the document ─────────────────────────────

"""Render a complete standalone HTML document from a plan."""
def render_page(
    spec: PageSpec,
    source_url: str,
    primary: str,
    accent: str,
    font_hint: str,
    logo: str,
    profile: str
) -> str {
    css = design_tokens(primary, accent, font_hint, profile);
    body = "";
    idx = 0;
    for b in spec.blocks {
        # Guarantee visual hierarchy: whatever the model chose, the first block
        # opens the page as a hero. A page of uniform TEXT_ONLY reads flat, and
        # that is a layout decision we can make correctly without asking.
        if idx == 0 and b.layout != BlockLayout.HERO_CENTERED
                    and b.layout != BlockLayout.HERO_SPLIT_IMAGE {
            b.layout = BlockLayout.HERO_SPLIT_IMAGE if safe_url(b.image_url) != ""
                       else BlockLayout.HERO_CENTERED;
        }
        body += render_block(b);
        idx += 1;
    }
    topbar = render_topbar(spec, logo);
    origin = safe_url(source_url);
    origin_link = f'<a href="{origin}" rel="noopener noreferrer nofollow">the original page</a>' if origin != "" else "the original page";
    tagline = "";
    if spec.tagline.strip() != "" {
        tagline = f'<p class="wrap" style="color:var(--muted);margin-top:var(--s2)">{esc(spec.tagline)}</p>';
    }

    return f'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>{esc(spec.page_title)}</title>
<style>{css}</style>
</head><body>
{topbar}
{tagline}
<main>{body}</main>
<footer class="foot"><div class="wrap">
Rebuilt for you from {origin_link}.
</div></footer>
</body></html>''';
}
