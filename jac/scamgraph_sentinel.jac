"""ScamGraph Sentinel Jac graph model and walker contract.

This source is intentionally readable for hackathon judging. The Next.js API
uses a TypeScript runtime mirror so the demo can run on machines without a Jac
service, but the node, edge, and walker architecture here is the canonical graph
design.
"""

node Customer { has name: str; }
node Account { has label: str; has balance: float; }
node Transfer { has amount: float; has purpose: str; has speed: str; has note: str; }
node Recipient { has name: str; has added_minutes_ago: int; has paid_monthly_months: int = 0; }
node Communication { has initiated_by_customer: bool; }
node Claim { has label: str; has risk_delta: int; }
node Instruction { has label: str; has risk_delta: int; }
node TransactionSignal { has label: str; has risk_delta: int; has evidence: list[str]; }
node ManipulationSignal { has label: str; has risk_delta: int; has evidence: list[str]; }
node ExculpatorySignal { has label: str; has risk_delta: int; has evidence: list[str]; }
node ScamPattern { has label: str; has supported: bool = false; }
node AgentFinding { has agent: str; has finding: str; has evidence: list[str]; }
node Policy { has label: str; has threshold: str; }
node Intervention { has status: str; has recommendation: str; }
node Investigation { has case_id: str; has score: int = 0; has outcome: str = "PENDING"; }
node AuditEvent { has walker: str; has finding: str; has policy: str = ""; }

edge OWNS {}
edge INITIATED {}
edge SENT_TO {}
edge CONTACTED_BY {}
edge CLAIMED_TO_BE {}
edge INSTRUCTED {}
edge EXHIBITS {}
edge SUPPORTED_BY {}
edge CONTRADICTED_BY {}
edge CHALLENGED_BY {}
edge MATCHES_PATTERN {}
edge TRIGGERED {}
edge GOVERNED_BY {}
edge RECORDED_AS {}

walker transaction_context_walker {
    """Adds new-recipient and unusual-amount transaction evidence."""
}

walker relationship_walker {
    """Determines whether the recipient is known or independently verified."""
}

walker manipulation_walker {
    """Turns structured customer answers into manipulation signals."""
}

walker pattern_match_walker {
    """Requires signal combinations before creating scam-pattern findings."""
}

walker skeptic_walker {
    """Searches for innocent explanations and contradictory evidence."""
}

walker safety_gate_walker {
    """Applies deterministic release, verify, pause, or escalate policy."""
}

walker audit_walker {
    """Records nodes visited, evidence used, states, and policy rules."""
}

walker replay_walker {
    """Recalculates affected graph branches while preserving the original investigation."""
}
