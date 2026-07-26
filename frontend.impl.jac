"""Implementations for the dashboard component."""

impl app.refresh -> None {
    prof = root spawn GetProfile();
    hist = root spawn GetHistory();
    if len(prof.reports) > 0 {
        facts = prof.reports[0]["facts"];
    }
    if len(hist.reports) > 0 {
        sites = hist.reports[0]["sites"];
    }
    loading = False;
}

impl app.reset -> None {
    root spawn ResetAll();
    facts = [];
    sites = [];
}
