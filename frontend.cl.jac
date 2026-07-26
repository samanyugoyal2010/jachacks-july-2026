"""Developer dashboard for the profile graph.

Not the product UI - the Chrome extension is. This exists so the graph the
agents read and write is inspectable in a browser during development.
"""

sv import from endpoints { GetProfile, GetHistory, ResetAll }

def:pub app -> JsxElement {
    has facts: list[dict] = [],
        sites: list[dict] = [],
        loading: bool = True;

    can with entry {
        refresh();
    }

    async def refresh -> None;
    async def reset -> None;

    return
        <div
            style={{
                "maxWidth": "760px",
                "margin": "3rem auto",
                "padding": "0 1.25rem",
                "fontFamily": "system-ui, -apple-system, sans-serif",
                "color": "#16181d",
                "lineHeight": "1.55"
            }}
        >
            <h1 style={{"marginBottom": "0.25rem", "letterSpacing": "-0.02em"}}>Voice Agent</h1>
            <p style={{"color": "#6b7280", "marginTop": "0"}}>
                Profile graph inspector. The product UI is the Chrome extension.
            </p>

            <h2 style={{"fontSize": "1.05rem", "marginTop": "2rem"}}>
                What the agent knows about you
            </h2>
            {loading and <p style={{"color": "#9ca3af"}}>Loading…</p>}
            {[
                <div
                    key={idx}
                    style={{
                        "padding": "0.6rem 0.85rem",
                        "marginBottom": "0.4rem",
                        "background": "#f7f8fa",
                        "border": "1px solid #e6e8ec",
                        "borderRadius": "8px",
                        "display": "flex",
                        "gap": "0.75rem",
                        "alignItems": "baseline"
                    }}
                >
                    <span
                        style={{
                            "fontSize": "0.7rem",
                            "textTransform": "uppercase",
                            "letterSpacing": "0.06em",
                            "color": "#6366f1",
                            "fontWeight": "600",
                            "minWidth": "8.5rem"
                        }}
                    >
                        {f["kind"]}
                    </span>
                    <span>{f["value"]}</span>
                </div>
                for (idx, f) in enumerate(facts)
            ]}

            <h2 style={{"fontSize": "1.05rem", "marginTop": "2rem"}}>Rebuilt pages</h2>
            {[
                <div key={idx} style={{"marginBottom": "0.75rem"}}>
                    <div style={{"fontWeight": "600"}}>{s["title"]}</div>
                    <div style={{"fontSize": "0.85rem", "color": "#6b7280"}}>{s["url"]}</div>
                    {[
                        <a
                            key={r["id"]}
                            href={f"/site/{r['id']}"}
                            target="_blank"
                            style={{
                                "display": "inline-block",
                                "marginTop": "0.3rem",
                                "marginRight": "0.5rem",
                                "fontSize": "0.85rem",
                                "color": "#4f46e5"
                            }}
                        >
                            open rebuild →
                        </a>
                        for r in s["reconstructions"]
                    ]}
                </div>
                for (idx, s) in enumerate(sites)
            ]}

            <button
                onClick={reset}
                style={{
                    "marginTop": "2.5rem",
                    "padding": "0.5rem 0.9rem",
                    "background": "#fff",
                    "color": "#b91c1c",
                    "border": "1px solid #fca5a5",
                    "borderRadius": "7px",
                    "cursor": "pointer",
                    "fontSize": "0.85rem"
                }}
            >
                Reset everything
            </button>
        </div>;
}
