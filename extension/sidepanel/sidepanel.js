// Side panel: the conversation surface.
//
// It never records (the offscreen document does) and never fetches the backend
// directly (the service worker does). It collects intent, renders the
// transcript, and plays the spoken reply.

const els = {
  status: document.getElementById("status"),
  log: document.getElementById("log"),
  talk: document.getElementById("talk"),
  text: document.getElementById("text"),
  send: document.getElementById("send"),
  audio: document.getElementById("tts"),
  facts: document.getElementById("facts"),
};

let recording = false;
let busy = false;

// ─────────────────────────────── plumbing ───────────────────────────────

const bg = (msg) => chrome.runtime.sendMessage(msg);

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function grabPage() {
  const tab = await activeTab();
  if (!tab?.id) return { page: null, tabId: null };
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "extract-page" });
    return { page: res?.page ?? null, tabId: tab.id };
  } catch {
    // No content script here (chrome:// page, or the tab predates install).
    return { page: null, tabId: tab.id };
  }
}

function setStatus(text, cls = "") {
  els.status.textContent = text;
  els.status.className = `status ${cls}`;
}

function addTurn(role, text) {
  const div = document.createElement("div");
  div.className = `turn ${role}`;
  div.textContent = text;
  els.log.appendChild(div);
  els.log.scrollTop = els.log.scrollHeight;
}

function playReply(b64) {
  if (!b64) return;
  els.audio.src = `data:audio/wav;base64,${b64}`;
  // Playback follows a user gesture, so this is normally allowed. If Chrome
  // still refuses, say so rather than failing silently.
  els.audio.play().catch(() => setStatus("Reply ready — tap to hear it", "warn"));
}

// ────────────────────────────── one turn ──────────────────────────────

async function converse({ text = "", audio_b64 = "" }) {
  if (busy) return;
  busy = true;
  try {
    setStatus("Reading the page…", "busy");
    const { page, tabId } = await grabPage();

    setStatus("Thinking…", "busy");
    const res = await bg({ type: "converse", text, audio_b64, page: page ?? {} });
    if (!res?.ok) throw new Error(res?.error || "backend unreachable");

    const reply = res.reply ?? {};
    if (reply.transcript && !text) addTurn("user", reply.transcript);
    if (reply.spoken_reply) addTurn("agent", reply.spoken_reply);

    if (reply.html && tabId) {
      try {
        await chrome.tabs.sendMessage(tabId, { type: "show-rebuild", html: reply.html });
      } catch {
        const blob = new Blob([reply.html], { type: "text/html" });
        chrome.tabs.create({ url: URL.createObjectURL(blob) });
      }
    }

    playReply(reply.audio_b64);
    renderFacts(reply.profile_summary);
    setStatus("Ready", "ok");
  } catch (err) {
    const offline = /Failed to fetch|unreachable|NetworkError/i.test(String(err));
    setStatus(offline ? "Backend offline — run ./dev.sh restart" : String(err.message), "err");
  } finally {
    busy = false;
  }
}

function renderFacts(summary) {
  if (!summary || summary.startsWith("Nothing known")) {
    els.facts.textContent = "Nothing learned about you yet.";
    return;
  }
  els.facts.innerHTML = "";
  for (const line of summary.split("\n")) {
    const [kind, ...rest] = line.split(":");
    const row = document.createElement("div");
    row.className = "fact";
    row.innerHTML = `<span class="kind">${kind}</span>${rest.join(":")}`;
    els.facts.appendChild(row);
  }
}

// ───────────────────────────── recording ─────────────────────────────

async function toggleRecording() {
  if (busy) return;
  if (!recording) {
    const res = await bg({ type: "start-recording" });
    if (!res?.ok) {
      setStatus(
        res?.error === "needs-mic-permission"
          ? "Allow the mic in the tab that just opened, then try again"
          : `Could not start: ${res?.error}`,
        "warn"
      );
      return;
    }
    recording = true;
    els.talk.classList.add("rec");
    els.talk.textContent = "Stop and send";
    setStatus("Listening…", "busy");
  } else {
    recording = false;
    els.talk.classList.remove("rec");
    els.talk.textContent = "Hold to talk";
    setStatus("Transcribing…", "busy");
    const res = await bg({ type: "stop-recording" });
    if (!res?.audio_b64) {
      setStatus("Heard nothing", "warn");
      return;
    }
    await converse({ audio_b64: res.audio_b64 });
  }
}

// ────────────────────────────── wiring ──────────────────────────────

els.talk.addEventListener("click", toggleRecording);

els.send.addEventListener("click", () => {
  const t = els.text.value.trim();
  if (!t) return;
  els.text.value = "";
  addTurn("user", t);
  converse({ text: t });
});

els.text.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    els.send.click();
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "hotkey-toggle") toggleRecording();
});

(async () => {
  const health = await bg({ type: "health" });
  setStatus(health?.ok ? "Ready" : "Backend offline — run ./dev.sh restart",
            health?.ok ? "ok" : "err");
  const prof = await bg({ type: "get-profile" });
  if (prof?.ok) renderFacts(prof.profile?.summary);
})();
