"""Persistent graph: nodes, edges and the helpers that read/write them.

Everything hangs off `root`, which Jac persists to `.jac/` automatically across
server restarts. There is no database, no ORM and no migration - the graph IS
the store.

Shape:
    root -Has->          Profile -Has-> PreferenceFact*
    root -VisitedEdge->  VisitedSite -ReconstructedAs-> Reconstruction*
    root -SpokeTurn->    ConversationTurn*
"""

import from datetime { datetime }

# ─────────────────────────────── archetypes ───────────────────────────────

node Profile {
    has created_at: str = "",
        version: int = 1;
}

node PreferenceFact {
    has kind: str,
        value: str,
        created_at: str = "";
}

node VisitedSite {
    has url: str,
        domain: str,
        title: str = "",
        visit_count: int = 1;
}

node Reconstruction {
    has url: str,
        title: str = "",
        html: str = "",
        fallback_level: int = 0,
        created_at: str = "";
}

node ConversationTurn {
    has role: str,
        text: str,
        created_at: str = "";
}

edge Has {}

edge VisitedEdge {}

edge ReconstructedAs {}

edge SpokeTurn {}

# ──────────────────────────────── helpers ────────────────────────────────

def now_str -> str {
    raw = datetime.now().isoformat();
    return str(raw);
}

"""Cheap host extraction. Avoids a tldextract call on the hot path."""
def domain_of(url: str) -> str {
    rest = url;
    if "://" in rest {
        rest = rest.split("://")[1];
    }
    rest = rest.split("/")[0];
    if rest.startswith("www.") {
        rest = rest[4:];
    }
    return rest;
}

def get_or_create_profile -> Profile {
    existing = [root -->][?:Profile];
    if len(existing) > 0 {
        return existing[0];
    }
    return root ++> Profile(created_at=now_str());
}

"""Persist one preference fact. Skips exact duplicates."""
def store_fact(kind: str, value: str) -> str {
    prof = get_or_create_profile();
    for f in [prof -->][?:PreferenceFact] {
        if f.value.lower() == value.lower() {
            return f"already known: {value}";
        }
    }
    prof +>: Has :+> PreferenceFact(kind=kind, value=value, created_at=now_str());
    prof.version = prof.version + 1;
    return f"stored: {value}";
}

def all_facts -> list[str] {
    prof = get_or_create_profile();
    return [f"{f.kind}: {f.value}" for f in [prof -->][?:PreferenceFact]];
}

def summarize_profile -> str {
    facts = all_facts();
    if len(facts) == 0 {
        return "Nothing known about this user yet.";
    }
    return "\n".join(facts);
}

def save_turn(role: str, text: str) {
    root +>: SpokeTurn :+> ConversationTurn(role=role, text=text, created_at=now_str());
}

def recent_turns(limit: int) -> list[ConversationTurn] {
    turns = [root -->][?:ConversationTurn];
    if len(turns) <= limit {
        return turns;
    }
    return turns[-limit:];
}

def record_visit(url: str, title: str) -> VisitedSite {
    dom = domain_of(url);
    for s in [root -->][?:VisitedSite] {
        if s.url == url {
            s.visit_count = s.visit_count + 1;
            return s;
        }
    }
    return root +>: VisitedEdge :+> VisitedSite(url=url, domain=dom, title=title);
}

def save_reconstruction(url: str, title: str, html: str, fallback_level: int) -> Reconstruction {
    site = record_visit(url, title);
    return site +>: ReconstructedAs :+> Reconstruction(
        url=url,
        title=title,
        html=html,
        fallback_level=fallback_level,
        created_at=now_str()
    );
}

def find_reconstruction(recon_id: str) -> Reconstruction | None {
    for site in [root -->][?:VisitedSite] {
        for r in [site -->][?:Reconstruction] {
            if jid(r) == recon_id {
                return r;
            }
        }
    }
    return None;
}

"""Most recent rebuild of this URL, or None. Used as a cache probe."""
def latest_reconstruction_for(url: str) -> Reconstruction | None {
    for site in [root -->][?:VisitedSite] {
        if site.url == url {
            recons = [site -->][?:Reconstruction];
            if len(recons) > 0 {
                return recons[-1];
            }
        }
    }
    return None;
}
