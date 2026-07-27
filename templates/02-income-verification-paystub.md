# Income Verification — Pay Stub

*Sets `pay_stub_present = true` and, once cross-checked against Section 2 of the loan
application, `income_verified = true` in `core.jac`.*

---

**Employer:** ___________________________  **Pay period:** ______ to ______

**Employee:** ____________________________  **Employee ID:** ___________

| Earnings | This period | Year to date |
|---|---|---|
| Regular hours × rate | | |
| Overtime | | |
| Bonus / commission | | |
| **Gross pay** | | |

| Deductions | This period | Year to date |
|---|---|---|
| Federal tax | | |
| State tax | | |
| Social Security | | |
| Medicare | | |
| Retirement (401k/403b) | | |
| Health insurance | | |
| **Total deductions** | | |

**Net pay this period:** ________________

**Net pay deposited to:** Account ending ______

---

### Annualized income check (for `annual_income`)

| | |
|---|---|
| Gross pay this period | |
| × pay periods per year (52 weekly / 26 biweekly / 24 semimonthly / 12 monthly) | |
| **= Estimated annual income** | |

*Reconcile this figure against Section 2 of the [Loan Application](01-loan-application.md) —
a mismatch beyond a small rounding tolerance should be flagged as a discrepancy, not
silently overwritten.*

---

## Alternative — Employment Verification Letter (VOE)

*Use this section instead of a pay stub when income is self-employed or 1099, in place of a
formal stub. Sets `tax_doc_present = true`.*

On company letterhead, signed by an HR representative or manager, stating:

- Employee's full name and title
- Date employment began `(→ tenure_years)`
- Employment status (full-time / part-time / seasonal)
- Current annual salary or hourly rate `(→ annual_income)`
- Likelihood of continued employment
- Signature, title, and direct contact information of the verifier
