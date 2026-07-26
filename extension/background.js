// Service worker: the only place allowed to talk to the Jac backend.
//
// A content script's fetch is governed by the HOST PAGE's CORS, so calling
// localhost from there is blocked on every real site. Extension service-worker
// fetches are exempt for origins listed in host_permissions, which is why
// every network call funnels through here.
//
// This worker also owns the offscreen document lifecycle (the only reliable
// place to run getUserMedia) and the push-to-talk command.

const API = "http://localhost:8000";

// ─────────────────────────────── backend ───────────────────────────────

async function callWalker(name, body) {
  const res = await fetch(`${API}/walker/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`${name} returned HTTP ${res.status}`);
  const env = await res.json();
  if (!env.ok) throw new Error(env.error?.message ?? `${name} failed`);
  const reports = env.data?.reports ?? [];
  return reports[0] ?? {};
}

async function backendUp() {
  try {
    const res = await fetch(`${API}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

// ──────────────────────── offscreen document ────────────────────────
// getUserMedia needs a DOM, which a service worker does not have, and a
// content script inherits the host page's mic permission policy so it fails
// unpredictably per site. An offscreen document is the durable answer.

const OFFSCREEN_PATH = "offscreen/offscreen.html";

async function hasOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  return contexts.length > 0;
}

async function ensureOffscreen() {
  if (await hasOffscreen()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ["USER_MEDIA"],
    justification: "Record the user's voice so the agent can respond to it.",
  });
}

// An offscreen document CANNOT show a permission prompt. The grant has to be
// obtained once from a visible extension page; after that it persists for the
// extension's origin across every surface.
async function ensureMicPermission() {
  await ensureOffscreen();
  const state = await chrome.runtime.sendMessage({
    target: "offscreen",
    type: "mic-permission-state",
  });
  if (state?.state === "granted") return true;

  await chrome.tabs.create({ url: chrome.runtime.getURL("permission/permission.html") });
  return false;
}

// ───────────────────────────── message bus ─────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Messages aimed at the offscreen document are handled there, not here.
  if (msg?.target === "offscreen") return;

  (async () => {
    switch (msg?.type) {
      case "health":
        return { ok: await backendUp() };

      case "converse": {
        const reply = await callWalker("Converse", {
          text: msg.text ?? "",
          audio_b64: msg.audio_b64 ?? "",
          page: msg.page ?? {},
        });
        return { ok: true, reply };
      }

      case "get-profile":
        return { ok: true, profile: await callWalker("GetProfile", {}) };

      case "get-site":
        return { ok: true, site: await callWalker("GetSite", { recon_id: msg.recon_id }) };

      case "start-recording": {
        const granted = await ensureMicPermission();
        if (!granted) return { ok: false, error: "needs-mic-permission" };
        await chrome.runtime.sendMessage({ target: "offscreen", type: "start-recording" });
        return { ok: true };
      }

      case "stop-recording": {
        const res = await chrome.runtime.sendMessage({
          target: "offscreen",
          type: "stop-recording",
        });
        return { ok: true, audio_b64: res?.audio_b64 ?? "" };
      }

      case "open-panel":
        if (sender.tab?.windowId != null) {
          await chrome.sidePanel.open({ windowId: sender.tab.windowId });
        }
        return { ok: true };

      default:
        return { ok: false, error: `unknown message: ${msg?.type}` };
    }
  })()
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: String(err?.message ?? err) }));

  // REQUIRED: keeps the channel open for the async sendResponse above.
  return true;
});

// ───────────────────────────── entry points ─────────────────────────────

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "toggle-recording") return;
  if (tab?.windowId != null) await chrome.sidePanel.open({ windowId: tab.windowId });
  chrome.runtime.sendMessage({ type: "hotkey-toggle" }).catch(() => {});
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});
