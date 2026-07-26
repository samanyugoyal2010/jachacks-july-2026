// Offscreen document: the only reliable place to run getUserMedia in MV3.
//
// A service worker has no DOM. A content script inherits the HOST page's
// Permissions-Policy, so mic access there fails unpredictably per site and any
// prompt is attributed to the page rather than to us. A popup is torn down the
// moment it loses focus, killing an in-flight recording.
//
// This document is hidden, durable, and the user cannot close it. Its one
// limitation: it CANNOT show a permission prompt, so the grant must already
// exist for the extension's origin (see permission/permission.js).

let recorder = null;
let chunks = [];
let stream = null;

function pickMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

async function permissionState() {
  try {
    const status = await navigator.permissions.query({ name: "microphone" });
    return status.state; // granted | denied | prompt
  } catch {
    return "prompt";
  }
}

async function startRecording() {
  if (recorder && recorder.state === "recording") return;
  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  chunks = [];
  const mimeType = pickMimeType();
  recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();
}

function stopRecording() {
  return new Promise((resolve) => {
    if (!recorder || recorder.state === "inactive") {
      resolve("");
      return;
    }
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      chunks = [];
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;

      // Base64 rather than multipart: a five second Opus clip is tens of KB, so
      // the 33% overhead is irrelevant, and it keeps every backend call on the
      // one uniform walker-JSON convention.
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      const CHUNK = 0x8000; // avoid blowing the argument limit on big buffers
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
      }
      resolve(btoa(binary));
    };
    recorder.stop();
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.target !== "offscreen") return;

  (async () => {
    switch (msg.type) {
      case "mic-permission-state":
        return { state: await permissionState() };
      case "start-recording":
        await startRecording();
        return { ok: true };
      case "stop-recording":
        return { ok: true, audio_b64: await stopRecording() };
      default:
        return { ok: false, error: `unknown offscreen message: ${msg.type}` };
    }
  })()
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: String(err?.message ?? err) }));

  return true; // keep the channel open for the async response
});
