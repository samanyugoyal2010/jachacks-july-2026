# Credit Report Summary

*Bureau-pulled, not applicant-submitted, in a real flow — the applicant never fills this out.
Feeds the risk-scoring agent; note that `core.jac`'s risk analyst intentionally reads
`zip_code` as a stand-in for a real bureau feed, so this template documents what a genuine
tri-merge report contributes beyond that proxy.*

---

**Applicant:** ___________________________  **Report date:** ______________

**Bureau(s):** ☐ Equifax ☐ Experian ☐ TransUnion  **Report reference #:** ___________

## Score

| Bureau | Score (300–850) | Model |
|---|---|---|
| Equifax | | |
| Experian | | |
| TransUnion | | |
| **Score used (middle/lower of the three)** | | |

## Summary

| Metric | Value |
|---|---|
| Total accounts | |
| Open accounts | |
| Total balances | |
| Total credit limit | |
| Credit utilization (%) | |
| Accounts 30+ days past due (last 24 mo) | |
| Public records (bankruptcy, liens, judgments) | |
| Hard inquiries (last 6 mo) | |
| Oldest account age (years) | |
| Average account age (years) | |

## Tradelines

| Creditor | Type | Opened | Balance | Limit/Orig. | Status | Payment history (24 mo) |
|---|---|---|---|---|---|---|
| | | | | | | |
| | | | | | | |
| | | | | | | |

## Derogatory items

| Type | Date | Amount | Status |
|---|---|---|---|
| | | | |

## Notes

- A large unexplained deposit or a discrepancy between reported and stated debt should
  generate a **Letter of Explanation** request, not a silent adjustment.
- `monthly_debt` on the [Loan Application](01-loan-application.md) should reconcile against
  the sum of minimum payments on open tradelines above.
