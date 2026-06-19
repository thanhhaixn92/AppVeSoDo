# Git Policy

## Branch naming
Use a scoped branch name:

```text
agent/<task-id-kebab>-<short-purpose>
```

Example:

```text
agent/r7-m1b-2-candidate-workflow
```

## Commit policy
- Do not commit during audit-only mode.
- Do not commit if tests have not been attempted and reported.
- Do not commit protected-area changes unless explicitly scoped.
- Prefer one implementation commit and one corrective commit if audit finds blockers.

Recommended commit format:

```text
<task-id>: <imperative summary>
```

Example:

```text
R7-M1B-2: extract useCandidateWorkflow
```

## PR / merge policy
- Do not create PR before audit-only has completed.
- Do not merge before human checkpoint.
- PR description must include the universal report fields from `.agent/core/universal-report-format.md`.

## Dirty worktree policy
Before checkpoint:
- report all changed files;
- confirm no forbidden files changed;
- include unresolved test/E2E status honestly.
