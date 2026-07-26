"""Fetching a stored reconstruction back out.

WHY THIS IS NOT AN @restspec RAW-HTML ROUTE
-------------------------------------------
The plan called for
`@restspec(method=GET, path="/site/{id}", produces="text/html", envelope=False)`
serving a bare document. Under `jac start` 0.34.7 that does not work: the
custom path never wins against the client static server (GET /site/<id>
returns the client app shell), and `envelope=False` / `produces` are ignored on
the default `/function/serve_site` route, which still answers JSON.

That turned out not to matter, because the CSP research had already forced the
real answer. A host page's `frame-src` blocks an iframe pointing at localhost,
so the extension could never have used a URL route for the overlay - the HTML
has to travel as a STRING and go into `srcdoc`. Converse already returns it
that way.

So this file just exposes the stored document for the secondary paths: the
"open in a new tab" affordance and the dashboard's permalinks, both of which
fetch the string and hand it to a blob URL.
"""

include graph;

"""A branded placeholder so a failure never shows a blank screen."""
def fallback_document(message: str) -> str {
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Not ready yet</title>
<style>
  body{{margin:0;min-height:100vh;display:grid;place-items:center;
    font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#1c1f26}}
  .box{{max-width:34ch;text-align:center;padding:2rem;line-height:1.6}}
  .dot{{width:10px;height:10px;border-radius:50%;background:#3b5bdb;margin:0 auto 1rem}}
</style></head>
<body><div class="box"><div class="dot"></div><p>{message}</p></div></body></html>''';
}

"""Return one stored reconstruction as an HTML string."""
walker:pub GetSite {
    has recon_id: str = "",
        reports: list[dict] = [];

    can run with Root entry {
        doc = find_reconstruction(self.recon_id);
        if doc is None {
            report {
                "ok": False,
                "html": fallback_document("That rebuild has expired or was never created.")
            };
            disengage;
        }
        if doc.html.strip() == "" {
            report {
                "ok": False,
                "html": fallback_document("Still building that page. Give it a moment.")
            };
            disengage;
        }
        report {
            "ok": True,
            "html": doc.html,
            "title": doc.title,
            "url": doc.url,
            "fallback_level": doc.fallback_level
        };
    }
}
