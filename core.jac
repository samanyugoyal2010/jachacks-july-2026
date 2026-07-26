"""Glass Box - auditable multi-agent loan decisioning.

Runs deterministically by default. With GLASSBOX_LLM=groq (and GROQ_API_KEY set),
the reading + coaching narratives come from Groq; the compliance-critical logic
(the independent review verdict, the leak check) stays deterministic on purpose.

Access control is STRUCTURAL, by edge type:
  - `derived_from`   : facts an analyst may traverse (PERMISSIBLE and, because
                       they are facially neutral, PROXY_RISK). Analysts read these
                       without ever inspecting the sensitivity label.
  - `restricted_from`: PROHIBITED_BASIS facts (protected characteristics). ONLY the
                       NoDiscriminationAgent can traverse this edge. A query that
                       cannot return a fact is a real access control; a prompt is not.
We deliberately COLLECT demographic data (you can't detect a leak on a
characteristic you never recorded) and gate it with the edge type above.
"""
include agents;

glob USE_LLM: bool = os.getenv("GLASSBOX_LLM", "") == "groq";
glob DTI_LIMIT: float = 0.43;                       # affordability ceiling (matches policy.yaml)
glob COLLATERAL_DTI_CEILING: float = 0.55;          # adjudicator may over-rely on collateral up to here
glob ELEVATED_ZIPS: list[str] = ["94112", "94124", "94621"];   # "high default area" — a redlining proxy
glob NO_DISCRIMINATION_RULE: str =
    "NO-DISCRIMINATION (ECOA / Regulation B): a credit decision must not rely on a prohibited basis "
    "(race, color, religion, national origin, sex, marital status, age, receipt of public assistance) "
    "nor on a facially neutral proxy for one (e.g. ZIP code). Debt-to-income and verified income are "
    "permissible factors; the affordability limit is a hard rule collateral cannot override.";

"""One-line summary of permissible facts, for the LLM independent reviewer."""
def fact_summary(facts: list[Fact]) -> str {
    parts: list[str] = [];
    for f in facts { parts.append(f.key + "=" + f.value); }
    return ", ".join(parts);
}

# ---------- NODE TYPES: the provenance graph ----------
node Application  { has case_id: str; has raw_text: str; has status: str = "received";
                    has package_complete: bool = True; has missing_docs: list[str] = []; }
node Fact         { has key: str; has value: str; has category: str = "";
                    has sensitivity: str = "PERMISSIBLE"; has source: str = "application";
                    has verified: bool = True; has confidence: float = 1.0; }
node Assessment   { has agent: str; has verdict: str; has rationale: str; has reasoning: str = ""; }
node DraftDecision { has outcome: str; has reasons: list[str] = []; has relied_on: list[str] = []; }
# the independent review (NoDiscriminationAgent) - NOT a rubber stamp
node Review       { has independent_verdict: str; has draft_outcome: str = "";
                    has agree: bool = True; has vetoed: bool = False; has leak: bool = False;
                    has leak_factor: str = ""; has finding: str = ""; has reasoning: str = ""; }
node Decision      { has outcome: str; has explanation: str = "";
                     has reasons: list[str] = []; has relied_on: list[str] = []; has vetoed_once: bool = False; }
node RemediationPlan { has target_outcome: str = "APPROVE"; has mode: str = "substantive";
                       has summary: str = ""; has feasible: bool = True; has reapply_facts: dict[str, str] = {}; }
node RemediationStep { has factor: str; has current: str; has target: str;
                       has action: str; has impact: str; has status: str = "todo"; }

# ---------- EDGE TYPES: provenance + access control ----------
edge derived_from:    Application    --> Fact           {}   # analyst-visible tier
edge restricted_from: Application    --> Fact           {}   # protected tier (NoDiscrimination only)
edge cites:           Assessment     --> Fact           {}
edge supports:        Application     --> Assessment     {}
edge drafts:          Application     --> DraftDecision  {}
edge reviews:         DraftDecision  --> Review         {}
edge vetoes:          Review         --> DraftDecision  {}
edge finalizes:       Application     --> Decision       {}
edge advises:         Decision        --> RemediationPlan {}
edge step_of:         RemediationPlan --> RemediationStep {}
edge targets_fact:    RemediationStep --> Fact           {}

# ---------- HELPERS ----------
"""Value of a permissible fact by key, or a fallback."""
def fact_val(facts: list[Fact], key: str, fallback: str) -> str {
    for f in facts { if f.key == key { return f.value; } }
    return fallback;
}

"""Parse a messy numeric string like '$52,000' or '900/mo' into a float."""
def clean_num(s: str) -> float {
    out = "";
    for ch in s { if ch in "0123456789." { out += ch; } }
    if out == "" { return 0.0; }
    return float(out);
}

"""Normalize a messy boolean string ('yes', 'True', '1') into a bool."""
def norm_bool(s: str) -> bool {
    low = s.strip().lower();
    return low == "true" or low == "yes" or low == "y" or low == "1";
}

"""Format a $ amount with thousands separators, e.g. 52000 -> '$52,000'."""
def money(x: float) -> str {
    n = int(round(x));
    s = str(n);
    out = "";
    c = 0;
    i = len(s) - 1;
    while i >= 0 {
        out = s[i] + out;
        c += 1;
        if c % 3 == 0 and i > 0 { out = "," + out; }
        i -= 1;
    }
    return "$" + out;
}

"""Percent string, e.g. 0.605 -> '61%'."""
def pct(x: float) -> str { return str(round(x * 100.0)) + "%"; }

"""Round x to the nearest multiple of n; up=True rounds up, else down."""
def round_to(x: float, n: float, up: bool) -> float {
    base = float(int(x / n)) * n;
    if up and x > base { return base + n; }
    return base;
}

"""Sensitivity class of a fact by key. This is what makes leak detection possible."""
def classify(key: str) -> str {
    prohibited = ["marital_status", "receives_public_assistance", "age_bracket", "age",
                  "race", "religion", "sex", "national_origin"];
    proxy = ["zip_code", "zipcode", "postal_code"];
    if key in prohibited { return "PROHIBITED_BASIS"; }
    if key in proxy { return "PROXY_RISK"; }
    return "PERMISSIBLE";
}

"""Document category of a fact by key (for the document-reading view)."""
def categorize(key: str) -> str {
    ident = ["name", "id_type", "id_verified"];
    income = ["annual_income", "employment", "tenure_years", "monthly_debt"];
    proof = ["pay_stub_present", "tax_doc_present", "income_verified"];
    collateral = ["collateral_type", "collateral_value", "collateral_appraised"];
    network = ["references", "cosigner", "banking_relationship_years"];
    demographic = ["zip_code", "marital_status", "receives_public_assistance", "age_bracket"];
    if key in ident { return "identification"; }
    if key in income { return "income"; }
    if key in proof { return "income_proof"; }
    if key in collateral { return "collateral"; }
    if key in network { return "applicant_network"; }
    if key in demographic { return "demographic"; }
    return "other";
}

# ---------- AGENT 1: INTAKE (document + data reading) ----------
walker Intake {
    has case_id: str;
    has raw_text: str;
    has facts: dict[str, str] = {};
    can start with Root entry {
        made = here ++> Application(case_id=self.case_id, raw_text=self.raw_text);
        app: Application = made[0];
        pairs: dict[str, str] = self.facts;
        if USE_LLM and self.raw_text != "" {
            extracted = extract_facts(self.raw_text);
            pairs = {};
            for ef in extracted { pairs[ef.key] = ef.value; }
        }
        for k in pairs.keys() {
            sens = classify(k);
            f = Fact(key=k, value=pairs[k], category=categorize(k), sensitivity=sens,
                     source=("llm-intake" if USE_LLM and self.raw_text != "" else "application"));
            if k == "income_verified" { f.verified = norm_bool(pairs[k]); }
            # STRUCTURAL access control: protected facts go on a separate edge the
            # analysts cannot traverse. Everything else is analyst-visible.
            if sens == "PROHIBITED_BASIS" { app +>:restricted_from:+> f; }
            else { app +>:derived_from:+> f; }
        }
        # application completeness
        missing: list[str] = [];
        if not norm_bool(pairs.get("income_verified", "true")) { missing.append("income verification (pay stubs or tax return)"); }
        # only a real, declared asset can be missing an appraisal ("none" is not collateral)
        if pairs.get("collateral_type", "none") != "none"
           and not norm_bool(pairs.get("collateral_appraised", "true")) {
            missing.append("collateral appraisal");
        }
        app.missing_docs = missing;
        app.package_complete = len(missing) == 0;
        report {"agent": "intake", "case": self.case_id, "facts": len(pairs),
                "protected": len([f for f in [app ->:restricted_from:->]]),
                "complete": app.package_complete};
    }
}

# ---------- AGENTS 2-4: ANALYSTS (structurally blind to protected facts) ----------
# Each analyst traverses `derived_from` ONLY. It physically cannot reach a
# PROHIBITED_BASIS fact, and it never inspects the sensitivity label -- it just
# reads feature values. That is why a PROXY_RISK fact (facially neutral) can slip
# into its reasoning, and why the NoDiscriminationAgent exists.

walker AffordabilityAnalyst {
    can judge with Application entry {
        facts: list[Fact] = [here ->:derived_from:->];
        income = clean_num(fact_val(facts, "annual_income", "0"));
        debt = clean_num(fact_val(facts, "monthly_debt", "0"));
        verified = norm_bool(fact_val(facts, "income_verified", "true"));
        if not verified {
            a = Assessment(agent="affordability", verdict="unverified",
                rationale="income of " + money(income) + " is not corroborated",
                reasoning="Stated income is " + money(income) + " but income_verified=false: no pay "
                    + "stub or tax document on file. I cannot assess affordability on an unverified "
                    + "figure, so I return 'unverified' rather than guess.");
            here +>:supports:+> a;
            report {"agent": "affordability", "verdict": "unverified"};
            disengage;
        }
        dti = 0.0;
        if income > 0.0 { dti = (debt * 12.0) / income; }
        ok = dti < DTI_LIMIT;
        verdict = "affordable" if ok else "unaffordable";
        a = Assessment(agent="affordability", verdict=verdict,
            rationale="debt-to-income is " + pct(dti) + " vs a " + pct(DTI_LIMIT) + " limit",
            reasoning="Computed DTI = monthly_debt x 12 / annual_income = " + money(debt) + " x 12 / "
                + money(income) + " = " + pct(dti) + ". Limit is " + pct(DTI_LIMIT) + ". "
                + (pct(dti) + " < " + pct(DTI_LIMIT) + " -> affordable." if ok
                   else pct(dti) + " >= " + pct(DTI_LIMIT) + " -> unaffordable.")
                + " I looked at income and debt only; no demographic fields were available to me.");
        here +>:supports:+> a;
        for f in facts { if f.key == "annual_income" or f.key == "monthly_debt" { a +>:cites:+> f; } }
        report {"agent": "affordability", "verdict": verdict};
    }
}

walker RiskAnalyst {
    can judge with Application entry {
        facts: list[Fact] = [here ->:derived_from:->];
        zip = fact_val(facts, "zip_code", "");
        elevated = zip != "" and zip in ELEVATED_ZIPS;   # <-- treats ZIP as a "neutral" feature (the trap)
        verdict = "elevated" if elevated else "standard";
        a = Assessment(agent="risk", verdict=verdict,
            rationale=("area risk from ZIP " + zip if elevated else "no elevated risk signals"),
            reasoning=("Applicant ZIP " + zip + " is in my high-default-area list, so I flag elevated "
                       + "risk. (I treat ZIP as a neutral geographic feature.)" if elevated
                       else "No feature I can see raises a risk flag; returning standard."));
        here +>:supports:+> a;
        if elevated {
            for f in facts { if f.key == "zip_code" { a +>:cites:+> f; } }   # cites the proxy
        }
        report {"agent": "risk", "verdict": verdict};
    }
}

walker CollateralAnalyst {
    can judge with Application entry {
        facts: list[Fact] = [here ->:derived_from:->];
        ctype = fact_val(facts, "collateral_type", "none");
        cval = clean_num(fact_val(facts, "collateral_value", "0"));
        appraised = norm_bool(fact_val(facts, "collateral_appraised", "false"));
        strong = ctype != "none" and appraised and cval >= 100000.0;
        verdict = "strong" if strong else ("present" if ctype != "none" else "none");
        a = Assessment(agent="collateral", verdict=verdict,
            rationale=(ctype + " valued " + money(cval) + (", appraised" if appraised else ", not appraised")),
            reasoning=("Collateral is " + ctype + " at " + money(cval) + ", appraised=" + str(appraised)
                + ". " + ("Appraised and >= " + money(100000.0) + " -> strong." if strong
                          else "Does not meet the strong-collateral bar.")));
        here +>:supports:+> a;
        for f in facts { if f.key == "collateral_value" or f.key == "collateral_type" { a +>:cites:+> f; } }
        report {"agent": "collateral", "verdict": verdict};
    }
}

# ---------- AGENT 5: ADJUDICATOR (draft) ----------
walker Adjudicator {
    can draft with Application entry {
        facts: list[Fact] = [here ->:derived_from:->];
        income = clean_num(fact_val(facts, "annual_income", "0"));
        debt = clean_num(fact_val(facts, "monthly_debt", "0"));
        dti = 0.0;
        if income > 0.0 { dti = (debt * 12.0) / income; }

        aff = ""; risk = ""; coll = ""; risk_zip = "";
        for a in [here ->:supports:->] {
            if a.agent == "affordability" { aff = a.verdict; }
            if a.agent == "risk" { risk = a.verdict; for f in [a ->:cites:->] { risk_zip = f.value; } }
            if a.agent == "collateral" { coll = a.verdict; }
        }

        outcome = "DENY";
        relied: list[str] = [];
        reasons: list[str] = [];
        if aff == "unverified" {
            outcome = "DENY"; relied = ["income unverified"];
            reasons = ["Income could not be verified from the documents provided."];
        } elif risk == "elevated" {
            # relies on the ZIP proxy -- this is the discriminatory draft
            outcome = "DENY"; relied = ["area risk (ZIP " + risk_zip + ")"];
            reasons = ["Elevated area risk based on applicant location."];
        } elif aff == "affordable" {
            outcome = "APPROVE"; relied = ["debt-to-income within limit"];
            reasons = ["Meets affordability criteria."];
        } elif coll == "strong" and dti < COLLATERAL_DTI_CEILING {
            # over-relies on collateral despite failing the DTI rule (unsound)
            outcome = "APPROVE"; relied = ["strong collateral"];
            reasons = ["Approved on strength of collateral despite debt-to-income."];
        } else {
            outcome = "DENY"; relied = ["debt-to-income above limit"];
            reasons = ["Debt-to-income ratio exceeds our limit."];
        }
        d = DraftDecision(outcome=outcome, reasons=reasons, relied_on=relied);
        here +>:drafts:+> d;
        report {"agent": "adjudicator", "stage": "draft", "outcome": outcome, "relied_on": relied};
    }
}

# ---------- AGENT 6: NO-DISCRIMINATION (independent review, NOT a rubber stamp) ----------
# Step A: reach an INDEPENDENT verdict from permissible facts + rules, WITHOUT
#         being told the draft outcome.
# Step B: leak detection -- the only agent that reads the protected tier, and the
#         only one that inspects fact sensitivity.
# Step C: compare, then decide whether to veto (either direction) or just record.
walker NoDiscriminationAgent {
    can verify with Application entry {
        draft_list = [here ->:drafts:->];
        if not draft_list { disengage; }
        draft: DraftDecision = draft_list[-1];

        # ----- Step A: independent verdict (permissible facts only, no draft outcome) -----
        perm: list[Fact] = [f for f in [here ->:derived_from:->] if f.sensitivity == "PERMISSIBLE"];
        income = clean_num(fact_val(perm, "annual_income", "0"));
        debt = clean_num(fact_val(perm, "monthly_debt", "0"));
        verified = norm_bool(fact_val(perm, "income_verified", "true"));
        dti = 0.0;
        if income > 0.0 { dti = (debt * 12.0) / income; }
        indep = "DENY";
        indep_reasons: list[str] = [];
        if not verified { indep_reasons.append("income is not verified"); }
        elif dti < DTI_LIMIT { indep = "APPROVE"; indep_reasons.append("debt-to-income " + pct(dti) + " is within the " + pct(DTI_LIMIT) + " limit"); }
        else { indep_reasons.append("debt-to-income " + pct(dti) + " exceeds the " + pct(DTI_LIMIT) + " limit"); }

        # ----- Step B: leak detection (reads protected + proxy; analysts cannot) -----
        leaked: list[Fact] = [];
        for a in [here ->:supports:->] {
            for f in [a ->:cites:->] {
                if f.sensitivity != "PERMISSIBLE" { leaked.append(f); }
            }
        }
        # defense in depth: did any assessment somehow reach a protected fact?
        protected_on_file: list[Fact] = [here ->:restricted_from:->];

        # ----- Step C: compare, then decide -----
        agree = indep == draft.outcome;
        vetoed = False; leak = False; leak_factor = ""; finding = "";
        if leaked {
            leak = True; vetoed = True; lf = leaked[0];
            leak_factor = lf.key;
            kind = "a proxy for a protected class" if lf.sensitivity == "PROXY_RISK" else "a prohibited basis";
            finding = "The draft relied on '" + lf.key + "' (=" + lf.value + "), " + kind
                + " under NO-DISCRIMINATION. Vetoing and re-deciding on permissible factors only.";
        } elif draft.outcome == "APPROVE" and indep == "DENY" {
            vetoed = True;
            finding = "The draft APPROVED, but my independent review is DENY (" + ", ".join(indep_reasons)
                + "). The approval is unsound; vetoing.";
        } elif not agree {
            finding = "My independent review (" + indep + ") disagrees with the draft (" + draft.outcome
                + "). No prohibited dependence found; recording the disagreement.";
        } else {
            finding = "My independent review (" + indep + ") agrees with the draft. Upheld ("
                + ", ".join(indep_reasons) + ").";
        }

        reasoning = "Independent verdict (built from permissible facts alone, before seeing the draft): "
            + indep + " because " + ("; ".join(indep_reasons)) + ". "
            + "Leak scan of cited evidence: " + (str(len(leaked)) + " non-permissible fact(s) relied on"
              if leaked else "clean") + ". "
            + str(len(protected_on_file)) + " protected fact(s) on file were readable only to me. "
            + "Then compared to the draft (" + draft.outcome + ").";
        if USE_LLM {
            reasoning = independent_review(fact_summary(perm), NO_DISCRIMINATION_RULE) + " " + reasoning;
        }

        rv = Review(independent_verdict=indep, draft_outcome=draft.outcome, agree=agree,
                    vetoed=vetoed, leak=leak, leak_factor=leak_factor, finding=finding, reasoning=reasoning);
        draft +>:reviews:+> rv;
        if vetoed { rv +>:vetoes:+> draft; }
        report {"agent": "no-discrimination", "independent": indep, "draft": draft.outcome,
                "agree": agree, "vetoed": vetoed, "leak": leak};
    }
}

# ---------- AGENT 5b: ADJUDICATOR re-decision -> final Decision ----------
walker Finalizer {
    can finalize with Application entry {
        draft_list = [here ->:drafts:->];
        if not draft_list { disengage; }
        draft: DraftDecision = draft_list[-1];
        review_list = [draft ->:reviews:->];
        rv: Review = review_list[-1];

        # a veto (either direction) is resolved by adopting the independent verdict:
        # stripping a leaked factor and re-deciding on permissible facts yields exactly
        # the independent verdict, and an unsound approval is overturned to it too.
        outcome = rv.independent_verdict if rv.vetoed else draft.outcome;

        relied: list[str] = [];
        reasons: list[str] = [];
        if outcome == "APPROVE" {
            relied = ["debt-to-income within limit"];
            reasons = ["Meets affordability criteria on permissible factors only."];
        } else {
            relied = draft.relied_on;
            reasons = draft.reasons;
            if rv.vetoed and rv.leak {
                reasons = ["Debt-to-income exceeds our limit."];
                relied = ["debt-to-income above limit"];
            }
        }
        explanation = "";
        if USE_LLM { explanation = plain_language_explanation(outcome, relied); }
        dec = Decision(outcome=outcome, explanation=explanation, reasons=reasons,
                       relied_on=relied, vetoed_once=rv.vetoed);
        here +>:finalizes:+> dec;
        here.status = "decided";
        report {"agent": "adjudicator", "stage": "final", "outcome": outcome, "vetoed_once": rv.vetoed};
    }
}

# ---------- AGENT 7: ADVISOR (recourse: fixable vs substantive) ----------
walker Advisor {
    can advise with Application entry {
        decs = [here ->:finalizes:->];
        if not decs { disengage; }
        dec: Decision = decs[-1];
        if dec.outcome != "DENY" { disengage; }

        facts: list[Fact] = [here ->:derived_from:->];      # permissible tier ONLY (never protected)
        income = clean_num(fact_val(facts, "annual_income", "0"));
        debt = clean_num(fact_val(facts, "monthly_debt", "0"));
        verified = norm_bool(fact_val(facts, "income_verified", "true"));
        dti = 0.0;
        if income > 0.0 { dti = (debt * 12.0) / income; }

        plan = RemediationPlan(target_outcome="APPROVE", feasible=True);
        dec +>:advises:+> plan;

        if not here.package_complete or not verified {
            # ----- FIXABLE: a submission problem -----
            plan.mode = "fixable";
            reapply: dict[str, str] = {};
            for f in facts { reapply[f.key] = f.value; }
            for doc in here.missing_docs {
                s = RemediationStep(factor="documents", current="missing", target="provided",
                    action="Submit " + doc + ".", impact="lets us verify your application", status="todo");
                plan +>:step_of:+> s;
                for f in facts { if f.key == "annual_income" { s +>:targets_fact:+> f; } }
            }
            reapply["income_verified"] = "true";
            reapply["pay_stub_present"] = "true";
            reapply["collateral_appraised"] = "true";
            plan.reapply_facts = reapply;
            plan.summary = "Your application is missing required documents, so we could not fully assess "
                + "it. This is fixable: provide the item(s) below and your decision may change on reapplication.";
        } else {
            # ----- SUBSTANTIVE: complete, but did not qualify -----
            plan.mode = "substantive";
            target_dti = DTI_LIMIT - 0.02;
            rec_debt = round_to(income * target_dti / 12.0, 50.0, False);
            rec_income = round_to(debt * 12.0 / target_dti, 1000.0, True);
            s1 = RemediationStep(factor="monthly_debt", current=money(debt), target=money(rec_debt),
                action="Pay down " + money(debt - rec_debt) + " of monthly obligations (e.g. a card or loan).",
                impact="Debt-to-income " + pct(dti) + " -> " + pct((rec_debt * 12.0) / income));
            plan +>:step_of:+> s1;
            s2 = RemediationStep(factor="annual_income", current=money(income), target=money(rec_income),
                action="Increase documented annual income to " + money(rec_income) + ".",
                impact="Debt-to-income " + pct(dti) + " -> " + pct((debt * 12.0) / rec_income));
            plan +>:step_of:+> s2;
            for f in facts {
                if f.key == "monthly_debt" { s1 +>:targets_fact:+> f; }
                if f.key == "annual_income" { s2 +>:targets_fact:+> f; }
            }
            plan.reapply_facts = {"annual_income": str(int(income)), "monthly_debt": str(int(rec_debt)),
                                  "income_verified": "true"};
            plan.summary = "You were declined because your debt-to-income ratio is " + pct(dti)
                + "; our limit is " + pct(DTI_LIMIT) + ". Either step below brings you within the limit "
                + "so you can qualify on reapplication.";
        }

        if USE_LLM {
            steps_txt: list[str] = [];
            for st in [plan ->:step_of:->] { steps_txt.append(st.action); }
            plan.summary = draft_action_plan(dec.outcome, plan.summary, steps_txt);
        }

        # HARD GUARANTEE: recourse must never cite a prohibited-basis fact.
        blob = plan.summary;
        for st in [plan ->:step_of:->] { blob = blob + " " + st.action + " " + st.impact; }
        low = blob.lower();
        for term in ["marital", "public assistance", "welfare", "age bracket", " age ", "race", "religion", "national origin"] {
            assert term not in low , "recourse output must never cite a prohibited basis";
        }
        report {"agent": "advisor", "mode": plan.mode, "steps": len([st for st in [plan ->:step_of:->]])};
    }
}

# ---------- ORCHESTRATOR ----------
walker RunCase {
    has case_id: str = "MARIA-001";
    has raw_text: str = "";
    has facts: dict[str, str] = {};
    has summary: dict = {};
    can run with Root entry {
        root spawn Intake(case_id=self.case_id, raw_text=self.raw_text, facts=self.facts);
        apps: list[Application] = [-->[?:Application]];
        target: Application = apps[-1];
        target spawn AffordabilityAnalyst();
        target spawn RiskAnalyst();
        target spawn CollateralAnalyst();
        target spawn Adjudicator();
        target spawn NoDiscriminationAgent();
        target spawn Finalizer();
        target spawn Advisor();

        # ----- build the summary + the ordered agent thought-stream trace -----
        draft_out = ""; relied: list[str] = [];
        for d in [target ->:drafts:->] { draft_out = d.outcome; relied = d.relied_on; }
        final_out = ""; flipped = False; has_plan = False; plan_mode = "";
        for dec in [target ->:finalizes:->] {
            final_out = dec.outcome;
            flipped = dec.vetoed_once and dec.outcome != draft_out;
            for p in [dec ->:advises:->] { has_plan = True; plan_mode = p.mode; }
        }
        indep = ""; vetoed = False; agree = True;
        for d in [target ->:drafts:->] {
            for rv in [d ->:reviews:->] { indep = rv.independent_verdict; vetoed = rv.vetoed; agree = rv.agree; }
        }

        trace: list[dict] = [];
        trace.append({"agent": "Intake", "verdict": (str(len([f for f in [target ->:derived_from:->]]))
            + " visible + " + str(len([f for f in [target ->:restricted_from:->]])) + " protected facts"),
            "reasoning": "Read the application package and classified every fact by sensitivity. Protected "
                + "characteristics were routed to a restricted edge the analysts cannot traverse."});
        for a in [target ->:supports:->] {
            trace.append({"agent": a.agent.capitalize(), "verdict": a.verdict, "reasoning": a.reasoning});
        }
        trace.append({"agent": "Adjudicator", "verdict": draft_out,
            "reasoning": "Combined the analyst verdicts into a draft: " + draft_out + " (relied on "
                + ", ".join(relied) + ")."});
        for d in [target ->:drafts:->] {
            for rv in [d ->:reviews:->] {
                trace.append({"agent": "NoDiscrimination", "verdict": (rv.independent_verdict
                    + (" / VETO" if rv.vetoed else (" / disagree" if not rv.agree else " / upheld"))),
                    "reasoning": rv.reasoning + " " + rv.finding});
            }
        }
        for dec in [target ->:finalizes:->] {
            for p in [dec ->:advises:->] {
                trace.append({"agent": "Advisor", "verdict": p.mode + " remediation", "reasoning": p.summary});
            }
        }

        engine = "groq" if USE_LLM else "deterministic";
        self.summary = {"case_id": self.case_id, "draft_outcome": draft_out, "final_outcome": final_out,
                        "flipped": flipped, "denied": final_out == "DENY", "has_plan": has_plan,
                        "plan_mode": plan_mode, "independent_verdict": indep, "vetoed": vetoed,
                        "agree": agree, "engine": engine, "trace": trace};
        report self.summary;
    }
}

# ---------- RESET (demo convenience) ----------
walker Reset {
    has removed: int = 0;
    can wipe with Root entry {
        apps: list[Application] = [-->[?:Application]];
        n = len(apps);
        for app in apps {
            for f in [app ->:derived_from:->] { del f; }
            for f in [app ->:restricted_from:->] { del f; }
            for a in [app ->:supports:->] { del a; }
            for d in [app ->:drafts:->] {
                for rv in [d ->:reviews:->] { del rv; }
                del d;
            }
            for dec in [app ->:finalizes:->] {
                for plan in [dec ->:advises:->] {
                    for st in [plan ->:step_of:->] { del st; }
                    del plan;
                }
                del dec;
            }
            del app;
        }
        self.removed = n;
        report {"reset": n};
    }
}

# ---------- GRAPH STATE: the frontend polls this ----------
walker GraphState {
    has graph: dict = {};
    can dump with Root entry {
        nodes: list[dict] = [];
        edges: list[dict] = [];
        apps: list[Application] = [-->[?:Application]];
        for app in apps {
            nodes.append({"id": jid(app), "type": "Application", "label": app.case_id,
                "data": {"case_id": app.case_id, "status": app.status, "raw_text": app.raw_text,
                         "package_complete": app.package_complete, "missing_docs": app.missing_docs}});
            for f in [app ->:derived_from:->] {
                nodes.append(fact_node(f));
                edges.append({"src": jid(app), "dst": jid(f), "rel": "derived_from"});
            }
            for f in [app ->:restricted_from:->] {
                nodes.append(fact_node(f));
                edges.append({"src": jid(app), "dst": jid(f), "rel": "restricted_from"});
            }
            for a in [app ->:supports:->] {
                nodes.append({"id": jid(a), "type": "Assessment", "label": a.agent + ": " + a.verdict,
                    "data": {"agent": a.agent, "verdict": a.verdict, "rationale": a.rationale,
                             "reasoning": a.reasoning}});
                edges.append({"src": jid(app), "dst": jid(a), "rel": "supports"});
                for c in [a ->:cites:->] { edges.append({"src": jid(a), "dst": jid(c), "rel": "cites"}); }
            }
            for d in [app ->:drafts:->] {
                nodes.append({"id": jid(d), "type": "DraftDecision", "label": "DRAFT: " + d.outcome,
                    "data": {"outcome": d.outcome, "reasons": d.reasons, "relied_on": d.relied_on}});
                edges.append({"src": jid(app), "dst": jid(d), "rel": "drafts"});
                for rv in [d ->:reviews:->] {
                    lab = "REVIEW: " + rv.independent_verdict + (" VETO" if rv.vetoed else ("" if rv.agree else " (disagree)"));
                    nodes.append({"id": jid(rv), "type": "Review", "label": lab,
                        "data": {"independent_verdict": rv.independent_verdict, "draft_outcome": rv.draft_outcome,
                                 "agree": rv.agree, "vetoed": rv.vetoed, "leak": rv.leak,
                                 "leak_factor": rv.leak_factor, "finding": rv.finding, "reasoning": rv.reasoning}});
                    edges.append({"src": jid(d), "dst": jid(rv), "rel": "reviews"});
                    if rv.vetoed { edges.append({"src": jid(rv), "dst": jid(d), "rel": "vetoes"}); }
                }
            }
            for dec in [app ->:finalizes:->] {
                nodes.append({"id": jid(dec), "type": "Decision", "label": "FINAL: " + dec.outcome,
                    "data": {"outcome": dec.outcome, "reasons": dec.reasons, "relied_on": dec.relied_on,
                             "explanation": dec.explanation, "vetoed_once": dec.vetoed_once}});
                edges.append({"src": jid(app), "dst": jid(dec), "rel": "finalizes"});
                for plan in [dec ->:advises:->] {
                    step_list: list[dict] = [];
                    for st in [plan ->:step_of:->] {
                        step_list.append({"factor": st.factor, "current": st.current, "target": st.target,
                                          "action": st.action, "impact": st.impact, "status": st.status});
                        nodes.append({"id": jid(st), "type": "RemediationStep",
                            "label": st.factor + ": " + st.current + " -> " + st.target,
                            "data": {"factor": st.factor, "current": st.current, "target": st.target,
                                     "action": st.action, "impact": st.impact, "status": st.status}});
                        edges.append({"src": jid(plan), "dst": jid(st), "rel": "step_of"});
                        for tf in [st ->:targets_fact:->] { edges.append({"src": jid(st), "dst": jid(tf), "rel": "targets_fact"}); }
                    }
                    nodes.append({"id": jid(plan), "type": "RemediationPlan", "label": "REAPPLY PLAN",
                        "data": {"target_outcome": plan.target_outcome, "mode": plan.mode, "summary": plan.summary,
                                 "feasible": plan.feasible, "reapply_facts": plan.reapply_facts, "steps": step_list}});
                    edges.append({"src": jid(dec), "dst": jid(plan), "rel": "advises"});
                }
            }
        }
        self.graph = {"nodes": nodes, "edges": edges};
        report self.graph;
    }
}

"""Serialize a Fact node with its sensitivity + category for the UI."""
def fact_node(f: Fact) -> dict {
    return {"id": jid(f), "type": "Fact", "label": f.key + " = " + f.value,
            "data": {"key": f.key, "value": f.value, "category": f.category,
                     "sensitivity": f.sensitivity, "source": f.source,
                     "verified": f.verified, "confidence": f.confidence}};
}

# ---------- LINEAGE: click a node -> walk provenance back to the application ----------
walker Lineage {
    has node_id: str = "";
    has result: dict = {};
    can trace with Root entry {
        all_nodes = [];
        apps: list[Application] = [-->[?:Application]];
        for app in apps {
            all_nodes.append(app);
            for f in [app ->:derived_from:->] { all_nodes.append(f); }
            for f in [app ->:restricted_from:->] { all_nodes.append(f); }
            for a in [app ->:supports:->] { all_nodes.append(a); }
            for d in [app ->:drafts:->] {
                all_nodes.append(d);
                for rv in [d ->:reviews:->] { all_nodes.append(rv); }
            }
            for dec in [app ->:finalizes:->] {
                all_nodes.append(dec);
                for plan in [dec ->:advises:->] {
                    all_nodes.append(plan);
                    for st in [plan ->:step_of:->] { all_nodes.append(st); }
                }
            }
        }
        matches = [];
        for nd in all_nodes { if jid(nd) == self.node_id { matches.append(nd); } }
        if not matches { self.result = {"path": [], "found": False}; report self.result; disengage; }

        path: list[dict] = [];
        cur = matches[0];
        seen: list[str] = [];
        running = True;
        i = 0;
        while running and i < 12 {
            path.append({"id": jid(cur), "label": describe(cur)});
            seen.append(jid(cur));
            if isinstance(cur, Application) { running = False; }
            else {
                parents = [cur <--];
                found_parent = [];
                for p in parents { if jid(p) not in seen { found_parent.append(p); } }
                if not found_parent { running = False; }
                else { cur = found_parent[0]; }
            }
            i += 1;
        }
        self.result = {"found": True, "path": path};
        report self.result;
    }
}

"""Short human label for any provenance node."""
def describe(n: any) -> str {
    if isinstance(n, Application) { return "Application " + n.case_id; }
    if isinstance(n, Fact) { return "Fact: " + n.key + " = " + n.value + " [" + n.sensitivity + "]"; }
    if isinstance(n, Assessment) { return n.agent + " assessment: " + n.verdict; }
    if isinstance(n, DraftDecision) { return "Draft decision: " + n.outcome; }
    if isinstance(n, Review) { return "Independent review: " + n.independent_verdict + (" (VETO)" if n.vetoed else ""); }
    if isinstance(n, Decision) { return "Final decision: " + n.outcome; }
    if isinstance(n, RemediationPlan) { return "Reapplication plan (" + n.mode + ")"; }
    if isinstance(n, RemediationStep) { return "Fix " + n.factor + ": " + n.current + " -> " + n.target; }
    return "node";
}
