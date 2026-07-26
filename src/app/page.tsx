import Link from "next/link";
import { FadeIn } from "~/components/fade-in";
import { AGENT_ICONS, IconArrowRight, IconShield } from "~/components/icons";
import { Magnetic } from "~/components/magnetic";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { AGENT_ORDER, AGENTS } from "~/lib/audit/data";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-16 px-4 pt-32 pb-10 sm:px-6 lg:px-8">
      <FadeIn>
        <div className="flex flex-col gap-5">
          <Badge
            variant="outline"
            className="w-fit gap-1.5 border-secondary text-secondary"
          >
            <IconShield className="size-3" />
            System online
          </Badge>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Glass <em className="text-primary italic">Box</em>
          </h1>
          <p className="max-w-lg text-sm text-muted-foreground sm:text-base">
            Auditable multi-agent decisioning. Five agents extract facts, assess
            risk and affordability, verify fairness, and adjudicate — every step
            traced back to its evidence.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Magnetic>
              <Button asChild size="lg">
                <Link href="/audit">
                  Run the audit
                  <IconArrowRight className="size-4" />
                </Link>
              </Button>
            </Magnetic>
            <Button asChild size="lg" variant="outline">
              <a href="#agent-roster">See how it works</a>
            </Button>
          </div>
        </div>
      </FadeIn>

      <div id="agent-roster">
        <FadeIn delay={120}>
          <h2 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Agent roster
          </h2>
        </FadeIn>
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {AGENT_ORDER.map((id, i) => {
            const agent = AGENTS[id];
            const AgentIcon = AGENT_ICONS[id];
            return (
              <FadeIn
                key={id}
                delay={160 + i * 60}
                variant="tilt"
                className="w-60 shrink-0 snap-start"
              >
                <Card className="gap-2 py-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] active:duration-100">
                  <CardContent className="flex flex-col gap-2 px-4">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <AgentIcon className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {agent.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {agent.role}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </main>
  );
}
