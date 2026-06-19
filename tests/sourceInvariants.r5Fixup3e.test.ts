import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
const selectionHookSource = readSource('src/hooks/useFigureSelection.ts');
const normalizedSelectionHookSource = selectionHookSource.replace(/\s+/g, '');
describe('R5-Fixup-3E source invariants', () => {
  const appSource = readSource('src/App.tsx');
  const rendererSource = readSource('src/components/FigureRenderer.tsx');
  const combinedSource = `${appSource}\n${rendererSource}`;

  describe('fit-to-view magic size removal', () => {
    it('does not reintroduce forbidden fixed measurement sizes', () => {
      expect(combinedSource).not.toContain('max-w-[920px]');
      expect(combinedSource).not.toContain('min-w-[920px]');
      expect(combinedSource).not.toContain('window.innerWidth * 0.5');
      expect(combinedSource).not.toMatch(/\b920\b/);
      expect(combinedSource).not.toMatch(/\b650\b/);
    });

    it('keeps getBoundingClientRect based measurement available', () => {
      expect(combinedSource).toContain('getBoundingClientRect');
    });
  });

  describe('FigureRenderer forwarded ref placement', () => {
    it('uses forwardRef and attaches the forwarded ref to one content wrapper', () => {
      expect(rendererSource).toContain('forwardRef');
      expect(rendererSource).toMatch(/ref={ref}|ref={forwardedRef}|ref={contentRef}/);
    });

    it('does not attach a ref to the root full-size wrapper', () => {
      const suspiciousSameElementPatterns = [
        /<[^>]*className=.*\bw-full\b.*\bh-full\b[^>]*ref=\{[^}]+\}/s,
      ];
      for (const pattern of suspiciousSameElementPatterns) {
        expect(rendererSource).not.toMatch(pattern);
      }
    });

    it('keeps caption or footer content inside the rendered output source', () => {
      expect(rendererSource).toMatch(/caption|footer/i);
    });
  });

  describe('saved and preview selection invariants', () => {
    it('keeps unified saved figure selection handler', () => {
      expect(appSource).toContain('handleSelectActiveFigure');
      expect(appSource).toContain('selectActiveFigure(id)');
      expect(selectionHookSource).toContain('selectActiveFigure');
      expect(normalizedSelectionHookSource).toContain('setSelectedFigureId(id)');
      expect(normalizedSelectionHookSource).toContain("setCurrentFigureId(id||'')");
      expect(normalizedSelectionHookSource).toContain('setPreviewFigure(null)');
      expect(normalizedSelectionHookSource).toContain('setSelectedNodeId(null)');
      expect(normalizedSelectionHookSource).toContain('setSelectedConnectionId(null)');
    });

    it('keeps preview selection isolated from saved figure selection', () => {
      const normalizedAppSource = appSource.replace(/\s+/g, '');

      expect(appSource).toContain('handlePreviewCandidate');
      expect(appSource).toContain('clearSavedSelectionForPreview()');
      expect(selectionHookSource).toContain('clearSavedSelectionForPreview');
      expect(normalizedSelectionHookSource).toContain('setSelectedFigureId(null)');
      expect(normalizedSelectionHookSource).toContain("setCurrentFigureId('')");
      expect(normalizedSelectionHookSource).toContain('setSelectedNodeId(null)');
      expect(normalizedSelectionHookSource).toContain('setSelectedConnectionId(null)');
    });

    it('keeps active command target and editable context guard', () => {
      expect(appSource).toContain('getActiveCommandTarget');
      expect(appSource).toMatch(/hasEditableContext[\s\S]*validateRenderableFigurePayload/);
    });
  });

  describe('full renderable validator usage', () => {
    it('keeps validateRenderableFigurePayload wired into isRenderableTarget', () => {
      expect(appSource).toContain('validateRenderableFigurePayload');
      expect(appSource).toMatch(/isRenderableTarget[\s\S]*validateRenderableFigurePayload/);
    });
  });
});
