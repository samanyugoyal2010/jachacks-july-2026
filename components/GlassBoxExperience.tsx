"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, FileUp, Lightbulb, LockKeyhole, ShieldAlert } from "lucide-react";

const slideTitles = [
  "Title",
  "Black box",
  "Risk",
  "Control layer",
  "Maya",
  "Decision graph",
  "Replay",
  "Impact",
];

export function GlassBoxExperience() {
  const deckRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;
    const onScroll = () => {
      const next = Math.round(deck.scrollLeft / window.innerWidth);
      setActive(Math.max(0, Math.min(slideTitles.length - 1, next)));
    };
    deck.addEventListener("scroll", onScroll, { passive: true });
    return () => deck.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "PageDown") go(active + 1);
      if (event.key === "ArrowLeft" || event.key === "PageUp") go(active - 1);
      if (event.key === "Home") go(0);
      if (event.key === "End") go(slideTitles.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  function go(index: number) {
    const deck = deckRef.current;
    if (!deck) return;
    const next = Math.max(0, Math.min(slideTitles.length - 1, index));
    deck.scrollTo({ left: next * window.innerWidth, behavior: reduceMotion ? "auto" : "smooth" });
    setActive(next);
  }

  return (
    <main className="slideDeckShell">
      <aside className="deckRail" aria-label="Presentation slide navigation">
        <strong>GLASS BOX</strong>
        <div className="railDots">
          {slideTitles.map((title, index) => (
            <button className={active === index ? "railDot active" : "railDot"} key={title} type="button" onClick={() => go(index)} aria-label={`Go to slide ${index + 1}: ${title}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {title}
            </button>
          ))}
        </div>
      </aside>

      <div ref={deckRef} className="horizontalDeck" aria-label="Glass Box horizontal presentation">
        <Slide n="01" eyebrow="AUTOMATED LENDING CONTROL" className="titleSlide">
          <div className="titleCopy">
            <div className="regTag"><LockKeyhole size={14} /> ECOA · Reg B · CFPB 2022-03</div>
            <h1>GLASS BOX</h1>
            <p>A control layer for automated loan decisions: trace every fact, block invalid influence, replay appeals.</p>
          </div>
          <div className="titleVisual">
            <LightMoment label="decision trace opened" />
            <GraphCard variant="clean" />
          </div>
        </Slide>

        <Slide n="02" eyebrow="THE BLACK BOX">
          <BigStatement
            lead="A denial should not arrive as a sentence with no evidence."
            accent="black box"
          />
          <StackedCards items={["Generic denial letter", "No factor-level trace", "No path to correct stale data"]} tone="red" />
        </Slide>

        <Slide n="03" eyebrow="WHY IT MATTERS">
          <div className="threeBeat">
            <ImpactBeat title="Trace" body="Compliance needs a causal record, not a screenshot of the final score." />
            <ImpactBeat title="Appeal" body="Applicants need to know which fact can actually change the outcome." />
            <ImpactBeat title="Timing" body="The best compliance review happens before the denial leaves the system." />
          </div>
          <h2 className="bottomClaim">If the audit happens later, the harm already shipped.</h2>
        </Slide>

        <Slide n="04" eyebrow="CONTROL LAYER">
          <h2 className="slideHeadline">Glass Box sits before release, not after the complaint.</h2>
          <LightMoment label="release gate armed" />
          <Pipeline />
          <div className="verbs">
            <span>trace</span><span>test</span><span>explain</span><span>replay</span>
          </div>
        </Slide>

        <Slide n="05" eyebrow="DEMO CASE">
          <StoryFlow />
          <div className="demoCaption">
            <h2>Maya Thompson applies for an $18,000 loan.</h2>
            <p>The model denies her. Glass Box reconstructs the decision path before the denial reaches Maya.</p>
          </div>
        </Slide>

        <Slide n="06" eyebrow="DECISION GRAPH">
          <h2 className="slideHeadline">Every score has a path. Every path has a source.</h2>
          <DecisionGraph />
        </Slide>

        <Slide n="07" eyebrow="APPEAL REPLAY">
          <ReplayPanel />
          <div className="demoCaption">
            <h2>Maya corrects income from $72,000 to $96,000.</h2>
            <p>Only the affected branch is replayed. Debt-to-income improves and the outcome moves to review.</p>
          </div>
        </Slide>

        <Slide n="08" eyebrow="IMPACT" className="impactSlide">
          <h2 className="finalClaim">A denial the lender can prove, and the applicant can challenge.</h2>
          <div className="impactCards">
            <ImpactBeat title="Applicants" body="See the facts that mattered and the evidence worth submitting." />
            <ImpactBeat title="Compliance" body="Catch prohibited influence before a decision is released." />
            <ImpactBeat title="Lenders" body="Keep automated decisions fast without losing a defensible record." />
          </div>
        </Slide>
      </div>

      <div className="deckControls" aria-label="Presentation controls">
        <button type="button" onClick={() => go(active - 1)} disabled={active === 0}><ArrowLeft size={16} /> Prev</button>
        <span>{String(active + 1).padStart(2, "0")} / 08</span>
        <button type="button" onClick={() => go(active + 1)} disabled={active === slideTitles.length - 1}>Next <ArrowRight size={16} /></button>
      </div>
    </main>
  );
}

function Slide({ n, eyebrow, className = "", children }: { n: string; eyebrow: string; className?: string; children: ReactNode }) {
  const index = Number(n) - 1;
  const starts = [
    { x: -34, y: 0 },
    { x: 34, y: 0 },
    { x: 0, y: 28 },
    { x: 0, y: -28 },
    { x: -24, y: 22 },
    { x: 24, y: -22 },
    { x: 0, y: 30 },
    { x: 0, y: -30 },
  ];
  const start = starts[index] ?? { x: 0, y: 40 };
  return (
    <section className={`deckSlide ${className}`}>
      <div className="slideTexture" />
      <header className="slideHeader">
        <span>{eyebrow}</span>
        <strong>{n}</strong>
      </header>
      <motion.div
        className="slideInner"
        initial={{ opacity: 0, x: start.x, y: start.y }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        viewport={{ amount: 0.72 }}
        transition={{ duration: 0.54, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </section>
  );
}

function LightMoment({ label }: { label: string }) {
  return (
    <div className="lightMoment" aria-label={label}>
      <div className="bulbBeam" />
      <div className="bulbSocket">
        <Lightbulb size={34} />
      </div>
      <span>{label}</span>
    </div>
  );
}

function BigStatement({ lead, accent }: { lead: string; accent: string }) {
  return (
    <div className="bigStatement">
      <h2>{lead}</h2>
      <p>Applicants get a conclusion. Compliance needs evidence. The gap is the <em>{accent}</em>.</p>
    </div>
  );
}

function StackedCards({ items, tone }: { items: string[]; tone: "red" | "green" }) {
  return (
    <div className="stackedCards">
      {items.map((item, index) => (
        <motion.div className={`stackCard ${tone}`} key={item} initial={{ opacity: 0, x: 28 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: index * .12 }}>
          {item}
        </motion.div>
      ))}
    </div>
  );
}

function ImpactBeat({ title, body }: { title: string; body: string }) {
  return (
    <article className="impactBeat">
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function Pipeline() {
  return (
    <div className="pipeline">
      <span>Model output</span>
      <ArrowRight />
      <strong>GLASS BOX</strong>
      <ArrowRight />
      <span>Released decision</span>
    </div>
  );
}

function StoryFlow() {
  const steps = ["Draft denial", "Marital status influence", "Release blocked", "Income record stale"];
  return (
    <div className="storyFlow">
      {steps.map((step, index) => (
        <div className={index === 1 || index === 2 ? "storyNode red" : "storyNode"} key={step}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          {step}
        </div>
      ))}
    </div>
  );
}

function DecisionGraph() {
  return (
    <div className="decisionGraphCard">
      <GraphCard variant="decision" />
      <div className="graphLegend">
        <span className="blueLine">supported path</span>
        <span className="redLine">prohibited influence</span>
      </div>
    </div>
  );
}

function GraphCard({ variant }: { variant: "clean" | "decision" }) {
  return (
    <div className={`graphCard ${variant}`}>
      <svg viewBox="0 0 820 430" aria-hidden="true">
        <path className="gLine neutral" d="M110 220 C210 70, 300 320, 405 170 S575 220, 690 105" />
        <path className="gLine red" d="M500 220 C575 190, 600 95, 690 105" />
        <path className="gLine green" d="M690 105 L690 315" />
        <circle cx="110" cy="220" r="8" />
        <circle cx="300" cy="305" r="8" className="amber" />
        <circle cx="405" cy="170" r="8" />
        <circle cx="500" cy="220" r="8" className="redDot" />
        <circle cx="690" cy="105" r="12" className="orangeDot" />
        <circle cx="690" cy="315" r="8" className="greenDot" />
      </svg>
      <span className="nodeLabel intake">income</span>
      <span className="nodeLabel risk">DTI</span>
      <span className="nodeLabel afford">score</span>
      <span className="nodeLabel deny">draft · deny</span>
      <span className="nodeLabel veto">fairness veto</span>
      <span className="nodeLabel approve">final · review</span>
    </div>
  );
}

function ReplayPanel() {
  return (
    <div className="replayPanel">
      <div className="incomeBox old"><span>outdated income</span><strong>$72,000</strong></div>
      <ArrowRight />
      <div className="uploadBox"><FileUp size={26} /><strong>corrected evidence</strong></div>
      <ArrowRight />
      <div className="incomeBox new"><span>corrected income</span><strong>$96,000</strong></div>
      <div className="replayOutcome">
        <ShieldAlert />
        <span>DTI 43% → 32%</span>
        <CheckCircle2 />
        <strong>Eligible for review</strong>
      </div>
    </div>
  );
}
