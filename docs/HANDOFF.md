# VMS Navigator / Academic Figure Creator - HANDOFF

## Project Checkpoints Completed
* **R3D**: Candidate Contract + Parser Integrity + Canvas & Action Safety.
* **R3E**: Command Rule+AI Parallel + Calibration.
* **R4-SAFE**: Canvas-first UI + Theme Renderer + Export Truthfulness + Quality Check.
* **R4-SAFE-Fixup (1, 2, 3)**: Runtime UI/CSS/Layout Regression, Visual Theme Contrast, Canvas Hierarchy, UI Polish & Usability Clarity.
* **R5-SAFE**: Tests + Cleanup + Docs.
* **R5-Fixup-3A**: PRD Candidate Semantics + Chart Styling + Preview Stability.

## Invariants (DO NOT BREAK)
1. **R3D Invariant**: Candidate is only applied if `SavedFigure` is valid; validation must pass; canvas must render real data (no blanks/fake views).
2. **R3E Invariant**: All data changes must go through `pendingProposal` and the explicit Apply/Cancel cycle.
3. **R4 Invariant**: Export support must be truthful (SVG/PDF/TikZ buttons are disabled if not natively implemented with real data).
4. **General**: No unrequested dependencies added (e.g., `react-konva`, `html2canvas`, `jsPDF`).

## Known Limits
* `test_framework`: `not_available` (No test runner like Jest/Vitest currently installed).
* `undo/redo`: Not fully implemented (history state present but no UI bindings to revert gracefully).
* `port`: Default Vite port may conflict with other background tasks (e.g., `3000` is in use, fallback to `5173`).

## Manual Smoke Checklist
- [x] Run `npm run lint` and verify it passes.
- [x] Run `npm run build` and verify it succeeds.
- [x] Run `npm run dev` and open in browser.
- [x] Verify UI loads without blank screens.
- [x] Select a template and verify it renders correctly in the Canvas-first layout.
- [x] Test AI command generation via command bar (e.g., "đổi màu xanh").
- [x] Test Apply/Cancel cycle for AI commands.
- [x] Open Export Modal and check that only supported formats (PNG) are active by default for SVG-based charts.

## Export Truthfulness Update
- PNG export is supported only when real export logic is available.
- SVG/PDF/TikZ remain disabled or marked coming soon unless truthfully implemented.
- Do not add html2canvas/jsPDF or fake SVG/PDF/TikZ output.
