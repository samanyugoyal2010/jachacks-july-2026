"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FadeIn } from "~/components/fade-in";
import { IconArrowRight } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { saveMine } from "~/lib/audit/session";

const BLANK = {
  name: "",
  annual_income: "",
  monthly_debt: "",
  employment: "full_time",
  tenure_years: "",
  income_verified: "true",
  collateral_type: "none",
  collateral_value: "",
  collateral_appraised: "false",
  zip_code: "",
  marital_status: "",
  receives_public_assistance: "false",
  age_bracket: "",
};

const sel =
  "h-9 w-full rounded-md border border-border/60 bg-background/60 px-3 text-sm text-foreground";

export default function Apply() {
  const router = useRouter();
  const [f, setF] = useState<Record<string, string>>(BLANK);
  const set = (k: string) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const ready = f.annual_income !== "" && f.monthly_debt !== "";

  function submit() {
    const facts = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ""));
    facts.id_verified = "true";
    saveMine(facts);
    router.push("/audit?mine=1");
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-32 pb-16 sm:px-6">
      <FadeIn>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Apply for a loan
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Every step of the decision is recorded and shown back to you. If we decline, you get the
            exact reason and a plan to fix it — not a form letter. Nothing leaves your machine.
          </p>
        </div>
      </FadeIn>

      <FadeIn>
        <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
          <CardContent className="flex flex-col gap-4 p-5">
            <h2 className="font-display text-sm font-bold text-foreground">Income &amp; debt</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={f.name} onChange={set("name")} placeholder="Alex Chen" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inc">Annual income ($)</Label>
                <Input id="inc" value={f.annual_income} onChange={set("annual_income")} placeholder="52000" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="debt">Monthly debt payments ($)</Label>
                <Input id="debt" value={f.monthly_debt} onChange={set("monthly_debt")} placeholder="900" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp">Employment</Label>
                <select id="emp" className={sel} value={f.employment} onChange={set("employment")}>
                  <option value="full_time">Full time</option>
                  <option value="part_time">Part time</option>
                  <option value="self_employed">Self employed</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ten">Years at your job</Label>
                <Input id="ten" value={f.tenure_years} onChange={set("tenure_years")} placeholder="4" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ver">Can you document your income?</Label>
                <select id="ver" className={sel} value={f.income_verified} onChange={set("income_verified")}>
                  <option value="true">Yes — pay stubs or tax return</option>
                  <option value="false">No documents yet</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn>
        <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
          <CardContent className="flex flex-col gap-4 p-5">
            <h2 className="font-display text-sm font-bold text-foreground">
              Collateral <span className="font-normal text-muted-foreground">(optional)</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ct">Type</Label>
                <select id="ct" className={sel} value={f.collateral_type} onChange={set("collateral_type")}>
                  <option value="none">None</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="home">Home</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cv">Estimated value ($)</Label>
                <Input id="cv" value={f.collateral_value} onChange={set("collateral_value")} placeholder="8000" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ca">Appraised?</Label>
                <select id="ca" className={sel} value={f.collateral_appraised} onChange={set("collateral_appraised")}>
                  <option value="false">Not appraised</option>
                  <option value="true">Appraised</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn>
        <Card className="border-destructive/40 bg-destructive/5 backdrop-blur-xl">
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-sm font-bold text-foreground">
                Demographic information
              </h2>
              <span className="rounded-full border border-destructive/50 px-2 py-0.5 text-[10px] font-bold text-destructive">
                🔒 withheld from scoring
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              We collect these <em>only</em> so an independent reviewer can prove they were never
              used against you. The scoring agents physically cannot read them — that&apos;s enforced
              in the data layer, not by a policy someone can ignore.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="zip">ZIP code</Label>
                <Input id="zip" value={f.zip_code} onChange={set("zip_code")} placeholder="94112" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ms">Marital status</Label>
                <select id="ms" className={sel} value={f.marital_status} onChange={set("marital_status")}>
                  <option value="">Prefer not to say</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pa">Receiving public assistance?</Label>
                <select id="pa" className={sel} value={f.receives_public_assistance} onChange={set("receives_public_assistance")}>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ab">Age bracket</Label>
                <select id="ab" className={sel} value={f.age_bracket} onChange={set("age_bracket")}>
                  <option value="">Prefer not to say</option>
                  <option value="25-34">25–34</option>
                  <option value="35-44">35–44</option>
                  <option value="45-59">45–59</option>
                  <option value="60+">60+</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" disabled={!ready} onClick={submit}>
            Submit application
            <IconArrowRight className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Income and monthly debt are required.
          </span>
        </div>
      </FadeIn>
    </main>
  );
}
