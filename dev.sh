#!/usr/bin/env bash
# Dev helper: restart the Jac API server and wait until it actually answers.
#
#   ./dev.sh restart      kill, boot, wait for /health
#   ./dev.sh say "text"   one Converse turn
#   ./dev.sh profile      dump the stored profile
#   ./dev.sh reset        wipe the graph
set -uo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/.local/bin:$PATH"
[ -f .env ] && { set -a; . ./.env; set +a; }

LOG=/tmp/jac-dev.log

restart() {
  pkill -f "jac start" 2>/dev/null
  # pkill alone misses detached children, and a survivor holding :8000 makes
  # the new server silently bind :8001 - so you end up testing stale code.
  lsof -ti:8000 2>/dev/null | xargs -r kill -9 2>/dev/null
  sleep 3
  if lsof -ti:8000 >/dev/null 2>&1; then
    echo "port 8000 still held; aborting"; return 1
  fi
  nohup jac start --no-client -p 8000 >"$LOG" 2>&1 &
  for _ in $(seq 1 60); do
    sleep 2
    if curl -fsS -o /dev/null http://localhost:8000/health 2>/dev/null; then
      echo "server up"
      return 0
    fi
    if grep -q "✖ Error" "$LOG" 2>/dev/null; then
      echo "server failed to boot:"
      grep -A6 "✖ Error" "$LOG" | head -20
      return 1
    fi
  done
  echo "timed out waiting for server"; tail -20 "$LOG"; return 1
}

post() { # endpoint json
  curl -fsS -X POST "http://localhost:8000/walker/$1" \
       -H 'Content-Type: application/json' -d "$2" 2>/dev/null
}

case "${1:-restart}" in
  restart) restart ;;
  reset)   post ResetAll '{}' >/dev/null && echo "graph cleared" ;;
  say)
    body=$(python3 -c 'import json,sys; print(json.dumps({
      "text": sys.argv[1],
      "page": {"title":"Patagonia - Outdoor Clothing","url":"https://patagonia.com"}}))' "$2")
    post Converse "$body" | python3 -c 'import sys,json
raw=sys.stdin.read()
try:
    r=json.loads(raw)["data"]["reports"][0]
    print("  →", r.get("spoken_reply"))
    if r.get("recon_id"): print("    recon_id:", r["recon_id"])
except Exception: print("  RAW:", raw[:400])'
    ;;
  profile)
    post GetProfile '{}' | python3 -c 'import sys,json
d=json.load(sys.stdin)["data"]["reports"][0]
print("facts=", d["fact_count"])
print(d["summary"])'
    ;;
  debug)
    post DebugRemember "$(python3 -c 'import json,sys;print(json.dumps({"speech":sys.argv[1]}))' "$2")" \
    | python3 -c 'import sys,json
r=json.load(sys.stdin)["data"]["reports"][0]
print("tool:", r["tool_returned"]); print("summary:", r["summary_now"])'
    ;;
  log) tail -40 "$LOG" ;;
  *) echo "usage: ./dev.sh {restart|reset|say TEXT|profile|debug TEXT|log}"; exit 1 ;;
esac
