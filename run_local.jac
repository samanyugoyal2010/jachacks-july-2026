"""Local driver: seed the Maria case and print the decision trail (jac run run_local.jac)."""
include core;

with entry {
    root spawn RunCase(
        case_id="MARIA-001",
        raw_text="Maria Alvarez, annual income $52,000, monthly debt $900. Receives public assistance.",
        facts={"annual_income": "52000", "monthly_debt": "900", "receives_public_assistance": "true"}
    );
    print("--- lineage of the final Decision ---");
    apps = [root -->[?:Application]];
    root spawn GraphState();
}
