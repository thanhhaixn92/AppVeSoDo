# AGENTS.md — SO DO APP Agent Harness

## Purpose
This file is the routing instruction for AI coding agents working on SO DO APP / Academic Figure Creator.

Do not read the whole repository first. Load context progressively.

## Required context loading order
1. `.agent/context/project-state.yml`
2. `.agent/context/codebase-map.yml`
3. `.agent/context/module-index.yml`
4. `.agent/context/issue-memory.yml`
5. `.agent/context/root-cause-library.yml`
6. `.agent/context/file-ownership.yml`
7. `.agent/context/milestone-acceptance.yml`
8. `.agent/project/commands.md`
9. `.agent/project/protected-areas.md`
10. Task file under `.agent/tasks/` when present.
11. Task-specific prompt under `.agent/prompts/milestones/` when present.
12. Task-specific source files only.

## Current checkpoint
```yaml
governance_version: "Harness v1.1.2"
governance_update: "COMPLETE"
current_mode: "READY_FOR_RISK_M1D_006_CORRECTIVE"
M1A: AUDIT_PASS
M1B-1: AUDIT_PASS
M1B-2: AUDIT_PASS
M1C: AUDIT_PASS
M1D-LITE: AUDIT_PASS
latest_verified_commit: "4257533"
```

## Product goal clarification
SO DO APP / Academic Figure Creator is not only a long-document analysis assistant.

AI-assisted document/data understanding and candidate generation are early stages of the product pipeline, not the final product output.

The full product pipeline is:

```text
input data/document
→ preserve raw input
→ generate visual candidates
→ select candidate
→ convert to renderable figure model
→ render with academic/professional templates
→ edit through properties panel or AI chat
→ preview
→ save
→ export
```

Do not treat candidate generation as the final product goal.

For M1C, this clarification means we must define the adapter boundary from candidate to renderable figure model, but M1C remains strictly an adapter layer.

Do not implement template engine, properties panel, AI chat editing, persistence, or export changes in M1C.

## Single source of truth rule
Do not duplicate or override task scope in ad hoc prompts.

- Current state: `.agent/context/project-state.yml`
- Task scope: `.agent/tasks/<task-id>.yml`
- Known issues: `.agent/context/issue-memory.yml`
- Root-cause patterns: `.agent/context/root-cause-library.yml`
- File ownership: `.agent/context/file-ownership.yml`
- Protected areas: `.agent/project/protected-areas.md`
- Product profile: `.agent/project/product-profile.md`

## Mandatory workflow
Implementation tasks must follow:

```text
IMPLEMENT
→ SELF-CHECK
→ AUDIT-ONLY
→ CORRECTIVE if FAIL
→ RE-AUDIT
→ HUMAN CHECKPOINT
```

Do not skip audit-only after implementation or corrective work.

## QA and Tool-Routing Policy
- ChatGPT Project is the coordination, audit, prompt-writing, and decision-synthesis center.
- Codex is preferred for audit-only, implementation planning, and report-only PRs.
- Antigravity is preferred for local code implementation, Playwright E2E, browser verification, screenshots/traces, and fix-retest cycles.
- Google AI Studio is used for ZIP import, preview smoke, Gemini prompt/runtime checks, and UI comparison. It is not the primary repo refactor channel.
- User-facing workflows require Playwright E2E or browser verification before final PASS.
- Static analysis and unit tests alone may support PARTIAL_PASS but not final PASS for UI/candidate/canvas flows.
- Do not claim E2E PASS unless Playwright/browser tests were actually run.
- If browser runtime is unavailable, report BLOCKED_BY_ENVIRONMENT_BROWSER_MISSING with exact command/error.

## Antigravity Commands
- Antigravity 2.0 has 4 primary built-in slash commands for agent behavior: /goal, /grill-me, /schedule, /browser.
- Do not assume /test, /debug, or /create are built-in defaults.
- Treat /test, /debug, /create as custom workflows/skills if they exist.
- Custom workflows may be defined under .agents/workflows/ when needed.
- For this project, use /grill-me when the task is ambiguous, /goal when scope is clear, /browser for interactive UI/browser verification, and Playwright for repeatable E2E.

## Protected scope
Do not touch these unless explicitly scoped:
- export DOM contract;
- `data-export-target`;
- renderer wrappers;
- SVG/PDF/PNG export behavior;
- Firebase;
- Auth/user/permission;
- real AI/Gemini runtime;
- server boundary;
- dependency/package changes;
- candidate model policy after M1A unless explicitly requested;
- document workflow after M1B-1 unless explicitly requested.

## Branch and Merge Policy
- **Main Branch Sync Policy**: GitHub `main` is strictly synced and owned by Google AI Studio.
- **No Direct Merges**: Antigravity agents must not merge PRs or push directly to `main`.
- **Branch Purpose**: Antigravity branches and PRs (e.g. PR #4) are for local implementation, backup, and code review reference only.
- **Safe Workflow**:
  1. Antigravity implements and tests locally.
  2. Antigravity creates a ZIP payload.
  3. AI Studio imports the ZIP, performs smoke tests, and syncs to `main`.
  4. Antigravity fetches `main` afterward.
- **Review Constraints**: Codex review is strictly an audit-only step and does not grant merge authority to `main`.

## Commands
See `.agent/project/commands.md`.

## E2E rule
Do not claim E2E PASS unless Chromium E2E actually runs and passes.
If browser installation or launch is blocked by environment/proxy/system capability, report:
`BLOCKED_BY_ENVIRONMENT`.

## Report format
Use `.agent/core/universal-report-format.md`.

## Git policy
Use `.agent/rules/git-policy.md`.

## Prompt Registry
When `.agent/context/prompt-registry.yml` exists, agents must read it for operational prompt identity,
revision history, supersession, and report traceability rules before acting on any scoped prompt.
Every report responding to a scoped operational prompt must echo the `PROMPT_ID` it is acting on.

## Stop condition
Stop and report instead of guessing when:
- scope expands;
- protected areas must be changed;
- tests fail after allowed repair loops;
- E2E is environment-blocked;
- product decision is required;
- next phase would start implicitly.
