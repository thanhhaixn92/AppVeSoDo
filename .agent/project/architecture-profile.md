# Architecture Profile

Current architecture:
- React/TypeScript frontend.
- App.tsx remains main orchestration shell.
- useDocumentWorkflow owns document/raw workflow after M1B-1.
- useCandidateWorkflow owns candidate workflow after M1B-2.
- candidateModel.ts owns candidate policy after M1A.
- candidateToRenderableAdapter.ts acts as the M1C adapter boundary.
- useFigureEditingWorkflow owns the M1D-LITE typed reversible editing workflow.
- localStorage/workspace draft persistence only.
- Firebase not implemented.
- real Gemini pipeline not implemented.
- export depends on DOM contract and remains frozen.

## Future Architecture Goal (M1.5 Target)

- **Dataset-first Target:** The monolithic `VisualCandidate` structure currently conflates data extraction, visualization type, renderable payload, and provenance. The M1.5 model migration will decouple these into `DatasetCandidate`, `FigureRecommendation`, `FigureTypeOption`, and `RenderableFigure`.
