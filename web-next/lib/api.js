// Backend calls + cross-page state (the backend graph is the source of truth).
const LAST = "glassbox:last";

export async function runDecision(payload) {
  await fetch("/api/reset", { method: "POST" });
  const summary = await (
    await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  ).json();
  const graph = await getGraph();
  saveLast({ summary, caseId: payload.case_id });
  return { summary, graph };
}

export async function getGraph() {
  return (await fetch("/api/graph")).json();
}

export async function getLineage(node_id) {
  return (
    await fetch("/api/lineage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ node_id }),
    })
  ).json();
}

export function saveLast(v) {
  try { localStorage.setItem(LAST, JSON.stringify(v)); } catch {}
}
export function loadLast() {
  try { return JSON.parse(localStorage.getItem(LAST) || "null"); } catch { return null; }
}
export function clearLast() {
  try { localStorage.removeItem(LAST); } catch {}
  return fetch("/api/reset", { method: "POST" });
}

// The constellation shows only the *reasoning* — raw facts live in the data panel,
// otherwise the graph is unreadable.
const FACT_EDGES = new Set(["derived_from", "restricted_from", "cites", "targets_fact"]);
export function reasoningGraph(graph) {
  if (!graph) return { nodes: [], edges: [] };
  const drop = new Set(graph.nodes.filter((n) => n.type === "Fact").map((n) => n.id));
  return {
    nodes: graph.nodes.filter((n) => !drop.has(n.id)),
    edges: graph.edges.filter(
      (e) => !FACT_EDGES.has(e.rel) && !drop.has(e.src) && !drop.has(e.dst)
    ),
  };
}

export function factsOf(graph) {
  return (graph?.nodes || []).filter((n) => n.type === "Fact").map((n) => n.data);
}
export function planOf(graph) {
  return (graph?.nodes || []).find((n) => n.type === "RemediationPlan")?.data || null;
}
