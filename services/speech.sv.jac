"""Speech in and out, both through Groq.

byLLM has Image and Video types but NO Audio type, so neither of these can go
through `by llm()`. They call Groq's OpenAI-compatible audio endpoints directly
with the `groq` Python package, which works because Jac's server codespace is
Python bytecode and the whole of PyPI is available unmodified.

Audio crosses the wire as base64 inside the normal walker JSON body. Multipart
would be marginally leaner, but a five second Opus clip is tens of kilobytes,
so the 33% base64 overhead is irrelevant next to keeping one uniform transport.
"""

import base64;
import os;
import io;

# whisper-large-v3-turbo: 12% WER, $0.04/hr, ~216x realtime. The full v3 model
# is a little more accurate and nearly 3x the price; for short spoken commands
# turbo is the right trade.
glob STT_MODEL: str = "whisper-large-v3-turbo";

# Groq's PlayAI voices were deprecated in Dec 2025 and replaced by Orpheus from
# Canopy Labs. `playai-tts` no longer exists.
glob TTS_MODEL: str = "canopylabs/orpheus-v1-english";
glob TTS_VOICE: str = "troy";

def groq_client -> any {
    import from groq { Groq }
    key = os.environ.get("GROQ_API_KEY", "");
    if key == "" {
        raise ValueError("GROQ_API_KEY is not set");
    }
    return Groq(api_key=key);
}

# ─────────────────────────── speech to text ───────────────────────────

"""Identify the audio container from its magic bytes."""
def sniff_container(raw: bytes) -> str {
    if raw[:4] == b"RIFF" {
        return "wav";
    }
    if raw[:4] == b"\x1aE\xdf\xa3" {
        return "webm";   # Matroska/WebM EBML header
    }
    if raw[:4] == b"OggS" {
        return "ogg";
    }
    if raw[:3] == b"ID3" or raw[:2] == b"\xff\xfb" {
        return "mp3";
    }
    return "webm";
}

"""Transcribe base64 audio from the browser. Returns '' when there is nothing to hear."""
def transcribe(audio_b64: str) -> str {
    if audio_b64.strip() == "" {
        return "";
    }
    try {
        raw = base64.b64decode(audio_b64);
    } except Exception as e {
        print(f"[stt] bad base64: {e}");
        return "";
    }
    # A fraction of a second of Opus is silence or a misfire, not speech.
    if len(raw) < 1200 {
        return "";
    }

    buf = io.BytesIO(raw);
    # Groq infers the container from the filename extension, so it has to match
    # the actual bytes. MediaRecorder gives webm/opus; sniff anyway so wav and
    # ogg (test harnesses, other capture paths) also work.
    buf.name = f"utterance.{sniff_container(raw)}";

    try {
        client = groq_client();
        result = client.audio.transcriptions.create(
            file=buf,
            model=STT_MODEL,
            response_format="text",
            language="en",
            temperature=0.0
        );
    } except Exception as e {
        print(f"[stt] transcription failed: {e}");
        return "";
    }

    text = str(result).strip();
    # Whisper hallucinates stock phrases on silence; drop the common ones.
    lowered = text.lower().strip(" .!");
    if lowered in ["you", "thank you", "thanks for watching", "bye", "thank you.", ""] {
        return "";
    }
    return text;
}

# ─────────────────────────── text to speech ───────────────────────────

"""Synthesize a spoken reply. Returns base64 wav, or '' if TTS is unavailable."""
def synthesize(text: str) -> str {
    clean = text.strip();
    if clean == "" {
        return "";
    }
    # Orpheus is billed per character and the reply is meant to be short.
    if len(clean) > 1200 {
        clean = clean[:1200];
    }
    try {
        client = groq_client();
        resp = client.audio.speech.create(
            model=TTS_MODEL,
            voice=TTS_VOICE,
            input=clean,
            response_format="wav"
        );
        audio = resp.read();
    } except Exception as e {
        # Not fatal. The extension falls back to the browser's own speech
        # synthesis, so a TTS outage costs voice quality, not the feature.
        print(f"[tts] synthesis failed, client will fall back: {e}");
        return "";
    }
    return base64.b64encode(audio).decode("ascii");
}
