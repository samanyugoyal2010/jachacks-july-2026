// The demo applicant packages. Each is a full application package the reading
// agent ingests; sensitivity is assigned server-side by key.
export const CASES = [
  {
    id: "MARIA-001",
    name: "Maria Alvarez",
    tag: "proxy discrimination → veto",
    desc: "Qualifies on the numbers. The risk model leans on her ZIP code — a proxy for a protected class.",
    raw_text:
      "Maria Alvarez, driver's license verified. Annual income $52,000, full-time, 4 yrs tenure, pay stubs on file. Vehicle collateral $8,000, appraised. ZIP 94112. Single, receives public assistance, age 25-34.",
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
    id: "JORDAN-002",
    name: "Jordan Lee",
    tag: "clean approval → upheld",
    desc: "Strong income, low debt, no proxy in play. The independent review agrees with the approval.",
    raw_text: "Jordan Lee, ID verified. Annual income $80,000, monthly debt $500, income verified. ZIP 94301. Married, age 35-44.",
    facts: {
      name: "Jordan Lee", id_verified: "true", annual_income: "80000", monthly_debt: "500",
      income_verified: "true", zip_code: "94301", marital_status: "married", age_bracket: "35-44",
    },
  },
  {
    id: "SAM-003",
    name: "Sam Rivera",
    tag: "substantive denial → remediation",
    desc: "Complete application, but debt-to-income is 60% (limit 43%). A legitimate denial with a plan to fix it.",
    raw_text: "Sam Rivera, ID verified. Annual income $30,000, monthly debt $1,500, income verified. ZIP 94301.",
    facts: {
      name: "Sam Rivera", id_verified: "true", annual_income: "30000", monthly_debt: "1500",
      income_verified: "true", zip_code: "94301",
    },
  },
  {
    id: "RILEY-004",
    name: "Riley Kim",
    tag: "unsound approval → overturned",
    desc: "Adjudicator approves on collateral despite a 48% DTI. The independent review overturns the approval.",
    raw_text: "Riley Kim, ID verified. Annual income $60,000, monthly debt $2,400, income verified. Home collateral $400,000, appraised. ZIP 94301.",
    facts: {
      name: "Riley Kim", id_verified: "true", annual_income: "60000", monthly_debt: "2400",
      income_verified: "true", collateral_type: "home", collateral_value: "400000",
      collateral_appraised: "true", zip_code: "94301",
    },
  },
  {
    id: "CASEY-005",
    name: "Casey Doe",
    tag: "missing documents → fixable",
    desc: "Income would qualify, but it isn't verified — no pay stubs. A fixable, submission-level denial.",
    raw_text: "Casey Doe, ID verified. Annual income $70,000 (unverified, no pay stubs), monthly debt $1,200. ZIP 94301.",
    facts: {
      name: "Casey Doe", id_verified: "true", annual_income: "70000", monthly_debt: "1200",
      income_verified: "false", pay_stub_present: "false", zip_code: "94301",
    },
  },
];
