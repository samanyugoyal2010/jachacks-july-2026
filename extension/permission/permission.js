// One-time microphone grant.
//
// The offscreen document that actually records CANNOT raise a permission
// prompt. This visible extension page exists solely to trigger Chrome's native
// prompt against the chrome-extension:// origin. Once granted it persists for
// every extension surface, so this page is shown exactly once.

const status = document.getElementById("status");

navigator.mediaDevices
  .getUserMedia({ audio: true })
  .then((stream) => {
    stream.getTracks().forEach((t) => t.stop()); // we only wanted the grant
    status.textContent = "Granted. You can close this tab.";
    setTimeout(() => window.close(), 900);
  })
  .catch((err) => {
    status.innerHTML =
      `<span class="err">Microphone blocked (${err.name}).</span><br>` +
      `Re-enable it at <code>chrome://settings/content/microphone</code>.`;
  });
