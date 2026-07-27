"use client";
/**
 * Frozen output of the real pipeline for the demo cases.
 *
 * The Jac engine needs a persistent process and a ~350MB dependency tree, so it
 * cannot run on a serverless host. `tools/gen_demo_snapshots.py` runs core.jac
 * for each case in cases.ts and writes public/demo-snapshots.json; this reads it
 * back when the live engine isn't reachable.
 *
 * These are recordings, not re-implementations — every verdict, reasoning
 * string and graph edge came out of core.jac. But they are fixed: an
 * application submitted through /apply has no snapshot and still needs the
 * engine, which is why the fallback is keyed by case id rather than blanket.
 */
import type { JacGraph, JacSummary } from "./live";

export interface Snapshot {
  summary: JacSummary;
  graph: JacGraph;
}

let cache: Record<string, Snapshot> | null = null;
let inflight: Promise<Record<string, Snapshot>> | null = null;

async function all(): Promise<Record<string, Snapshot>> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetch("/demo-snapshots.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: Record<string, Snapshot>) => {
        cache = d;
        return d;
      })
      .catch(() => ({}));
  }
  return inflight;
}

/** The recorded run for a case id, or null if it was never precomputed. */
export async function snapshotFor(caseId: string): Promise<Snapshot | null> {
  return (await all())[caseId] ?? null;
}
