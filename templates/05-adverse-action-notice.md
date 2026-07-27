# Notice of Action Taken on Credit Application

*Required under ECOA / Regulation B whenever the outcome is not an unconditional approval.
Fields in `{{double braces}}` map directly onto the `Decision` node in
[`core.jac`](../core.jac): `outcome`, `explanation`, `reasons`, `relied_on`. This is the one
output document in the set — everything above it is an input.*

---

**Applicant:** {{applicant_name}}  **Application #:** {{case_id}}  **Date:** {{date}}

## Action taken

☐ Approved  ☐ Approved with conditions  ☐ **Denied** — {{outcome}}

## Statement of reasons

This notice is provided pursuant to the Equal Credit Opportunity Act. The federal Equal
Credit Opportunity Act prohibits creditors from discriminating against credit applicants on
the basis of race, color, religion, national origin, sex, marital status, age, or because
all or part of the applicant's income derives from any public assistance program.

The principal reason(s) for this decision:

{{#each reasons}}
- {{this}}
{{/each}}

**Factors relied upon:** {{relied_on}}

{{explanation}}

## Your right to a statement of specific reasons

You have the right to a written statement of the specific reasons for this action. If you
wish, you may contact us at the address below within 60 days of this notice; we will send
the statement of reasons within 30 days of your request.

**Creditor:** ___________________________  **Address:** ___________________________

**Contact:** ___________________________  **Phone:** ___________________________

## If you believe this action was taken in error

If you believe this decision relied on a prohibited basis, or on a fact that is a proxy for
one (for example, ZIP code), you may request a review. Under this system's audit trail, every
reason cited above traces to a specific verified fact and agent assessment — that trace is
available on request and is what a reviewer checks first.

## Recourse — how to change this outcome

*Populated from `RemediationPlan` / `RemediationStep` when the decision is fixable or
substantive rather than final.*

| Factor | Current | Target | Action |
|---|---|---|---|
| {{factor}} | {{current}} | {{target}} | {{action}} |

---

**Notice:** The federal Equal Credit Opportunity Act prohibits creditors from discriminating
against credit applicants on the basis of race, color, religion, national origin, sex,
marital status, age, or because all or part of the applicant's income derives from any
public assistance program. The federal agency that administers compliance with this law is
the Consumer Financial Protection Bureau, 1700 G Street NW, Washington, DC 20552.
