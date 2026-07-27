"use client";
/** Cross-page state. The backend graph is the source of truth; this just
 *  remembers which application was last run so /appeal can unlock. */
const KEY = "glassbox:last";

export interface LastRun {
  caseId: string;
  label: string;
  denied: boolean;
  planMode: string;
  isMine: boolean;
}

export function saveLast(v: LastRun) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {}
}
export function loadLast(): LastRun | null {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}
export function clearLast() {
  try { localStorage.removeItem(KEY); } catch {}
}

/** The applicant's own submitted facts (so /apply -> /audit survives navigation). */
const MINE = "glassbox:mine";
export function saveMine(facts: Record<string, string>) {
  try { localStorage.setItem(MINE, JSON.stringify(facts)); } catch {}
}
export function loadMine(): Record<string, string> | null {
  try { return JSON.parse(localStorage.getItem(MINE) || "null"); } catch { return null; }
}

/** The graph from the most recent run, so /appeal can read the plan.
 *
 *  The Jac engine keeps the graph server-side and /api/graph re-fetches it, but
 *  a run decided by /api/decide exists only in that one response — nothing to
 *  re-fetch. Stashing it here is what lets the appeal flow work for those. */
const GRAPH = "glassbox:lastgraph";
export function saveLastGraph(caseId: string, graph: unknown) {
  try { sessionStorage.setItem(GRAPH, JSON.stringify({ caseId, graph })); } catch {}
}
export function loadLastGraph(caseId: string): unknown | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(GRAPH) || "null");
    return v && v.caseId === caseId ? v.graph : null;
  } catch {
    return null;
  }
}
