"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Landmark, RotateCcw, ShieldCheck } from "lucide-react";

export default function TransferPage() {
  const router = useRouter();
  const [reviewing, setReviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const reset = async () => {
    await fetch("/api/reset", { method: "POST" });
    setReviewing(false);
    setSending(false);
  };

  function send() {
    setSending(true);
    setTimeout(() => router.push("/investigation/demo-case"), 900);
  }

  return (
    <main className="bankShell">
      <aside className="side">
        <Landmark size={34} />
        <h2 style={{ marginTop: 18 }}>Personal Banking</h2>
        <p className="muted">Fictional demo environment. No real money moves.</p>
        <div className="card" style={{ background: "#162d49", borderColor: "#284761", color: "white", marginTop: 20 }}>
          <div className="fine" style={{ color: "#b4c4d8" }}>Available balance</div>
          <div className="amount">$12,240</div>
        </div>
      </aside>
      <section className="workspace">
        <div className="transferPanel card">
          <div className="pill info"><ShieldCheck size={14} /> Transfer review</div>
          <h1 style={{ color: "#172033", fontSize: 38 }}>Send $4,800</h1>
          <div className="reviewRow"><strong>From account</strong><span>Everyday Checking •••• 2841</span></div>
          <div className="reviewRow"><strong>Recipient</strong><span>Secure Holdings LLC <span className="pill">Added 8 minutes ago</span></span></div>
          <div className="reviewRow"><strong>Amount</strong><span>$4,800</span></div>
          <div className="reviewRow"><strong>Purpose</strong><span>Account protection</span></div>
          <div className="reviewRow"><strong>Speed</strong><span>Same day</span></div>
          <div className="reviewRow"><strong>Note</strong><span>Transfer requested by security department</span></div>
          {sending ? (
            <div className="card" style={{ marginTop: 18, background: "#eef5ff" }}>
              <h3>Investigation starting</h3>
              <p className="muted">Reviewing transaction context, recipient relationship, and manipulation indicators before release.</p>
            </div>
          ) : null}
          <div className="actions">
            <button className="btn" onClick={() => setReviewing(true)}>Review transfer</button>
            <button className="btn primary" onClick={send} disabled={!reviewing || sending}>
              Send $4,800 <ArrowRight size={16} />
            </button>
            <button className="btn" onClick={reset}><RotateCcw size={16} /> Reset demo</button>
          </div>
        </div>
      </section>
    </main>
  );
}
