"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Circle, ShieldCheck } from "lucide-react";
import { GraphView } from "@/components/GraphView";
import type { CustomerAnswers, InvestigationResult } from "@/lib/scamgraph/types";

const questionList: { key: keyof Pick<CustomerAnswers, "contactedFirst" | "accountUnsafe" | "safeAccount">; text: string }[] = [
  { key: "contactedFirst", text: "Did someone contact you and ask you to make this transfer?" },
  { key: "accountUnsafe", text: "Did they say that your current bank account was unsafe?" },
  { key: "safeAccount", text: "Did they ask you to move money into a safe or protected account?" },
];

const steps = ["Reviewing transaction context", "Checking recipient relationship", "Evaluating manipulation indicators", "Searching for innocent explanations", "Applying payment safety policy"];

export function InvestigationClient({ initial }: { initial: InvestigationResult }) {
  const [answers, setAnswers] = useState<Partial<CustomerAnswers>>({});
  const [result, setResult] = useState(initial);
  const [step, setStep] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const complete = questionList.every((q) => answers[q.key] === true || answers[q.key] === false);

  useEffect(() => {
    if (skipped) {
      setStep(steps.length - 1);
      return;
    }
    const timer = setInterval(() => setStep((value) => Math.min(value + 1, steps.length - 1)), 900);
    return () => clearInterval(timer);
  }, [skipped]);

  useEffect(() => {
    if (!complete) return;
    fetch("/api/investigation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: { ...answers, claimedBank: true, secrecy: true, urgency: true } }),
    })
      .then((res) => res.json())
      .then(setResult);
  }, [complete, answers]);

  const visibleNodes = useMemo(() => {
    if (skipped || complete) return result.graph.nodes;
    return result.graph.nodes.slice(0, Math.min(result.graph.nodes.length, 5 + step * 3));
  }, [result, step, skipped, complete]);
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = result.graph.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));

  return (
    <main className="investigationLayout">
      <section className="graphPane" aria-label="Investigation graph">
        <GraphView nodes={visibleNodes} edges={visibleEdges} />
      </section>
      <aside className="agentPanel">
        <div className="pill info"><ShieldCheck size={14} /> Live Jac agent investigation</div>
        <h2 style={{ marginTop: 14 }}>Agent Activity</h2>
        <p className="fine">{result.demoLogicLabel}</p>
        <div className="card" style={{ margin: "16px 0" }}>
          {steps.map((label, index) => (
            <div className="agentRow" key={label}>
              {index <= step ? <CheckCircle2 size={18} color="#14865f" /> : <Circle size={18} color="#94a3b8" />}
              <span>{label}</span>
            </div>
          ))}
          <button className="btn" style={{ marginTop: 12 }} onClick={() => setSkipped(true)}>Skip animation</button>
        </div>

        {!complete ? (
          <motion.div className="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <h3>Customer Safety Questions</h3>
            <div className="questionGrid">
              {questionList.map((q) => (
                <div key={q.key}>
                  <p><strong>{q.text}</strong></p>
                  <button className={`answerCard ${answers[q.key] === true ? "selected" : ""}`} onClick={() => setAnswers((a) => ({ ...a, [q.key]: true }))}>Yes</button>
                  <button className={`answerCard ${answers[q.key] === false ? "selected" : ""}`} onClick={() => setAnswers((a) => ({ ...a, [q.key]: false }))}>No</button>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div className="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="pill critical"><AlertTriangle size={14} /> {result.riskLevel} risk • {result.riskScore}/100</div>
            <h3 style={{ marginTop: 12 }}>{result.intervention.status}</h3>
            <p>{result.skepticConclusion}</p>
            <div className="actions">
              <a className="btn primary" href="/intervention/demo-case">Open intervention</a>
              <a className="btn" href="/audit/demo-case">Audit trail</a>
            </div>
          </motion.div>
        )}
        <div className="card" style={{ marginTop: 16 }}>
          {result.findings.map((finding) => (
            <div className="agentRow" key={finding.agent}>
              <CheckCircle2 size={18} color={finding.status === "Escalated" ? "#bf2f38" : "#2563eb"} />
              <div>
                <strong>{finding.agent}</strong>
                <div className="fine">{finding.status}: {finding.finding}</div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </main>
  );
}
