# Universal Agent Workflow

## Standard flow
```text
IMPLEMENT
→ SELF-CHECK
→ AUDIT-ONLY
→ CORRECTIVE
→ RE-AUDIT
→ CHECKPOINT
```

## Implement
- Inspect relevant files first.
- Create a short plan.
- Make the smallest safe change.
- Do not touch unrelated files.
- Run targeted tests and full gates.

## Audit-only
- Read source.
- Run searches/tests.
- Report PASS/FAIL.
- Do not edit, format, stage, commit, or create PR.

## Corrective
- Fix only blockers found by audit.
- Do not expand scope.
- Do not begin the next milestone.

## Re-audit
- Independent verification after corrective.
- Must return `AUDIT_PASS` before the next phase.

## Human checkpoint
Required before:
- next milestone;
- PR/merge;
- upload/checkpoint transfer;
- architecture change.
