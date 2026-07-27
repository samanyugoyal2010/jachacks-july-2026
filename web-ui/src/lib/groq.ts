/**
 * Shared Groq client for the server-side routes (/api/banks, /api/decide).
 *
 * Server-only: it reads the API key and touches the filesystem. Never import
 * this from a client component.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_MODEL = "openai/gpt-oss-120b";

/** GROQ_API_KEY from the environment; locally, fall back to the repo-root .env
 *  so `./run.sh` works without a second copy of the key. On Vercel the file is
 *  absent and the env var is the only source. */
export function loadGroqKey(): string {
  const fromEnv = (process.env.GROQ_API_KEY ?? "").trim();
  if (fromEnv) return fromEnv;
  try {
    const text = readFileSync(join(process.cwd(), "..", ".env"), "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      // the committed .env is written `GROQ_API_KEY = gsk_...` with spaces
      if (t.slice(0, eq).trim() === "GROQ_API_KEY") {
        return t
          .slice(eq + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {
    // no .env (normal on Vercel) — fall through
  }
  return "";
}

export class GroqError extends Error {}

/**
 * One JSON-mode completion. Returns the parsed object, or throws GroqError.
 *
 * `temperature` defaults low: these are analytic judgements, not prose, and we
 * want as little run-to-run drift as the model will give us.
 */
export async function askGroqJson<T = Record<string, unknown>>(
  key: string,
  prompt: string,
  opts: { timeoutMs?: number; temperature?: number; retries?: number } = {},
): Promise<T> {
  const { timeoutMs = 25_000, temperature = 0.2, retries = 2 } = opts;

  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          // Groq sits behind Cloudflare, which rejects a missing/default agent
          // with a 403 (error code 1010). Do not drop this header.
          "User-Agent": "glassbox/1.0",
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      throw new GroqError(
        e instanceof Error && e.name === "TimeoutError"
          ? "the reasoning model timed out"
          : "could not reach the reasoning model",
      );
    }

    if (res.ok) {
      try {
        const payload = await res.json();
        return JSON.parse(payload.choices[0].message.content) as T;
      } catch {
        throw new GroqError("the reasoning model returned unreadable output");
      }
    }

    // The free tier rate-limits, and a demo is exactly when several people click
    // at once. Honour Retry-After and back off rather than failing the run.
    const retriable = res.status === 429 || res.status >= 500;
    if (!retriable || attempt >= retries) {
      throw new GroqError(
        res.status === 429
          ? "the reasoning model is rate-limited right now — try again in a moment"
          : `the reasoning model returned ${res.status}`,
      );
    }
    const hinted = Number(res.headers.get("retry-after"));
    const waitMs =
      Number.isFinite(hinted) && hinted > 0
        ? Math.min(hinted * 1000, 8000)
        : 700 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, waitMs));
  }
}
