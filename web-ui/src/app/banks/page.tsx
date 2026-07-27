"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FadeIn } from "~/components/fade-in";
import { IconArrowRight } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { loadMine } from "~/lib/audit/session";

interface BankResult {
  id: string;
  name: string;
  blurb: string;
  chance: number;
  verdict: string;
  why: string;
}
interface BankResponse {
  engine: "groq" | "fallback";
  reason?: string;
  profile: { dti: number; annual_income: number; monthly_debt: number };
  banks: BankResult[];
}

/** Same field keys as the Apply form, so one saved application feeds both. */
const BLANK: Record<string, string> = {
  annual_income: "",
  monthly_debt: "",
  employment: "full_time",
  tenure_years: "",
  income_verified: "true",
  collateral_type: "none",
  collateral_value: "",
  collateral_appraised: "false",
};

const sel =
  "h-9 w-full rounded-md border border-border/60 bg-background/60 px-3 text-sm text-foreground";

const BAND: Record<string, { bar: string; text: string }> = {
  Strong: { bar: "bg-success", text: "text-success" },
  Likely: { bar: "bg-primary", text: "text-primary" },
  Borderline: { bar: "bg-warning", text: "text-warning" },
  Unlikely: { bar: "bg-destructive", text: "text-destructive" },
};

export default function Banks() {
  const [f, setF] = useState<Record<string, string>>(BLANK);
  const [prefilled, setPrefilled] = useState(false);
  const [data, setData] = useState<BankResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  // Pick up the application already submitted on /apply, if there is one.
  useEffect(() => {
    const mine = loadMine();
    if (!mine) return;
    setF((p) => {
      const next = { ...p };
      for (const k of Object.keys(BLANK)) if (mine[k]) next[k] = mine[k];
      return next;
    });
    setPrefilled(true);
  }, []);

  const ready = f.annual_income !== "" && f.monthly_debt !== "";

  async function check() {
    setBusy(true);
    setError(null);
    try {
      const facts = Object.fromEntries(
        Object.entries(f).filter(([, v]) => v !== ""),
      );
      const res = await fetch("/api/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facts }),
      });
      if (!res.ok) throw new Error(`backend returned ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not reach the backend");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-32 pb-16 sm:px-6">
      <FadeIn>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Where else could you get this loan?
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Glass Box only tells you what <em>we</em> decided. This estimates
            how ten major banks would likely respond to the same numbers, so a
            decline here isn&apos;t the end of the search.
          </p>
        </div>
      </FadeIn>

      <FadeIn>
        <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-sm font-bold text-foreground">
                Your numbers
              </h2>
              {prefilled && (
                <span className="text-xs text-muted-foreground">
                  Filled in from the application you submitted — edit anything
                  to compare.
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inc">Annual income ($)</Label>
                <Input
                  id="inc"
                  value={f.annual_income}
                  onChange={set("annual_income")}
                  placeholder="64000"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="debt">Monthly debt payments ($)</Label>
                <Input
                  id="debt"
                  value={f.monthly_debt}
                  onChange={set("monthly_debt")}
                  placeholder="1100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp">Employment</Label>
                <select
                  id="emp"
                  className={sel}
                  value={f.employment}
                  onChange={set("employment")}
                >
                  <option value="full_time">Full time</option>
                  <option value="part_time">Part time</option>
                  <option value="self_employed">Self employed</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ten">Years at your job</Label>
                <Input
                  id="ten"
                  value={f.tenure_years}
                  onChange={set("tenure_years")}
                  placeholder="5"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ver">Can you document your income?</Label>
                <select
                  id="ver"
                  className={sel}
                  value={f.income_verified}
                  onChange={set("income_verified")}
                >
                  <option value="true">Yes — pay stubs or tax return</option>
                  <option value="false">No documents yet</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ct">Collateral</Label>
                <select
                  id="ct"
                  className={sel}
                  value={f.collateral_type}
                  onChange={set("collateral_type")}
                >
                  <option value="none">None</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="home">Home</option>
                </select>
              </div>
              {f.collateral_type !== "none" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="cv">Collateral value ($)</Label>
                    <Input
                      id="cv"
                      value={f.collateral_value}
                      onChange={set("collateral_value")}
                      placeholder="14000"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ca">Appraised?</Label>
                    <select
                      id="ca"
                      className={sel}
                      value={f.collateral_appraised}
                      onChange={set("collateral_appraised")}
                    >
                      <option value="false">Not appraised</option>
                      <option value="true">Appraised</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" disabled={!ready || busy} onClick={check}>
                {busy
                  ? "Checking ten banks…"
                  : data
                    ? "Check again"
                    : "Check my odds"}
                {!busy && <IconArrowRight className="size-4" />}
              </Button>
              {!ready && (
                <span className="text-xs text-muted-foreground">
                  Income and monthly debt are required.
                </span>
              )}
              {!prefilled && ready && (
                <Link
                  href="/apply"
                  className="text-xs text-primary hover:underline"
                >
                  or run the full audited decision →
                </Link>
              )}
            </div>

            {error && (
              <p className="text-xs text-destructive">
                Couldn&apos;t get estimates: {error}. Is the backend running on
                :8000?
              </p>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {data && (
        <FadeIn>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-sm font-bold text-foreground">
                Ten banks, ranked
              </h2>
              <span className="text-xs text-muted-foreground">
                Debt-to-income {Math.round(data.profile.dti * 100)}%
                {data.engine === "fallback"
                  ? " · estimated offline (the AI model was unreachable)"
                  : " · estimated by AI"}
              </span>
            </div>

            {data.banks.map((b) => {
              const band = BAND[b.verdict] ?? BAND.Borderline;
              return (
                <Card
                  key={b.id}
                  className="border-border/60 bg-card/70 backdrop-blur-xl"
                >
                  <CardContent className="flex flex-col gap-2.5 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-base font-semibold text-foreground">
                          {b.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {b.blurb}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`font-display text-xl font-semibold ${band.text}`}
                        >
                          {b.chance}%
                        </span>
                        <span className={`text-xs font-medium ${band.text}`}>
                          {b.verdict}
                        </span>
                      </div>
                    </div>

                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label={`${b.chance} percent estimated chance at ${b.name}`}
                    >
                      <div
                        className={`h-full rounded-full transition-[width] duration-700 ease-out ${band.bar}`}
                        style={{ width: `${b.chance}%` }}
                      />
                    </div>

                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {b.why}
                    </p>
                  </CardContent>
                </Card>
              );
            })}

            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">
                These are estimates, not offers.
              </strong>{" "}
              Real underwriting criteria are not public, so the bank profiles
              behind these numbers are illustrative and the percentages are
              generated by an AI model — they will shift between runs. Nothing
              here is a lending decision, a credit check, or financial advice.
              Only an application to the bank itself can tell you the answer.
            </p>
          </div>
        </FadeIn>
      )}
    </main>
  );
}
