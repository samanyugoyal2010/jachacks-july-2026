// Content script: read the page, show the trigger, host the overlay.
//
// Three constraints shape everything here, all verified:
//
//   1. This script CANNOT fetch localhost - a content script's requests are
//      governed by the host page's CORS. Everything goes through the service
//      worker via chrome.runtime.sendMessage.
//   2. Injected <style> is subject to the HOST page's style-src CSP and gets
//      silently dropped on strict sites, so all UI lives in a shadow root with
//      adoptedStyleSheets.
//   3. An <iframe src="http://localhost:8000/..."> is blocked by the host
//      page's frame-src. The rebuilt HTML therefore arrives as a STRING and
//      goes into srcdoc, which has no cross-origin navigation for frame-src to
//      evaluate.

import { Readability } from "@mozilla/readability";

// ─────────────────────────── page extraction ───────────────────────────

const CAPS = { text: 12000, sections: 14, body: 420, nav: 12, images: 6 };

function readBrand() {
  const rootStyle = getComputedStyle(document.documentElement);
  const cssVar = (name) => rootStyle.getPropertyValue(name).trim();

  const header = document.querySelector('header, nav, [role="banner"]');
  const cta = document.querySelector(
    'button, a[class*="btn"], a[class*="cta"], [class*="button"]'
  );

  // getComputedStyle returns RESOLVED colours, so this is the brand colour as
  // actually painted - no guessing at the cascade from raw stylesheets.
  const usable = (c) =>
    c && !c.includes("rgba(0, 0, 0, 0)") && c !== "transparent" ? c : "";

  const logoEl =
    document.querySelector('header img[src], [class*="logo"] img[src], a[href="/"] img[src]') ||
    document.querySelector('link[rel*="icon"]');

  return {
    primary:
      cssVar("--primary") ||
      cssVar("--brand") ||
      cssVar("--color-primary") ||
      (header ? usable(getComputedStyle(header).backgroundColor) : "") ||
      usable(getComputedStyle(document.body).color),
    accent: cta ? usable(getComputedStyle(cta).backgroundColor) : "",
    fontBody: getComputedStyle(document.body).fontFamily,
    logo: logoEl ? logoEl.src || logoEl.href || "" : "",
  };
}

const CHROME_SEL = 'nav, header, footer, aside, [role="navigation"], [role="banner"], [role="contentinfo"], [class*="menu"], [class*="nav-"], [id*="menu"]';

// Consent banners, cookie walls and modals are not page content, but they sit
// in the DOM with real headings and prose and would otherwise rank highly.
const OVERLAY_SEL =
  '[role="dialog"], [aria-modal="true"], [class*="consent"], [class*="cookie"], [class*="gdpr"], [class*="modal"], [id*="onetrust"], [id*="consent"], [id*="cookie"]';

function isVisible(el) {
  if (el.closest('[aria-hidden="true"], [hidden]')) return false;
  const box = el.getBoundingClientRect();
  if (box.width === 0 && box.height === 0) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== "hidden" && cs.display !== "none";
}

// Fraction of a block's text that sits inside links. Nav menus run high; real
// prose runs low. This is the same intuition Readability uses to find content.
function linkDensity(el) {
  const total = (el.innerText || "").trim().length;
  if (!total) return 1;
  let linked = 0;
  for (const a of el.querySelectorAll("a")) linked += (a.innerText || "").trim().length;
  return linked / total;
}

function readSections() {
  const out = [];
  for (const h of document.querySelectorAll("h1, h2, h3")) {
    if (out.length >= CAPS.sections) break;

    const heading = (h.innerText || "").trim();
    if (!heading || heading.length > 120) continue;

    // Real sites put most of their headings in mega-menus and footers. Those
    // are chrome, not content, and feeding them to the planner produces a page
    // rebuilt out of navigation labels.
    if (h.closest(CHROME_SEL)) continue;
    if (h.closest(OVERLAY_SEL)) continue;
    if (!isVisible(h)) continue;

    let body = "";
    let node = h.nextElementSibling;
    let hops = 0;
    while (node && hops < 5 && body.length < CAPS.body) {
      if (/^H[1-3]$/.test(node.tagName)) break;
      if (/^(SCRIPT|STYLE|NOSCRIPT|SVG|FORM)$/.test(node.tagName)) {
        node = node.nextElementSibling;
        hops++;
        continue;
      }
      if (isVisible(node) && linkDensity(node) < 0.5) {
        const t = (node.innerText || "").replace(/\s+/g, " ").trim();
        if (t) body += (body ? " " : "") + t;
      }
      node = node.nextElementSibling;
      hops++;
    }

    out.push({ heading, body: body.slice(0, CAPS.body), level: Number(h.tagName[1]) });
  }
  return out;
}

// Lazy-loaded images report naturalWidth 0 until they scroll into view, so
// filtering on it alone finds almost nothing on a real site (Patagonia: 1 of
// dozens). Fall back to the layout box and the width attribute, and read the
// common lazy-src attributes.
const JUNK_HOSTS =
  /cookielaw|onetrust|doubleclick|googletagmanager|google-analytics|facebook\.|gravatar|scorecardresearch|adservice/i;

function readImages() {
  const seen = new Set();
  const out = [];
  for (const img of document.images) {
    if (out.length >= CAPS.images) break;

    const src =
      (img.currentSrc || img.src || "").startsWith("http")
        ? img.currentSrc || img.src
        : img.dataset.src || img.dataset.lazySrc || img.getAttribute("data-original") || "";
    if (!src.startsWith("http")) continue;
    if (/\.svg($|\?)/i.test(src)) continue; // usually icons, not content
    if (JUNK_HOSTS.test(src)) continue; // consent banners, trackers, ad pixels

    const w = img.naturalWidth || img.width || Number(img.getAttribute("width")) || 0;
    const h = img.naturalHeight || img.height || Number(img.getAttribute("height")) || 0;
    const box = img.getBoundingClientRect();
    const wide = w >= 140 || box.width >= 140;
    const tall = h >= 90 || box.height >= 90;
    if (!wide || !tall) continue;

    const key = src.split("?")[0];
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({ url: src, alt: (img.alt || "").slice(0, 120) });
  }
  return out;
}

function extractPage() {
  let article = null;
  try {
    // Readability MUTATES the document it is given, so always clone first.
    article = new Readability(document.cloneNode(true)).parse();
  } catch {
    /* Readability throws on some pages; the manual path below still works. */
  }

  const text = (article?.textContent || document.body?.innerText || "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, CAPS.text);

  return {
    url: location.href,
    title: (article?.title || document.title || "").trim(),
    description:
      document.querySelector('meta[name="description"]')?.content?.slice(0, 300) || "",
    siteName: article?.siteName || location.hostname,
    text,
    sections: readSections(),
    nav: [...document.querySelectorAll("nav a, header a")]
      .slice(0, 40)
      .map((a) => ({ label: (a.innerText || "").trim(), href: a.href }))
      .filter((l) => l.label && l.label.length < 40)
      .slice(0, CAPS.nav),
    images: readImages(),
    brand: readBrand(),
  };
}

// ───────────────────────────── shadow-DOM UI ─────────────────────────────

const HOST_ID = "__voice_agent_host";
let shadow = null;
let statusEl = null;
let overlayEl = null;

const CSS = `
:host { all: initial; }
.fab {
  position: fixed; right: 20px; bottom: 20px; z-index: 2147483646;
  display: flex; align-items: center; gap: 10px;
  padding: 12px 18px; border: 0; border-radius: 999px;
  background: #111418; color: #fff; cursor: pointer;
  font: 600 14px/1 system-ui, -apple-system, "Segoe UI", sans-serif;
  box-shadow: 0 6px 22px rgba(0,0,0,.28); transition: transform .15s ease;
}
.fab:hover { transform: translateY(-1px); }
.fab[data-busy="1"] { opacity: .75; cursor: progress; }
.dot { width: 9px; height: 9px; border-radius: 50%; background: #22c55e; }
.fab[data-busy="1"] .dot { background: #f59e0b; animation: pulse 1s infinite; }
.fab[data-err="1"] .dot { background: #ef4444; }
@keyframes pulse { 50% { opacity: .35 } }

.scrim {
  position: fixed; inset: 0; z-index: 2147483645;
  background: #0b0d10; display: flex; flex-direction: column;
}
.bar {
  display: flex; align-items: center; gap: 14px;
  padding: 10px 14px; background: #14181d; color: #e8ecf2;
  font: 500 13px/1.4 system-ui, -apple-system, sans-serif;
  border-bottom: 1px solid #232a33;
}
.bar .grow { flex: 1; color: #8e99a8; }
.bar button {
  border: 1px solid #2c3540; background: #1c222a; color: #e8ecf2;
  padding: 6px 12px; border-radius: 7px; cursor: pointer; font: inherit;
}
.bar button:hover { background: #232b35; }
iframe { flex: 1; width: 100%; border: 0; background: #fff; }
@media (prefers-reduced-motion: reduce) { .fab { transition: none } }
`;

function mountUI() {
  if (document.getElementById(HOST_ID)) return;
  const host = document.createElement("div");
  host.id = HOST_ID;
  (document.body || document.documentElement).appendChild(host);

  shadow = host.attachShadow({ mode: "open" });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(CSS);
  shadow.adoptedStyleSheets = [sheet];

  const fab = document.createElement("button");
  fab.className = "fab";
  fab.innerHTML = `<span class="dot"></span><span class="label">Rebuild this page</span>`;
  fab.addEventListener("click", () => rebuildThisPage(fab));
  shadow.appendChild(fab);
  statusEl = fab.querySelector(".label");
}

function setStatus(text, { busy = false, error = false } = {}) {
  if (!statusEl) return;
  statusEl.textContent = text;
  const fab = shadow.querySelector(".fab");
  fab.dataset.busy = busy ? "1" : "0";
  fab.dataset.err = error ? "1" : "0";
}

// ───────────────────────────── the overlay ─────────────────────────────

function showOverlay(html) {
  closeOverlay();

  const scrim = document.createElement("div");
  scrim.className = "scrim";

  const bar = document.createElement("div");
  bar.className = "bar";
  bar.innerHTML = `
    <strong>Rebuilt for you</strong>
    <span class="grow">from ${location.hostname}</span>
    <button data-act="original">Show original</button>
    <button data-act="tab">Open in new tab</button>`;

  const frame = document.createElement("iframe");
  // srcdoc, never src: pointing at localhost would be blocked by the host
  // page's frame-src CSP. No allow-scripts - the document is generated from
  // third-party content and never needs to execute anything.
  frame.setAttribute("sandbox", "allow-same-origin allow-popups");
  frame.setAttribute("referrerpolicy", "no-referrer");
  frame.srcdoc = html;

  bar.querySelector('[data-act="original"]').addEventListener("click", closeOverlay);
  bar.querySelector('[data-act="tab"]').addEventListener("click", () => {
    const blob = new Blob([html], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank", "noopener");
  });

  scrim.append(bar, frame);
  shadow.appendChild(scrim);
  overlayEl = scrim;

  const onEsc = (e) => {
    if (e.key === "Escape") closeOverlay();
  };
  document.addEventListener("keydown", onEsc, { once: false });
  scrim._onEsc = onEsc;
}

function closeOverlay() {
  if (!overlayEl) return;
  if (overlayEl._onEsc) document.removeEventListener("keydown", overlayEl._onEsc);
  overlayEl.remove();
  overlayEl = null;
}

// ───────────────────────────── the action ─────────────────────────────

async function send(msg) {
  const res = await chrome.runtime.sendMessage(msg);
  if (!res?.ok) throw new Error(res?.error || "backend unreachable");
  return res;
}

async function rebuildThisPage(fab) {
  if (fab.dataset.busy === "1") return;
  try {
    setStatus("Reading this page…", { busy: true });
    const page = extractPage();

    setStatus("Rebuilding around you…", { busy: true });
    const { reply } = await send({ type: "converse", text: "Rebuild this page for me.", page });

    if (reply?.html) {
      showOverlay(reply.html);
      setStatus("Rebuild this page");
    } else {
      setStatus(reply?.spoken_reply ? "No rebuild produced" : "Nothing came back", {
        error: true,
      });
      setTimeout(() => setStatus("Rebuild this page"), 4000);
    }
  } catch (err) {
    const offline = /Failed to fetch|unreachable|NetworkError/i.test(String(err));
    setStatus(offline ? "Backend offline — run jac start" : `Failed: ${err.message}`, {
      error: true,
    });
    setTimeout(() => setStatus("Rebuild this page"), 5000);
  }
}

// Let the side panel drive the same machinery.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "extract-page") {
    sendResponse({ ok: true, page: extractPage() });
    return;
  }
  if (msg?.type === "show-rebuild") {
    showOverlay(msg.html);
    sendResponse({ ok: true });
    return;
  }
  if (msg?.type === "close-rebuild") {
    closeOverlay();
    sendResponse({ ok: true });
  }
});

mountUI();
