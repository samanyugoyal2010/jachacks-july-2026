import Link from "next/link";
import { FadeIn } from "~/components/fade-in";
import { IconArrowRight, IconShield } from "~/components/icons";
import { Magnetic } from "~/components/magnetic";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { CASES } from "~/lib/audit/cases";

const STEPS = [
  { n: 1, t: "We read your application", d: "Every fact is extracted and tagged. Demographic details are recorded, then locked away where the scoring agents cannot reach them." },
  { n: 2, t: "Three analysts assess you", d: "Affordability, risk and collateral — each shows its working, and none of them can see a protected characteristic." },
  { n: 3, t: "An adjudicator drafts a call", d: "It combines the three verdicts into a first decision." },
  { n: 4, t: "An independent reviewer checks it", d: "It decides for itself before it is allowed to see the draft, then catches anything the draft leaned on that it legally can't — like your ZIP code standing in for race. It can overturn an approval or a decline." },
  { n: 5, t: "A decline comes with a plan", d: "The exact document you're missing, or the exact number that has to change — and a button that re-runs the real decision to prove the fix works." },
];

export default function Home() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-16 px-4 pt-32 pb-16 sm:px-6 lg:px-8">
      <FadeIn>
        <div className="flex flex-col gap-5">
          <Badge
            variant="outline"
            className="w-fit gap-1.5 border-secondary text-secondary"
          >
            <IconShield className="size-3" />
            Fair lending, shown in the open
          </Badge>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Glass <em className="text-primary italic">Box</em>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            A lender declines you and sends a form letter. No reason you can act on, no way to
            argue, and no way to know whether something about <em>who you are</em> crept into the
            decision. Glass Box makes every step visible — and gives one agent the power to overrule
            the rest when they lean on something they legally can&apos;t.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Magnetic>
              <Button asChild size="lg">
                <Link href="/apply">
                  Apply with your own details
                  <IconArrowRight className="size-4" />
                </Link>
              </Button>
            </Magnetic>
            <Button asChild size="lg" variant="outline">
              <a href="#try">Try it on an example first</a>
            </Button>
          </div>
        </div>
      </FadeIn>

      <FadeIn>
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            How it works
          </h2>
          <div className="flex flex-col gap-3">
            {STEPS.map((s) => (
              <Card key={s.n} className="border-border/60 bg-card/70 backdrop-blur-xl">
                <CardContent className="flex gap-4 p-5">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {s.n}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{s.t}</div>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{s.d}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </FadeIn>

      <FadeIn>
        <section id="try" className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Try it on someone else first
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Five applicants, five different endings — all run through the same real system.
              Start with <strong className="text-foreground">Maria</strong>.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {CASES.map((c) => (
              <Link key={c.id} href={`/audit?demo=${c.id}`}>
                <Card className="h-full border-border/60 bg-card/70 backdrop-blur-xl transition-colors hover:border-primary/60">
                  <CardContent className="flex h-full flex-col gap-2 p-5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-foreground">{c.name}</span>
                      <span className="text-[11px] font-medium text-primary">{c.headline}</span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">{c.plain}</p>
                    <span className="mt-auto pt-2 text-[11px] font-semibold text-primary">
                      Watch this decision →
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </FadeIn>

      <FadeIn>
        <Card className="border-primary/40 bg-primary/5 backdrop-blur-xl">
          <CardContent className="flex flex-col gap-3 p-6">
            <h3 className="font-display text-lg font-semibold text-foreground">
              Why this matters
            </h3>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Credit decides who gets a home, a car, a business. When it goes wrong quietly, people
              lose years and never learn why. Most &quot;AI fairness&quot; checks ask a model to
              re-approve a decision it has already been shown — so it agrees, and nothing is caught.
              Here the reviewer decides first and is the only agent allowed to see protected data.
              Run <strong className="text-foreground">Maria</strong> to watch it overturn a
              discriminatory decline; run <strong className="text-foreground">Riley</strong> to watch
              it overturn an approval that broke the rules. It blocks in both directions, which is
              the difference between a real check and a rubber stamp.
            </p>
            <Button asChild className="mt-1 w-fit">
              <Link href="/apply">
                Try your own application
                <IconArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </FadeIn>
    </main>
  );
}
