import type { Metadata } from "next";
import { AuditDashboard } from "~/components/audit/audit-dashboard";

export const metadata: Metadata = {
  title: "Glass Box — AI Decision Audit",
  description:
    "Auditable multi-agent AI decision platform for high-stakes automated decisions.",
};

export default function AuditPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 pt-28 pb-8 sm:px-6 lg:px-8">
      <AuditDashboard />
    </main>
  );
}
