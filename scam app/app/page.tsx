import Link from "next/link";
import { ArrowRight, GitBranch, Scale, SearchCheck, ShieldCheck, XCircle, Phone } from "lucide-react";
import { HeroInvestigationPreview } from "@/components/HeroInvestigationPreview";

export default function Home() {
  const suspicious = ["New recipient", "Unusual amount", "Caller initiated contact", "Safe-account instruction"];
  const innocent = ["Established vendor", "Recurring payment history", "Independently verified recipient", "Customer initiated payment"];
  return (
    <main className="page">
      <section className="hero">
        <div className="wrap heroGrid refinedHero">
          <div>
            <div className="eyebrow">Authorized-payment scam defense</div>
            <h1>Stop the scam before the money moves.</h1>
            <p className="lead">ScamGraph investigates whether a high-risk payment reflects the customer&apos;s independent intent or another person&apos;s manipulation—before the transfer is released.</p>
            <div className="actions">
              <Link className="btn primary" href="/transfer">Run the live demo <ArrowRight size={16} /></Link>
              <Link className="textLink" href="/investigation/demo-case">Open completed investigation</Link>
            </div>
          </div>
          <HeroInvestigationPreview />
        </div>
      </section>

      <section className="section skepticSection">
        <div className="wrap skepticGrid">
          <div>
            <div className="pill info"><Scale size={14} /> Skeptic Agent</div>
            <h2>An AI system that challenges itself.</h2>
            <p className="muted">Most fraud systems search only for suspicious evidence. ScamGraph assigns a Skeptic Agent to actively search for innocent explanations before a payment is stopped.</p>
            <div className="skepticFinding">Primary demo finding: no independent evidence supports a legitimate relationship with the recipient.</div>
          </div>
          <div className="evidenceBoard">
            <div className="evidenceColumn">
              <h3>Suspicious evidence</h3>
              {suspicious.map((item) => <div className="evidenceItem suspicious" key={item}>{item}</div>)}
            </div>
            <div className="evidenceColumn">
              <h3>Possible innocent explanations</h3>
              {innocent.map((item) => <div className="evidenceItem innocent" key={item}>{item}</div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="section storySection">
        <div className="wrap">
          <div className="storyGrid">
            {[
              ["01", "Observe", "Jac walkers traverse the transaction, recipient, communication, and account-history graph."],
              ["02", "Challenge", "Independent agents search for both manipulation signals and legitimate explanations."],
              ["03", "Intervene", "A deterministic safety gate releases, verifies, pauses, or escalates the payment."],
            ].map(([number, title, copy]) => (
              <article className="storyStage" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>

          <div className="featurePanels">
            <article className="featurePanel">
              <div className="featureIcon"><Scale size={24} /></div>
              <h2>Skeptic Agent</h2>
              <p>Challenges the system&apos;s own suspicious pattern by looking for vendor history, recurring obligations, independent verification, and contradictory evidence.</p>
              <div className="miniTrace">
                <span>Search</span><span>Challenge</span><span>No support found</span>
              </div>
            </article>
            <article className="featurePanel">
              <div className="featureIcon"><GitBranch size={24} /></div>
              <h2>Counterfactual Replay</h2>
              <p>Changes only the affected facts, reruns the relevant graph branches, and shows judges why the system does not block every large transfer.</p>
              <div className="miniTrace">
                <span>New recipient</span><span>18-month history</span><span>Risk lowered</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section interventionPreviewBand">
        <div className="wrap">
          <div className="interventionPreview">
            <div>
              <div className="pill critical">PAUSED — POSSIBLE BANK IMPERSONATION</div>
              <h2>We paused this transfer to protect you.</h2>
              <p>This situation closely matches a bank-impersonation scam. Banks do not normally ask customers to move money into a new safe account.</p>
            </div>
            <div className="mockButtons" aria-label="Intervention preview actions">
              <button className="btn danger" type="button"><XCircle size={16} /> Cancel transfer</button>
              <button className="btn" type="button"><Phone size={16} /> Contact fraud support</button>
              <button className="btn" type="button"><SearchCheck size={16} /> Review evidence</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
