# Universal Report Format

Every task must end with a structured report.

## Prompt Traceability Block (Required for all operational reports)

Every operational report that responds to a scoped prompt must include the following
block in its header. A report that does not echo `prompt_id` is **incomplete** and
must be corrected before being used for implementation, review, AI Studio handoff, or task closure.

```yaml
prompt:
  prompt_id: ""       # Echo the PROMPT_ID from the prompt header exactly
  target_agent: ""    # CODEX | ANTIGRAVITY | AI_STUDIO | CHATGPT_PROJECT
  task_id: ""
  mode: ""
  status: ""
  supersedes: ""
  related_report: ""
  source_assumption: ""

traceability:
  prompt_registry_entry: ""  # YES if prompt is registered in .agent/context/prompt-registry.yml
  source_basis: ""           # e.g. "cloned latest main aede9bf"
  latest_commit_or_source_hash: ""
  changed_files: []
  protected_scope_check: ""  # CLEAN or list violations
```

> If a report responds to an operational prompt but does not echo `prompt_id`, the report
> is **incomplete** and must be corrected before being used for implementation, review,
> AI Studio handoff, or closure.

---

## Standard Report Fields

```yaml
phase: ""
status: "PASS | PARTIAL | FAIL | AUDIT_COMPLETE"
mode: "implement | audit-only | corrective | checkpoint"
code_changed: true/false
branch: ""
latest_commit: ""

changed_files: []

commands:
  targeted_test: ""
  lint: ""
  build: ""
  unit_test: ""
  e2e: ""

not_changed:
  export_dom_contract: true
  renderer_dom_contract: true
  firebase: true
  real_ai_call: true
  server_boundary: true

risks_remaining: []

next_recommended_task: ""
```

Audit-only reports must include:

```yaml
audit_result: "AUDIT_PASS | AUDIT_FAIL"
readiness: "READY | BLOCKED"
audit_only_confirmed: true
files_modified: 0
files_created: 0
files_deleted: 0
commit_created: false
pr_created: false
```
