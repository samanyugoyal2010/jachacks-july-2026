#!/usr/bin/env bash
# Glass Box launcher — starts the Jac/FastAPI backend and the Next.js frontend.
#   ./run.sh          -> deterministic backend (bulletproof, offline, best for judging)
#   ./run.sh groq     -> full pipeline reasons on Groq (gpt-oss-120b)
# Frontend: http://localhost:3000   Backend API: http://127.0.0.1:8000
set -e
cd "$(dirname "$0")"

if [ "$1" = "groq" ]; then
  export GLASSBOX_LLM=groq
  export GROQ_API_KEY="${GROQ_API_KEY:-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}"
  echo "▶ backend on Groq (gpt-oss-120b)"
else
  echo "▶ backend deterministic"
fi

rm -rf .jac
.venv/bin/python app.py &
BACK=$!
trap "kill $BACK 2>/dev/null" EXIT
( cd web-next && npm run dev )
