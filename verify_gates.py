"""Clean-room verification of the 5 gates (backend). Run from a fresh .jac dir."""
import os, sys
from jaclang import JacRuntimeInterface as R

core = R.jac_import("core", base_path=".")[0]
root = R.root()

def run(cid, facts):
    R.spawn(R.spawn_walker("Reset", {}, module_name="core"), root)
    w = R.spawn_walker("RunCase", {"case_id": cid, "raw_text": "", "facts": facts}, module_name="core")
    R.spawn(w, root)
    return w.summary

C = {
 "maria": {"annual_income":"52000","monthly_debt":"900","income_verified":"true","zip_code":"94112","marital_status":"single","receives_public_assistance":"true","age_bracket":"25-34"},
 "jordan": {"annual_income":"80000","monthly_debt":"500","income_verified":"true","zip_code":"94301"},
 "riley": {"annual_income":"60000","monthly_debt":"2400","income_verified":"true","collateral_type":"home","collateral_value":"400000","collateral_appraised":"true","zip_code":"94301"},
 "sam": {"annual_income":"30000","monthly_debt":"1500","income_verified":"true"},
 "casey": {"annual_income":"70000","monthly_debt":"1200","income_verified":"false","pay_stub_present":"false"},
}
r = {k: run(k, v) for k, v in C.items()}
ok = True
def check(name, cond):
    global ok
    print(("  PASS " if cond else "  FAIL ") + name); ok = ok and cond

print("GATE 2 — fairness case DENY -> veto -> APPROVE:")
check("maria draft=DENY", r["maria"]["draft_outcome"] == "DENY")
check("maria vetoed", r["maria"]["vetoed"] is True)
check("maria final=APPROVE", r["maria"]["final_outcome"] == "APPROVE")

print("GATE 3 — verifier upholds AND overturns an approval:")
check("jordan upheld approve (draft=APPROVE, final=APPROVE, no veto)",
      r["jordan"]["draft_outcome"] == "APPROVE" and r["jordan"]["final_outcome"] == "APPROVE" and r["jordan"]["vetoed"] is False)
check("riley overturns approval (draft=APPROVE, indep=DENY, veto, final=DENY)",
      r["riley"]["draft_outcome"] == "APPROVE" and r["riley"]["independent_verdict"] == "DENY" and r["riley"]["vetoed"] is True and r["riley"]["final_outcome"] == "DENY")
check("independent review is not a rubber stamp (disagrees on maria & riley)",
      r["maria"]["agree"] is False and r["riley"]["agree"] is False)

print("Extra — recourse modes:")
check("sam substantive", r["sam"]["plan_mode"] == "substantive")
check("casey fixable", r["casey"]["plan_mode"] == "fixable")

sys.exit(0 if ok else 1)
