# Task: M1C-IMPLEMENT-CANDIDATE-TO-RENDERABLE-ADAPTER

**Mode**: implementation.

**Before implementing**:
1. Read `AGENTS.md` to understand your agent role and restrictions in this phase.
2. Read `.agent/tasks/M1C.yml` which is the ONLY source of truth for the scope and files of this task.
3. Keep the single product goal in mind: this repository is an Academic Figure Creator. Candidate generation is just an intermediate state. M1C creates the boundary where that candidate turns into a final, renderable structure.

**Implementation constraints**:
- Summarize scope before editing.
- Implement only M1C. Do not start M1D/M1E/M2/M3/M4.
- NEVER touch `src/components/FigureRenderer.tsx` or export domains.
- DO NOT change candidate policy (`src/analysis/candidateModel.ts`).
- DO NOT change document workflow (`src/hooks/useDocumentWorkflow.ts`).
- Provide targeted unit tests for `candidateToRenderableAdapter.ts`.

After implementation, perform self-check and request audit.
