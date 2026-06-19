// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  cloneEditableFigure,
  prepareFigureDraftForApply,
  setDraftChartPoint,
  setDraftDiagramNodeLabel,
  setDraftTableCell,
  setDraftTitle,
  useFigureEditingWorkflow,
} from '../src/hooks/useFigureEditingWorkflow';
import { PreviewFigure, SavedFigure } from '../src/types';

const createdAt = '2026-01-01T00:00:00.000Z';
const savedChart: SavedFigure = {
  id: 'fig-1',
  title: 'Chart',
  type: 'chart',
  theme: 'apa',
  sourceCandidateUid: 'candidate-1',
  createdAt,
  chart: {
    config: { type: 'bar', title: 'Chart', xAxisLabel: 'X', yAxisLabel: 'Y', showGrid: true, isDoubleColumn: false, caption: '' },
    data: [{ label: 'A', value: 1 }],
  },
};

type EditingWorkflow = ReturnType<typeof useFigureEditingWorkflow>;

function renderEditingWorkflow(activeFigure: SavedFigure | PreviewFigure, onApply: (figure: SavedFigure | PreviewFigure) => void) {
  const container = document.createElement('div');
  const root: Root = createRoot(container);
  let workflow: EditingWorkflow | undefined;

  function Harness({ active }: { active: SavedFigure | PreviewFigure }) {
    workflow = useFigureEditingWorkflow({ activeFigure: active, onApply });
    return null;
  }

  act(() => root.render(createElement(Harness, { active: activeFigure })));
  return {
    get current() {
      if (!workflow) throw new Error('Workflow did not render.');
      return workflow;
    },
    rerender: (newFigure: SavedFigure | PreviewFigure) => {
      act(() => root.render(createElement(Harness, { active: newFigure })));
    },
    unmount: () => act(() => root.unmount()),
  };
}

describe('figure editing workflow', () => {
  it('creates a deep-cloned draft and leaves source/candidate payload unchanged', () => {
    const draft = cloneEditableFigure(savedChart);
    const edited = setDraftChartPoint(draft, 0, { label: 'Edited', value: 2 });
    expect(draft).not.toBe(savedChart);
    expect(draft.chart).not.toBe(savedChart.chart);
    expect(savedChart.chart?.data[0]).toEqual({ label: 'A', value: 1 });
    expect(edited.chart?.data[0]).toEqual({ label: 'Edited', value: 2 });
  });

  it('supports title edit and cancel by restoring a fresh source clone', () => {
    const edited = setDraftTitle(cloneEditableFigure(savedChart), 'Edited title');
    expect(edited.title).toBe('Edited title');
    expect(cloneEditableFigure(savedChart).title).toBe('Chart');
  });

  it('edits existing chart points without changing chart structure', () => {
    const edited = setDraftChartPoint(cloneEditableFigure(savedChart), 0, { label: 'B', value: 4 });
    expect(edited.chart?.data).toHaveLength(1);
    expect(edited.chart?.config.type).toBe('bar');
  });

  it('edits existing table cells without changing table structure', () => {
    const table: SavedFigure = {
      id: 'table', title: 'Table', type: 'table', theme: 'apa', createdAt,
      table: { columns: [{ key: 'a', header: 'A', align: 'left' }], rows: [{ a: '1' }], caption: '' },
    };
    const edited = setDraftTableCell(cloneEditableFigure(table), 0, 'a', '2');
    expect(edited.table?.rows).toEqual([{ a: '2' }]);
    expect(edited.table?.columns).toEqual(table.table?.columns);
  });

  it('edits existing diagram node labels without changing IDs, connections, or layout', () => {
    const diagram: SavedFigure = {
      id: 'diagram', title: 'Diagram', type: 'diagram', theme: 'apa', createdAt,
      diagram: { nodes: [{ id: 'n1', type: 'rect', label: 'A', x: 1, y: 2, w: 3, h: 4 }], connections: [], caption: '' },
    };
    const edited = setDraftDiagramNodeLabel(cloneEditableFigure(diagram), 'n1', 'Edited');
    expect(edited.diagram?.nodes[0]).toEqual({ id: 'n1', type: 'rect', label: 'Edited', x: 1, y: 2, w: 3, h: 4 });
    expect(edited.diagram?.connections).toEqual([]);
  });

  it('blocks invalid draft apply', () => {
    const invalid = { ...savedChart, chart: undefined };
    const result = prepareFigureDraftForApply(invalid);
    expect(result.figure).toBeUndefined();
    expect(result.validation.valid).toBe(false);
  });

  it('preserves saved metadata and updates updatedAt on apply', () => {
    const result = prepareFigureDraftForApply(setDraftTitle(cloneEditableFigure(savedChart), 'Edited'), '2026-02-01T00:00:00.000Z');
    expect(result.figure).toMatchObject({
      id: 'fig-1', createdAt, theme: 'apa', sourceCandidateUid: 'candidate-1',
      updatedAt: '2026-02-01T00:00:00.000Z', title: 'Edited',
    });
  });

  it('preserves preview sourceCandidateUid and isPreview on apply', () => {
    const preview: PreviewFigure = {
      sourceCandidateUid: 'candidate-preview', title: 'Preview', type: 'chart', chart: savedChart.chart, isPreview: true,
    };
    const result = prepareFigureDraftForApply(setDraftTitle(cloneEditableFigure(preview), 'Edited preview'));
    expect(result.figure).toMatchObject({ sourceCandidateUid: 'candidate-preview', isPreview: true, title: 'Edited preview' });
  });

  it('applies and cancels title edits with correct dirty state transitions', () => {
    const applied: Array<SavedFigure | PreviewFigure> = [];
    const hook = renderEditingWorkflow(savedChart, figure => applied.push(figure));
    expect(hook.current.dirty).toBe(false);

    act(() => hook.current.updateTitle('Cancelled title'));
    expect(hook.current.dirty).toBe(true);
    expect(hook.current.draft?.title).toBe('Cancelled title');
    act(() => hook.current.cancel());
    expect(hook.current.dirty).toBe(false);
    expect(hook.current.draft?.title).toBe('Chart');

    act(() => hook.current.updateTitle('Applied title'));
    act(() => expect(hook.current.apply()).toBe(true));
    expect(applied).toHaveLength(1);
    expect(applied[0].title).toBe('Applied title');
    expect(hook.current.dirty).toBe(false);
    hook.unmount();
  });

  it('applies and cancels chart point edits', () => {
    const applied: Array<SavedFigure | PreviewFigure> = [];
    const hook = renderEditingWorkflow(savedChart, figure => applied.push(figure));
    act(() => hook.current.updateChartPoint(0, { label: 'Cancelled', value: 2 }));
    act(() => hook.current.cancel());
    expect(hook.current.draft?.chart?.data[0]).toEqual({ label: 'A', value: 1 });
    act(() => hook.current.updateChartPoint(0, { label: 'Applied', value: 3 }));
    act(() => hook.current.apply());
    expect(applied[0].chart?.data[0]).toEqual({ label: 'Applied', value: 3 });
    hook.unmount();
  });

  it('supports adding and removing chart points with minimum guard', () => {
    const applied: Array<SavedFigure | PreviewFigure> = [];
    const hook = renderEditingWorkflow(savedChart, figure => applied.push(figure));
    act(() => hook.current.addChartPoint());
    expect(hook.current.draft?.chart?.data.length).toBe(2);
    expect(hook.current.draft?.chart?.data[1]).toEqual({ label: 'Nhãn mới', value: 0 });
    
    act(() => hook.current.removeChartPoint(1));
    expect(hook.current.draft?.chart?.data.length).toBe(1);
    
    // Minimum guard test
    act(() => hook.current.removeChartPoint(0));
    expect(hook.current.draft?.chart?.data.length).toBe(1); // Should not go to 0
    hook.unmount();
  });

  it('supports updating chart axis labels', () => {
    const applied: Array<SavedFigure | PreviewFigure> = [];
    const hook = renderEditingWorkflow(savedChart, figure => applied.push(figure));
    act(() => hook.current.updateChartAxisLabel('x', 'New X Axis'));
    expect(hook.current.draft?.chart?.config.xAxisLabel).toBe('New X Axis');
    act(() => hook.current.apply());
    expect(applied[0].chart?.config.xAxisLabel).toBe('New X Axis');
    hook.unmount();
  });

  it('applies and cancels table cell edits', () => {
    const table: SavedFigure = {
      id: 'table', title: 'Table', type: 'table', theme: 'apa', createdAt,
      table: { columns: [{ key: 'a', header: 'A', align: 'left' }], rows: [{ a: '1' }], caption: '' },
    };
    const applied: Array<SavedFigure | PreviewFigure> = [];
    const hook = renderEditingWorkflow(table, figure => applied.push(figure));
    act(() => hook.current.updateTableCell(0, 'a', 'cancelled'));
    act(() => hook.current.cancel());
    expect(hook.current.draft?.table?.rows[0].a).toBe('1');
    act(() => hook.current.updateTableCell(0, 'a', 'applied'));
    act(() => hook.current.apply());
    expect(applied[0].table?.rows[0].a).toBe('applied');
    hook.unmount();
  });

  it('supports adding and removing table rows with minimum guard', () => {
    const table: SavedFigure = {
      id: 'table', title: 'Table', type: 'table', theme: 'apa', createdAt,
      table: { columns: [{ key: 'a', header: 'A', align: 'left' }], rows: [{ a: '1' }], caption: '' },
    };
    const applied: Array<SavedFigure | PreviewFigure> = [];
    const hook = renderEditingWorkflow(table, figure => applied.push(figure));
    
    act(() => hook.current.addTableRow());
    expect(hook.current.draft?.table?.rows.length).toBe(2);
    expect(hook.current.draft?.table?.rows[1]).toEqual({ a: '' });
    
    act(() => hook.current.removeTableRow(1));
    expect(hook.current.draft?.table?.rows.length).toBe(1);
    
    // Minimum guard test
    act(() => hook.current.removeTableRow(0));
    expect(hook.current.draft?.table?.rows.length).toBe(1); // Should not go to 0
    hook.unmount();
  });

  it('applies and cancels diagram node label edits', () => {
    const diagram: SavedFigure = {
      id: 'diagram', title: 'Diagram', type: 'diagram', theme: 'apa', createdAt,
      diagram: { nodes: [{ id: 'n1', type: 'rect', label: 'A', x: 1, y: 2, w: 3, h: 4 }], connections: [], caption: '' },
    };
    const applied: Array<SavedFigure | PreviewFigure> = [];
    const hook = renderEditingWorkflow(diagram, figure => applied.push(figure));
    act(() => hook.current.updateDiagramNodeLabel('n1', 'Cancelled'));
    act(() => hook.current.cancel());
    expect(hook.current.draft?.diagram?.nodes[0].label).toBe('A');
    act(() => hook.current.updateDiagramNodeLabel('n1', 'Applied'));
    act(() => hook.current.apply());
    expect(applied[0].diagram?.nodes[0].label).toBe('Applied');
    hook.unmount();
  });

  it('blocks invalid hook apply, exposes validation/error state, and does not call onApply', () => {
    const invalid = { ...savedChart, chart: undefined };
    const applied: Array<SavedFigure | PreviewFigure> = [];
    const hook = renderEditingWorkflow(invalid, figure => applied.push(figure));
    expect(hook.current.validation.valid).toBe(false);
    act(() => expect(hook.current.apply()).toBe(false));
    expect(applied).toHaveLength(0);
    expect(hook.current.applyError).toBeTruthy();
    hook.unmount();
  });

  it('does not mark the draft dirty for out-of-range no-op edits', () => {
    const hook = renderEditingWorkflow(savedChart, () => {});
    act(() => hook.current.updateChartPoint(99, { label: 'No-op' }));
    expect(hook.current.dirty).toBe(false);
    hook.unmount();
  });

  it('clean draft refreshes when external same-identity active figure changes', () => {
    const hook = renderEditingWorkflow(savedChart, () => {});
    expect(hook.current.draft?.title).toBe('Chart');
    expect(hook.current.dirty).toBe(false);

    // External change
    const updatedChart = { ...savedChart, title: 'External Update' };
    hook.rerender(updatedChart);

    expect(hook.current.draft?.title).toBe('External Update');
    expect(hook.current.dirty).toBe(false);
    hook.unmount();
  });

  it('dirty draft is not silently overwritten by external same-identity active figure changes', () => {
    const hook = renderEditingWorkflow(savedChart, () => {});
    
    // User makes a change
    act(() => hook.current.updateTitle('User Edit'));
    expect(hook.current.dirty).toBe(true);

    // External change occurs
    const updatedChart = { ...savedChart, title: 'External Update' };
    hook.rerender(updatedChart);

    // Draft should remain the user's edit
    expect(hook.current.draft?.title).toBe('User Edit');
    expect(hook.current.dirty).toBe(true);
    hook.unmount();
  });

  it('completely different active figure resets the draft even if dirty', () => {
    const hook = renderEditingWorkflow(savedChart, () => {});
    act(() => hook.current.updateTitle('User Edit'));
    expect(hook.current.dirty).toBe(true);

    const newFigure: SavedFigure = { ...savedChart, id: 'new-fig-2', title: 'New Figure' };
    hook.rerender(newFigure);

    expect(hook.current.draft?.title).toBe('New Figure');
    expect(hook.current.dirty).toBe(false);
    hook.unmount();
  });
});
