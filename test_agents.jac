"""Offline/online self-test of the byLLM reasoning layer.

  jac run test_agents.jac                      # MockLLM, offline
  GLASSBOX_LLM=groq jac run test_agents.jac    # real model on Groq
"""
include agents;

with entry {
    facts = extract_facts("Maria Alvarez, income $52,000, debt $900/mo, ZIP 94112.");
    print("extract_facts ->", [(f.key, f.value) for f in facts]);
    review = independent_review("annual_income=52000, monthly_debt=900",
        "Debt-to-income under 43% is permissible; ZIP code must not be used.");
    print("independent_review ->", review);
    exp = plain_language_explanation("APPROVE", ["debt-to-income within limit"]);
    print("explanation ->", exp);
    plan = draft_action_plan("DENY", "debt-to-income above the limit",
        ["Pay down $700 of monthly obligations."]);
    print("action_plan ->", plan);
}
