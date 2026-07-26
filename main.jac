"""Voice Agent - entry point.

The Chrome extension is the real UI; the backend normally runs headless with
`jac start --no-client`. This module still mounts a small dashboard at `/` so
the profile graph can be inspected in a browser during development.
"""

import from endpoints { Converse, GetProfile, AddFact, ResetAll, GetHistory }

cl {
    import from .frontend { app as DashboardApp }

    def:pub app -> JsxElement {
        return <DashboardApp/>;
    }
}
