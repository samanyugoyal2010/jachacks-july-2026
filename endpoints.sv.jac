"""Public REST surface.

Every `walker:pub Name` becomes `POST /walker/Name`; the walker's `has` fields
are the JSON body and `report`ed values come back in `data.reports`.

`:pub` means no auth and one shared global `root`. That is deliberate for a
single-user demo - switching a walker to `:priv` would give each authenticated
user their own isolated graph, which is the multi-user story but not the
hackathon scope.
"""

include graph;

# ─────────────────────────────── profile ───────────────────────────────

"""Report everything currently known about the user."""
walker:pub GetProfile {
    has reports: list[dict] = [];

    can run with Root entry {
        prof = get_or_create_profile();
        facts = [
            {"kind": f.kind, "value": f.value, "created_at": f.created_at}
            for f in [prof -->][?:PreferenceFact]
        ];
        report {
            "version": prof.version,
            "created_at": prof.created_at,
            "fact_count": len(facts),
            "facts": facts,
            "summary": summarize_profile()
        };
    }
}

"""Store a preference fact directly, bypassing the LLM extractor. Dev/testing only."""
walker:pub AddFact {
    has kind: str = "OTHER",
        value: str = "",
        reports: list[dict] = [];

    can run with Root entry {
        if self.value == "" {
            report {"ok": False, "message": "value is required"};
            disengage;
        }
        msg = store_fact(self.kind, self.value);
        report {"ok": True, "message": msg, "summary": summarize_profile()};
    }
}

"""Erase the profile, conversation history and every stored reconstruction."""
walker:pub ResetAll {
    has reports: list[dict] = [];

    can run with Root entry {
        removed = 0;
        for prof in [root -->][?:Profile] {
            for f in [prof -->][?:PreferenceFact] {
                del f;
                removed += 1;
            }
            del prof;
            removed += 1;
        }
        for site in [root -->][?:VisitedSite] {
            for r in [site -->][?:Reconstruction] {
                del r;
                removed += 1;
            }
            del site;
            removed += 1;
        }
        for t in [root -->][?:ConversationTurn] {
            del t;
            removed += 1;
        }
        report {"ok": True, "removed": removed};
    }
}

# ─────────────────────────────── history ───────────────────────────────

"""Report recent conversation turns and every reconstruction built so far."""
walker:pub GetHistory {
    has limit: int = 20,
        reports: list[dict] = [];

    can run with Root entry {
        turns = [
            {"role": t.role, "text": t.text, "at": t.created_at}
            for t in recent_turns(self.limit)
        ];
        sites = [];
        for s in [root -->][?:VisitedSite] {
            recons = [
                {"id": jid(r), "title": r.title, "at": r.created_at, "fallback_level": r.fallback_level}
                for r in [s -->][?:Reconstruction]
            ];
            sites.append({
                "url": s.url,
                "domain": s.domain,
                "title": s.title,
                "visit_count": s.visit_count,
                "reconstructions": recons
            });
        }
        report {"turns": turns, "sites": sites};
    }
}
