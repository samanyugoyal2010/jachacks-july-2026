# Uniform Loan Application

*Modeled on Fannie Mae / Freddie Mac Form 1003. Field keys in `(parentheses)` match the fact
keys `core.jac` expects from `Intake` — fill this out, then feed the values (or the raw
narrative) into the `Apply` flow.*

---

## Section 1 — Borrower Information

| Field | Value |
|---|---|
| Full legal name | |
| Date of birth | |
| Social Security Number | XXX-XX-____ |
| Marital status `(marital_status)` | ☐ Single ☐ Married ☐ Separated |
| Current address | |
| ZIP code `(zip_code)` | |
| Years at current address | |
| Phone | |
| Email | |

## Section 2 — Employment & Income

| Field | Value |
|---|---|
| Employment status `(employment)` | ☐ Full time ☐ Part time ☐ Self employed ☐ Unemployed |
| Employer name | |
| Job title | |
| Years at current job `(tenure_years)` | |
| Gross annual income ($) `(annual_income)` | |
| Other income sources | |
| Can you document this income? `(income_verified)` | ☐ Yes — pay stubs or tax return ☐ No documents yet |
| Pay stub attached `(pay_stub_present)` | ☐ Yes ☐ No |
| Tax return / 1099 attached `(tax_doc_present)` | ☐ Yes ☐ No |

## Section 3 — Monthly Liabilities

| Field | Value |
|---|---|
| Total monthly debt payments ($) `(monthly_debt)` | |
| — Rent / mortgage | |
| — Auto loan(s) | |
| — Student loan(s) | |
| — Credit card minimums | |
| — Other recurring debt | |

## Section 4 — Loan & Collateral

| Field | Value |
|---|---|
| Loan amount requested ($) | |
| Loan purpose | |
| Collateral type `(collateral_type)` | ☐ None ☐ Vehicle ☐ Real estate ☐ Other |
| Estimated collateral value ($) `(collateral_value)` | |
| Collateral appraised `(collateral_appraised)` | ☐ Yes ☐ No |

## Section 5 — Government Monitoring Information (voluntary)

*Collected under Regulation B for fairness monitoring only. These fields are stored on a
restricted edge that scoring agents cannot traverse — see [`core.jac`](../core.jac) `restricted_from`.*

| Field | Value |
|---|---|
| Race `(race)` | |
| National origin `(national_origin)` | |
| Sex `(sex)` | |
| Religion `(religion)` | |
| Age bracket `(age_bracket)` | ☐ 18–24 ☐ 25–34 ☐ 35–44 ☐ 45–54 ☐ 55–64 ☐ 65+ |
| Receiving public assistance `(receives_public_assistance)` | ☐ Yes ☐ No |

## Section 6 — Certification

I certify that the information provided in this application is true and complete to the best
of my knowledge, and I authorize verification of any information contained herein.

Signature: ______________________  Date: ______________
