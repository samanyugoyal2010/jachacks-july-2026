"""Public REST surface.

Every `walker:pub Name` becomes `POST /walker/Name`; the walker's `has` fields
are the JSON body and `report`ed values come back in `data.reports`.

`:pub` means no auth and one shared global `root`. That is deliberate for a
single-user demo - switching a walker to `:priv` would give each authenticated
user their own isolated graph, which is the multi-user story but not the
hackathon scope.
"""

include graph;
import from agents.orchestrator { orchestrate }
import from agents.page { set_current_page, take_last_recon, take_last_html }
import from agents.profile { profile_as_text }


# ─────────────────────────────── converse ───────────────────────────────

"""The main turn endpoint. One utterance in, one spoken reply out."""
walker:pub Converse {
    has text: str = "",
        audio_b64: str = "",
        page: dict = {},
        reports: list[dict] = [];

    can run with Root entry {
        transcript = self.text.strip();
        if transcript == "" {
            report {"ok": False, "error": "no text or audio supplied"};
            disengage;
        }

        # Make the page visible to the orchestrator's tools.
        set_current_page(self.page);

        title = str(self.page.get("title", ""));
        url = str(self.page.get("url", ""));
        if url != "" {
            record_visit(url, title);
        }

        try {
            spoken = orchestrate(transcript, summarize_profile(), title);
        } except Exception as e {
            print(f"[converse] orchestrate failed: {e}");
            spoken = "Sorry, I had trouble with that. Could you say it again?";
        }

        save_turn("user", transcript);
        save_turn("assistant", spoken);

        report {
            "ok": True,
            "transcript": transcript,
            "spoken_reply": spoken,
            "recon_id": take_last_recon(),
            "html": take_last_html(),
            "profile_summary": summarize_profile()
        };
    }
}

# ─────────────────────────────── profile ───────────────────────────────

"""Report everything currently known about the user."""
walker:pub GetProfile {
    has derive: bool = False,
        reports: list[dict] = [];

    can run with Root entry {
        prof = get_or_create_profile();
        facts = [
            {"kind": f.kind, "value": f.value, "created_at": f.created_at}
            for f in [prof -->][?:PreferenceFact]
        ];
        out = {
            "version": prof.version,
            "created_at": prof.created_at,
            "fact_count": len(facts),
            "facts": facts,
            "summary": summarize_profile()
        };
        # Deriving costs an LLM call, so it is opt-in.
        if self.derive {
            out["derived"] = profile_as_text();
        }
        report out;
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

