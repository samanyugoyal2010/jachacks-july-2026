"""Syntax probe: verify traversal idioms against Jac 0.16.7 before building."""

node App { has name: str; }
node Fact { has key: str; }

edge derived: App --> Fact {}

walker Probe {
    can start with Root entry {
        a = here ++> App(name="maria");
        app = a[0];
        f1 = app ++> Fact(key="income");
        f2 = app ++> Fact(key="debt");
        # typed edge create
        app +>:derived:+> f1[0];
        app +>:derived:+> f2[0];

        # FORWARD typed read (known-good)
        fwd = [app ->:derived:->];
        print("forward derived count:", len(fwd));

        # REVERSE untyped read
        fact = f1[0];
        rev_untyped = [fact <--];
        print("reverse untyped count:", len(rev_untyped));

        # REVERSE typed read
        rev_typed = [fact <-:derived:<-];
        print("reverse typed count:", len(rev_typed));

        # node id
        print("jid:", jid(app));

        # node type filter from root
        apps = [-->[?:App]];
        print("apps from root:", len(apps));
    }
}

with entry {
    root spawn Probe();
}
