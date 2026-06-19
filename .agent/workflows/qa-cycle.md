# QA-Cycle Workflow Design

## 1. Purpose
- `/qa-cycle` is a guarded local workflow for Antigravity.
- It standardizes build/test/E2E/ZIP/report handoff.
- It does not merge main.
- It does not push to main.
- It does not replace AI Studio sync.

## 2. Inputs
- task id or short task name
- branch name
- expected allowed files
- expected validation level:
  - docs-only
  - build-unit
  - targeted-e2e
  - full-e2e
  - ai-studio-smoke-required

## 3. Stages
- preflight git status
- read governance files
- scope confirmation
- changed files audit
- lint (tsc --noEmit)
- build
- unit tests
- targeted E2E if required
- full E2E if required
- report generation
- ZIP creation if required
- AI Studio handoff prompt creation if required
- post-AI Studio main sync verification

## 4. Stop conditions
- dirty working tree at start
- protected files touched unexpectedly
- package/dependency files touched unexpectedly
- product source changed during docs-only task
- lint or tests not run but claimed PASS
- E2E blocked without BLOCKED_BY_ENVIRONMENT classification
- attempt to merge PR into main
- attempt to push to main
- missing AI Studio ZIP verification when required

## 5. Output statuses
- QA_CYCLE_READY_FOR_REVIEW
- QA_CYCLE_VALIDATION_PASS
- QA_CYCLE_VALIDATION_FAIL
- QA_CYCLE_BLOCKED_BY_ENVIRONMENT
- QA_CYCLE_SCOPE_VIOLATION
- QA_CYCLE_AI_STUDIO_HANDOFF_READY
- QA_CYCLE_MAIN_SYNC_VERIFIED

## 6. AI Studio integration
- Antigravity creates ZIP from clean commit.
- AI Studio imports ZIP, smokes app, syncs directly to `main`.
- Antigravity verifies `origin/main` by content, not commit ancestry.
- Hash mismatch is acceptable if content is verified.

## 7. Codex integration
- Codex may audit PR/branch/report only.
- Codex must not merge.
- Codex must not expand scope.

## 8. Prohibited behavior
- no direct `main` push
- no PR merge into `main`
- no auto-fix infinite loop
- no package changes unless explicit task allows
- no Firebase/auth/export/server changes unless explicit task allows
- no M1C/M1D/M1E expansion from QA-cycle
