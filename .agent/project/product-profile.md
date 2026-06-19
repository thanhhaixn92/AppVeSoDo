# Product Profile

SO DO APP / Academic Figure Creator is a web application for creating, editing, standardizing, previewing, saving, and exporting academic figures, diagrams, charts, tables, timelines, matrices, and visual explanations based on standardized templates.

The product uses AI-assisted data and document understanding to help users transform raw data, pasted text, uploaded documents, or structured inputs into visual candidates.

Candidate generation is only one stage of the product pipeline. It is not the final product goal.

## Full product pipeline

```text
Document/Data
→ preserve raw input
→ DatasetCandidate
→ FigureRecommendation / FigureTypeOption
→ RenderableFigure
→ edit through properties panel or AI chat
→ preview
→ save
→ export
```

## Dataset-first Target Model

The future architecture (M1.5 target) shifts from a monolithic `VisualCandidate` to a dataset-first model:
- `DatasetCandidate`: Extracted data values and structure.
- `FigureRecommendation`: AI-suggested mappings and types.
- `FigureTypeOption`: The specific chart, diagram, or table type chosen.
- `RenderableFigure`: The active payload configured for rendering.

The `VisualCandidate` model currently conflates these layers and will be decoupled in the M1.5 Dataset-first model migration.

## Core product goal

Build an Academic Figure Creator that helps users transform data or documents into publication-ready academic visuals through candidate selection, template-based rendering, deep manual editing, AI chat-assisted editing, preview, save, and export.

## Product modules

1. Input & Data Understanding
   - paste/upload data or documents;
   - preserve raw input;
   - parse blocks;
   - AI/rule-based analysis;
   - generate visual candidates.

2. Candidate Workflow
   - list candidates;
   - candidate status: ready / needs_review / needs_mapping / not_ready;
   - source trace;
   - confidence and rationale;
   - candidate selection.

3. Template Rendering Engine
   - convert candidate into a renderable figure model;
   - render charts/diagrams/tables/timelines/matrices using standardized templates;
   - preserve spacing, typography, layout, theme, and academic/professional style;
   - avoid toy/demo chart output.

4. Figure Editing System
   - properties panel;
   - dataset editor;
   - label editor;
   - theme selector;
   - color/style controls;
   - layout controls;
   - typography and size controls;
   - notes/source controls.

5. AI Chat Editing
   - convert natural-language user instructions into safe figure edit proposals;
   - support preview/apply/cancel;
   - avoid destructive automatic figure changes.

6. Preview / Save / Export
   - preview figure accurately;
   - save figure;
   - export while preserving template and output quality.

## Scope clarification for current milestone

This product goal clarification does not expand R7-M1B-2 scope.

R7-M1B-2 remains limited to extracting candidate workflow from `src/App.tsx` into `src/hooks/useCandidateWorkflow.ts`.
