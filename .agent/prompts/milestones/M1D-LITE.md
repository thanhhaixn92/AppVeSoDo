# Task: M1D-LITE-IMPLEMENT-FIGURE-EDITING-WORKFLOW

**Mode:** implementation.

Before editing:
1. Read `AGENTS.md`.
2. Read `.agent/tasks/M1D-LITE.yml` as the task scope source of truth.
3. Summarize allowed files, forbidden files, acceptance criteria, and planned changed files.

Implement only M1D-Lite:
- create a typed reversible editing workflow around a deep-cloned active figure draft;
- support title, existing chart point label/value, table cell text, and diagram node label edits;
- provide explicit validated apply and cancel behavior;
- preserve candidate/source data and preview/saved metadata.

Do not implement M1E/M2/M3/M4. Do not touch FigureRenderer, export code or DOM contracts, candidateModel, the M1C adapter, candidate workflow, document workflow, AI chat, Firebase, server, or package files.

Run targeted figure-editing tests, candidate adapter regression tests, candidateModel tests, documentWorkflow tests, lint, build, and the full unit suite. Attempt E2E only under the repository policy and report `BLOCKED_BY_ENVIRONMENT` honestly when Chromium installation or launch is blocked.

After implementation, perform self-check and request audit. Do not start the next milestone.
