"""Model assignment.

Three Groq roles, split by capability. The split is forced by a constraint
verified empirically against the live Groq API:

  * Groq returns 400 "json mode cannot be combined with tool/function calling"
    when response_format and tools are sent together.
  * Only openai/gpt-oss-* support strict json_schema at all; the llama models
    reject it outright.

byLLM happens to absorb both (litellm.drop_params drops the conflicting
response_format, and byLLM separately injects the schema as a prompt hint), so
this is a safety margin rather than a hard wall. We keep the split anyway:
native schema enforcement beats prompt-hinting plus retry, and the specialist
boundary is good architecture regardless.

  RULE: an agent has tools, or an enforced return schema. Never both.

Two rate facts learned the hard way, both about tokens rather than requests:

  * The binding free-tier limit is TOKENS PER MINUTE, not requests per day.
    llama-3.3-70b is 12k TPM. The orchestrator carries five tool schemas plus
    its system prompt, so it spends ~2k tokens a turn - roughly six turns a
    minute before Groq starts refusing. Hence ModelPool below: a TPM refusal
    falls through to the next model instead of failing the turn.
  * gpt-oss is a reasoning model and its reasoning tokens count against
    max_tokens. Every struct_llm call needs 2000+. At 100 it fails with
    "Failed to validate JSON".
"""

import from jaclang.byllm.lib { Model, ModelPool }

glob chat_llm = ModelPool(
    models=[
        Model(model_name="groq/llama-3.3-70b-versatile"),
        Model(model_name="groq/llama-3.1-8b-instant"),
        Model(model_name="groq/openai/gpt-oss-120b")
    ],
    strategy="fallback",
    num_retries=2
);

glob struct_llm = ModelPool(
    models=[
        Model(model_name="groq/openai/gpt-oss-120b"),
        Model(model_name="groq/openai/gpt-oss-20b")
    ],
    strategy="fallback",
    num_retries=2
);

glob fast_llm = ModelPool(
    models=[
        Model(model_name="groq/llama-3.1-8b-instant"),
        Model(model_name="groq/llama-3.3-70b-versatile")
    ],
    strategy="fallback",
    num_retries=2
);
