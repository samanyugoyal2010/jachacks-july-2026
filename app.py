"""Glass Box HTTP shim.

Thin transport layer over the Jac agents. All decisioning logic — the agents,
the provenance graph, and the policy veto — lives in core.jac. This module only
runs the walkers on a single shared root and exposes their output as JSON to the
browser, and serves the static frontend from the same origin (no CORS needed).
"""
from __future__ import annotations

import os
import threading
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from jaclang import JacRuntimeInterface as R

BASE = Path(__file__).parent

# --- load the Jac program once; keep one shared root for the whole process ---
core = R.jac_import("core", base_path=str(BASE))[0]
ROOT = R.root()
_lock = threading.Lock()  # jac execution context is not re-entrant; serialize calls


def run_walker(name: str, attrs: dict | None = None):
    """Create a walker, execute it on the shared root, return the walker."""
    with _lock:
        w = R.spawn_walker(name, attrs or {}, module_name="core")
        R.spawn(w, ROOT)
        return w


app = FastAPI(title="Glass Box")

# Local dev talks to :3000. When this process is hosted (so a deployed frontend
# can reach it), add the site's origin via ALLOWED_ORIGINS, comma-separated.
ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
ORIGINS += [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",  # preview deploys get a new host each time
    allow_methods=["*"],
    allow_headers=["*"],
)


class RunReq(BaseModel):
    case_id: str = "MARIA-001"
    raw_text: str = ""
    facts: dict[str, str] = {}


class LineageReq(BaseModel):
    node_id: str


@app.post("/api/run")
def run_case(req: RunReq):
    w = run_walker(
        "RunCase",
        {"case_id": req.case_id, "raw_text": req.raw_text, "facts": req.facts},
    )
    return w.summary


@app.get("/api/graph")
def graph():
    w = run_walker("GraphState")
    return w.graph


@app.post("/api/lineage")
def lineage(req: LineageReq):
    w = run_walker("Lineage", {"node_id": req.node_id})
    return w.result


@app.post("/api/reset")
def reset():
    w = run_walker("Reset")
    return {"removed": w.removed}


@app.get("/health")
def health():
    return {"ok": True}


# --- serve the frontend from the same origin ---
@app.get("/")
def index():
    return FileResponse(BASE / "web" / "index.html")


app.mount("/vendor", StaticFiles(directory=str(BASE / "web" / "vendor")), name="vendor")


if __name__ == "__main__":
    import uvicorn

    # Hosts (Render, Railway, Fly) inject $PORT and require binding 0.0.0.0.
    # Locally both default back to the original 127.0.0.1:8000.
    uvicorn.run(
        app,
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8000")),
        log_level="warning",
    )
