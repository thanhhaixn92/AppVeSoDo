# Universal Report Format

Every task must end with a structured report.

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
