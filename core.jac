"""Glass Box - auditable multi-agent loan decisioning (deterministic core)."""

# ---------- NODE TYPES: the provenance graph ----------
node Application  { has case_id: str; has raw_text: str; has status: str = "received"; }
node Fact         { has key: str; has value: str; has source: str = "application"; has confidence: float = 1.0; }
node Assessment   { has agent: str; has verdict: str; has rationale: str; }
node DraftDecision { has outcome: str; has reasons: list[str] = []; has relied_on: list[str] = []; }
node Verification  { has rule_id: str; has passed: bool; has finding: str; has factor: str = ""; }
node Decision      { has outcome: str; has explanation: str = "";
                     has reasons: list[str] = []; has relied_on: list[str] = []; has vetoed_once: bool = False; }

# ---------- EDGE TYPES: provenance semantics ----------
edge derived_from: Application   --> Fact          {}
edge cites:        Assessment    --> Fact          {}
edge supports:     Application    --> Assessment    {}
edge drafts:       Application    --> DraftDecision {}
edge checks:       DraftDecision --> Verification  {}
edge vetoes:       Verification  --> DraftDecision {}
edge finalizes:    Application    --> Decision      {}

# ---------- HELPERS ----------
"""Return the value of a fact by key, or a default."""
def fact_val(facts: list[Fact], key: str, default: str) -> str {
    for f in facts {
        if f.key == key { return f.value; }
    }
    return default;
}

"""Prohibited-basis proxy detection (deterministic stand-in for the LLM policy check)."""
def is_prohibited(factor: str) -> bool {
    low = factor.lower();
    return "public assistance" in low or "welfare" in low or "race" in low
        or "religion" in low or "marital" in low or "age" in low;
}

# ---------- AGENT 1: INTAKE ----------
walker Intake {
    has case_id: str;
    has raw_text: str;
    has facts: dict = {};
    can start with Root entry {
        made = here ++> Application(case_id=self.case_id, raw_text=self.raw_text);
        app = made[0];
        for k in self.facts.keys() {
            f = Fact(key=k, value=str(self.facts[k]));
            app +>:derived_from:+> f;
        }
        report {"agent": "intake", "case": self.case_id, "facts": len(self.facts)};
    }
}

# ---------- AGENT 2: AFFORDABILITY ANALYST ----------
walker AffordabilityAnalyst {
    can judge with Application entry {
        facts = [here ->:derived_from:->];
        income = float(fact_val(facts, "annual_income", "0"));
        debt = float(fact_val(facts, "monthly_debt", "0"));
        dti = 0.0;
        if income > 0.0 { dti = (debt * 12.0) / income; }
        ok = dti < 0.36;
        verdict = "affordable" if ok else "unaffordable";
        rationale = "debt-to-income ratio is "
            + str(round(dti * 100.0, 1)) + "%, "
            + ("within the 36% limit" if ok else "above the 36% limit");
        a = Assessment(agent="affordability", verdict=verdict, rationale=rationale);
        here +>:supports:+> a;
        for f in facts {
            if f.key == "annual_income" or f.key == "monthly_debt" {
                a +>:cites:+> f;
            }
        }
        report {"agent": "affordability", "verdict": verdict};
    }
}

# ---------- AGENT 3: RISK ANALYST (introduces the tainted factor) ----------
walker RiskAnalyst {
    can judge with Application entry {
        facts = [here ->:derived_from:->];
        assistance = fact_val(facts, "receives_public_assistance", "false");
        flagged = assistance.lower() == "true";
        verdict = "elevated" if flagged else "standard";
        rationale = ("applicant receives public assistance"
                     if flagged else "no elevated risk signals");
        a = Assessment(agent="risk", verdict=verdict, rationale=rationale);
        here +>:supports:+> a;
        if flagged {
            for f in facts {
                if f.key == "receives_public_assistance" { a +>:cites:+> f; }
            }
        }
        report {"agent": "risk", "verdict": verdict};
    }
}

# ---------- AGENT 4: ADJUDICATOR (draft) ----------
walker Adjudicator {
    can draft with Application entry {
        assessments = [here ->:supports:->];
        relied = [];
        affordable = False;
        for a in assessments {
            if a.agent == "affordability" {
                affordable = a.verdict == "affordable";
                if affordable { relied.append("debt-to-income within limit"); }
                else { relied.append("debt-to-income above limit"); }
            }
            if a.agent == "risk" and a.verdict == "elevated" {
                relied.append("receipt of public assistance");
            }
        }
        risk_flag = False;
        for r in relied { if is_prohibited(r) { risk_flag = True; } }
        outcome = "APPROVE" if (affordable and not risk_flag) else "DENY";
        reasons = [];
        if not affordable { reasons.append("Debt-to-income ratio exceeds our limit."); }
        if risk_flag { reasons.append("Applicant receives public assistance."); }
        if outcome == "APPROVE" { reasons.append("Meets affordability criteria."); }
        d = DraftDecision(outcome=outcome, reasons=reasons, relied_on=relied);
        here +>:drafts:+> d;
        report {"agent": "adjudicator", "stage": "draft", "outcome": outcome, "relied_on": relied};
    }
}

# ---------- AGENT 5: POLICY VERIFIER (veto power) ----------
walker PolicyVerifier {
    can verify with Application entry {
        drafts = [here ->:drafts:->];
        if not drafts { return; }
        draft = drafts[-1];
        vetoed = False;
        for factor in draft.relied_on {
            passed = not is_prohibited(factor);
            finding = ("Draft relies on '" + factor
                       + "', a prohibited basis under ECOA / Regulation B."
                       ) if not passed else ("'" + factor + "' is a permissible factor.");
            v = Verification(rule_id="NO-PROXY", passed=passed, finding=finding, factor=factor);
            draft +>:checks:+> v;
            if not passed {
                v +>:vetoes:+> draft;
                vetoed = True;
            }
        }
        report {"agent": "policy-verifier", "vetoed": vetoed};
    }
}

# ---------- AGENT 4b: ADJUDICATOR (re-decision -> final Decision) ----------
walker Finalizer {
    can finalize with Application entry {
        drafts = [here ->:drafts:->];
        if not drafts { return; }
        draft = drafts[-1];
        vetoes = [draft <-:vetoes:<-];
        vetoed = len(vetoes) > 0;

        clean_relied = [];
        for r in draft.relied_on { if not is_prohibited(r) { clean_relied.append(r); } }

        # re-decide using only permissible factors
        affordable = False;
        for r in clean_relied { if r == "debt-to-income within limit" { affordable = True; } }
        outcome = "APPROVE" if affordable else "DENY";

        reasons = [];
        if outcome == "APPROVE" { reasons.append("Meets affordability criteria; decided on permissible factors only."); }
        else { reasons.append("Debt-to-income ratio exceeds our limit."); }

        dec = Decision(outcome=outcome, reasons=reasons, relied_on=clean_relied, vetoed_once=vetoed);
        here +>:finalizes:+> dec;
        here.status = "decided";
        report {"agent": "adjudicator", "stage": "final", "outcome": outcome,
                "vetoed_once": vetoed, "relied_on": clean_relied};
    }
}

# ---------- ORCHESTRATOR ----------
walker RunCase {
    has case_id: str = "MARIA-001";
    has raw_text: str = "";
    has facts: dict = {};
    can run with Root entry {
        root spawn Intake(case_id=self.case_id, raw_text=self.raw_text, facts=self.facts);
        apps = [-->[?:Application]];
        target = apps[-1];
        target spawn AffordabilityAnalyst();
        target spawn RiskAnalyst();
        target spawn Adjudicator();
        target spawn PolicyVerifier();
        target spawn Finalizer();
        report {"ran": self.case_id};
    }
}

# ---------- LOCAL DRIVER (jac run) ----------
with entry {
    root spawn RunCase(
        case_id="MARIA-001",
        raw_text="Maria Alvarez, annual income $52,000, monthly debt $900. Receives public assistance.",
        facts={"annual_income": "52000", "monthly_debt": "900", "receives_public_assistance": "true"}
    );
}
