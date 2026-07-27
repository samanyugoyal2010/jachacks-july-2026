/** Demo application packages — each exercises a different real path through core.jac. */
export interface DemoCase {
  id: string;
  name: string;
  tag: string;
  /** short label shown next to the name */
  headline: string;
  /** plain-English story, written for someone with no finance background */
  plain: string;
  desc: string;
  facts: Record<string, string>;
}

export const CASES: DemoCase[] = [
  {
    id: "MARIA-001", headline: 'she was declined unfairly — and it got caught', plain: 'Maria can comfortably afford this loan. But the risk model flagged her because of the neighbourhood she lives in, which is really a stand-in for race. The reviewer catches it and her decline is overturned to an approval.', name: "Maria Alvarez", tag: "proxy discrimination → veto",
    desc: "Qualifies on the numbers, but the risk model leans on her ZIP code — a proxy for a protected class.",
    facts: {
      name: "Maria Alvarez", id_type: "drivers_license", id_verified: "true",
      annual_income: "52000", monthly_debt: "900", employment: "full_time", tenure_years: "4",
      pay_stub_present: "true", income_verified: "true",
      collateral_type: "vehicle", collateral_value: "8000", collateral_appraised: "true",
      references: "2", cosigner: "none", banking_relationship_years: "6",
      zip_code: "94112", marital_status: "single", receives_public_assistance: "true", age_bracket: "25-34",
    },
  },
  {
    id: "JORDAN-002", headline: 'approved, and the check agreed', plain: 'Jordan earns well and owes little. Nothing questionable is in play, the reviewer independently agrees with the approval, and no veto is needed. This is what a clean run looks like.', name: "Jordan Lee", tag: "clean approval → upheld",
    desc: "Strong income, low debt, no proxy in play. The independent review agrees.",
    facts: {
      name: "Jordan Lee", id_verified: "true", annual_income: "80000", monthly_debt: "500",
      income_verified: "true", zip_code: "94301", marital_status: "married", age_bracket: "35-44",
    },
  },
  {
    id: "SAM-003", headline: 'a fair decline — with a way back', plain: "Sam's paperwork is complete, but he owes $1,500 a month on $30,000 of income. That's genuinely too much, so the decline stands. He gets the exact number that has to change, and can test the fix.", name: "Sam Rivera", tag: "substantive denial → remediation",
    desc: "Complete application, but debt-to-income is 60% against a 43% limit.",
    facts: {
      name: "Sam Rivera", id_verified: "true", annual_income: "30000", monthly_debt: "1500",
      income_verified: "true", zip_code: "94301",
    },
  },
  {
    id: "RILEY-004", headline: 'an approval that got overturned', plain: 'Riley was approved because her house is worth a lot — even though her debt is above the hard limit. The reviewer blocks it. The check protects the lender and the borrower, not just the borrower.', name: "Riley Kim", tag: "unsound approval → overturned",
    desc: "Adjudicator approves on collateral despite a 48% DTI. The reviewer overturns it.",
    facts: {
      name: "Riley Kim", id_verified: "true", annual_income: "60000", monthly_debt: "2400",
      income_verified: "true", collateral_type: "home", collateral_value: "400000",
      collateral_appraised: "true", zip_code: "94301",
    },
  },
  {
    id: "CASEY-005", headline: 'declined over missing paperwork, not money', plain: 'Casey earns plenty, but never uploaded pay stubs, so nothing could be verified. This is a paperwork problem, not a money problem — and the plan says exactly which document to send.', name: "Casey Doe", tag: "missing documents → fixable",
    desc: "Income would qualify, but it isn't verified — no pay stubs on file.",
    facts: {
      name: "Casey Doe", id_verified: "true", annual_income: "70000", monthly_debt: "1200",
      income_verified: "false", pay_stub_present: "false", zip_code: "94301",
    },
  },
];
