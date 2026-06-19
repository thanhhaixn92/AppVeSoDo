# AI Studio Handoff - R6C Stable Checkpoint

## Status

- R6B Final Summary: PASS.
- R6C Dead Import Cleanup: PASS.
- R6C Vietnamese Menu Copy: PASS.
- lint/build/test before packaging: PASS.
- Manual browser QA: pending.

## Major fixes included

### 1. Property Update Chain

- `usePropertyUpdateActions`.
- Immediate history.
- Session history.
- Preview history guard.
- Warning-only validation.

### 2. Export Target Chain

- Scoped active export root/SVG.
- Removed duplicate static export IDs.
- Validation before export.

### 3. Quality Chain

- `useFigureQuality`.
- Renderable gate before quality score.
- Header and FigureAuditPanel share quality read model.
- Invalid figure does not show usable score.

### 4. Cleanup

- Removed dead App imports/state.
- Vietnamese copy cleanup for sidebar tooltip.

## Known non-blocking deferred items

- Manual QA on browser local.
- Export visual/e2e tests.
- Quality unit tests.
- App.tsx size reduction/refactor.
- Export handlers hook extraction.
- PDF export UX may rely on OS print dialog.

## How to test

1. Run `npm install` if dependencies are not installed.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Run `npm test`.
5. Run `npm run dev`.
6. Open the local URL.
7. Test journeys:
   - create/preview/apply;
   - saved figure selection;
   - property edit + undo;
   - export SVG/PNG/PDF/TikZ;
   - quality ready/invalid states;
   - menu Vietnamese copy.
