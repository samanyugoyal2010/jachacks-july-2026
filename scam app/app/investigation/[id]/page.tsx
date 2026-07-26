import { runInvestigation } from "@/lib/scamgraph/engine";
import { InvestigationClient } from "@/components/InvestigationClient";

export default function InvestigationPage() {
  return <InvestigationClient initial={runInvestigation()} />;
}
