import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PreviewFigure, SavedFigure } from '../types';
import { validateRenderableFigurePayload } from '../lib/workflowUtils';

export type EditableFigure = PreviewFigure | SavedFigure;
export type FigureDraftValidation = ReturnType<typeof validateRenderableFigurePayload>;

export function cloneEditableFigure<T extends EditableFigure>(figure: T): T {
  return JSON.parse(JSON.stringify(figure)) as T;
}

export function setDraftTitle<T extends EditableFigure>(draft: T, title: string): T {
  return { ...draft, title };
}

export function setDraftTheme<T extends EditableFigure>(draft: T, theme: string): T {
  if (!('theme' in draft)) return draft;
  return { ...draft, theme } as T;
}

export function setDraftCaption<T extends EditableFigure>(draft: T, caption: string): T {
  if (draft.type === 'chart' && draft.chart) {
    return { ...draft, chart: { ...draft.chart, config: { ...draft.chart.config, caption } } };
  }
  if (draft.type === 'diagram' && draft.diagram) {
    return { ...draft, diagram: { ...draft.diagram, caption } };
  }
  if (draft.type === 'table' && draft.table) {
    return { ...draft, table: { ...draft.table, caption } };
  }
  return draft;
}

export function setDraftChartPoint<T extends EditableFigure>(
  draft: T,
  index: number,
  updates: { label?: string; value?: number },
): T {
  if (draft.type !== 'chart' || !draft.chart || !draft.chart.data[index]) return draft;
  return {
    ...draft,
    chart: {
      ...draft.chart,
      data: draft.chart.data.map((point, pointIndex) =>
        pointIndex === index ? { ...point, ...updates } : point
      ),
    },
  };
}

export function setDraftChartLayout<T extends EditableFigure>(
  draft: T,
  updates: { showLegend?: boolean; showLabels?: boolean },
): T {
  if (draft.type !== 'chart' || !draft.chart) return draft;
  return {
    ...draft,
    chart: {
      ...draft.chart,
      config: {
        ...draft.chart.config,
        ...updates,
      },
    },
  };
}

export function setDraftChartAxisLabel<T extends EditableFigure>(
  draft: T,
  axis: 'x' | 'y',
  label: string,
): T {
  if (draft.type !== 'chart' || !draft.chart) return draft;
  return {
    ...draft,
    chart: {
      ...draft.chart,
      config: {
        ...draft.chart.config,
        [axis === 'x' ? 'xAxisLabel' : 'yAxisLabel']: label,
      },
    },
  };
}

export function addDraftChartPoint<T extends EditableFigure>(draft: T): T {
  if (draft.type !== 'chart' || !draft.chart) return draft;
  return {
    ...draft,
    chart: {
      ...draft.chart,
      data: [
        ...draft.chart.data,
        { label: 'Nhãn mới', value: 0 },
      ],
    },
  };
}

export function removeDraftChartPoint<T extends EditableFigure>(draft: T, index: number): T {
  if (draft.type !== 'chart' || !draft.chart || draft.chart.data.length <= 1) return draft;
  return {
    ...draft,
    chart: {
      ...draft.chart,
      data: draft.chart.data.filter((_, i) => i !== index),
    },
  };
}

export function setDraftTableCell<T extends EditableFigure>(
  draft: T,
  rowIndex: number,
  columnKey: string,
  value: string,
): T {
  if (
    draft.type !== 'table'
    || !draft.table
    || !draft.table.rows[rowIndex]
    || !draft.table.columns.some(column => column.key === columnKey)
  ) return draft;
  return {
    ...draft,
    table: {
      ...draft.table,
      rows: draft.table.rows.map((row, index) =>
        index === rowIndex ? { ...row, [columnKey]: value } : row
      ),
    },
  };
}

export function addDraftTableRow<T extends EditableFigure>(draft: T): T {
  if (draft.type !== 'table' || !draft.table) return draft;
  const newRow: Record<string, string> = {};
  draft.table.columns.forEach(col => {
    newRow[col.key] = '';
  });
  return {
    ...draft,
    table: {
      ...draft.table,
      rows: [...draft.table.rows, newRow],
    },
  };
}

export function removeDraftTableRow<T extends EditableFigure>(draft: T, rowIndex: number): T {
  if (draft.type !== 'table' || !draft.table || draft.table.rows.length <= 1) return draft;
  return {
    ...draft,
    table: {
      ...draft.table,
      rows: draft.table.rows.filter((_, i) => i !== rowIndex),
    },
  };
}

export function setDraftDiagramNodeLabel<T extends EditableFigure>(
  draft: T,
  nodeId: string,
  label: string,
): T {
  if (draft.type !== 'diagram' || !draft.diagram || !draft.diagram.nodes.some(node => node.id === nodeId)) {
    return draft;
  }
  return {
    ...draft,
    diagram: {
      ...draft.diagram,
      nodes: draft.diagram.nodes.map(node => node.id === nodeId ? { ...node, label } : node),
    },
  };
}

export function prepareFigureDraftForApply<T extends EditableFigure>(
  draft: T,
  now = new Date().toISOString(),
): { figure?: T; validation: FigureDraftValidation } {
  const validation = validateRenderableFigurePayload(draft);
  if (!validation.valid) return { validation };

  const figure = cloneEditableFigure(draft);
  if (!('isPreview' in figure)) {
    figure.updatedAt = now;
  }
  return { figure, validation };
}

interface UseFigureEditingWorkflowArgs {
  activeFigure: EditableFigure | null;
  onApply: (figure: EditableFigure) => void;
}

export function useFigureEditingWorkflow({ activeFigure, onApply }: UseFigureEditingWorkflowArgs) {
  const [draft, setDraft] = useState<EditableFigure | null>(() =>
    activeFigure ? cloneEditableFigure(activeFigure) : null
  );
  const [dirty, setDirty] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const figureKey = activeFigure
    ? ('isPreview' in activeFigure ? `preview:${activeFigure.sourceCandidateUid}` : `saved:${activeFigure.id}`)
    : 'none';

  const prevFigureKey = useRef(figureKey);
  const prevActiveFigure = useRef(activeFigure);

  useEffect(() => {
    const keyChanged = figureKey !== prevFigureKey.current;
    const figureChanged = activeFigure !== prevActiveFigure.current;
    
    prevFigureKey.current = figureKey;
    prevActiveFigure.current = activeFigure;

    if (keyChanged) {
      setDraft(activeFigure ? cloneEditableFigure(activeFigure) : null);
      setDirty(false);
      setApplyError(null);
    } else if (figureChanged && !dirty) {
      setDraft(activeFigure ? cloneEditableFigure(activeFigure) : null);
      setApplyError(null);
    }
  }, [activeFigure, figureKey, dirty]);

  const updateDraft = useCallback((updater: (current: EditableFigure) => EditableFigure) => {
    setDraft(current => {
      if (!current) return current;
      const next = updater(current);
      if (next === current) return current;
      setDirty(true);
      setApplyError(null);
      return next;
    });
  }, []);

  const validation = useMemo<FigureDraftValidation>(
    () => draft ? validateRenderableFigurePayload(draft) : { valid: false, error: 'Không có hình để chỉnh sửa.' },
    [draft],
  );

  const cancel = useCallback(() => {
    setDraft(activeFigure ? cloneEditableFigure(activeFigure) : null);
    setDirty(false);
    setApplyError(null);
  }, [activeFigure]);

  const apply = useCallback(() => {
    if (!draft) return false;
    const result = prepareFigureDraftForApply(draft);
    if (!result.figure) {
      setApplyError(result.validation.error || 'Bản nháp không hợp lệ.');
      return false;
    }
    onApply(result.figure);
    setDraft(cloneEditableFigure(result.figure));
    setDirty(false);
    setApplyError(null);
    return true;
  }, [draft, onApply]);

  return {
    draft,
    dirty,
    validation,
    applyError,
    updateTitle: (title: string) => updateDraft(current => setDraftTitle(current, title)),
    updateTheme: (theme: string) => updateDraft(current => setDraftTheme(current, theme)),
    updateCaption: (caption: string) => updateDraft(current => setDraftCaption(current, caption)),
    updateChartLayout: (updates: { showLegend?: boolean; showLabels?: boolean }) =>
      updateDraft(current => setDraftChartLayout(current, updates)),
    updateChartAxisLabel: (axis: 'x' | 'y', label: string) =>
      updateDraft(current => setDraftChartAxisLabel(current, axis, label)),
    updateChartPoint: (index: number, updates: { label?: string; value?: number }) =>
      updateDraft(current => setDraftChartPoint(current, index, updates)),
    addChartPoint: () => updateDraft(current => addDraftChartPoint(current)),
    removeChartPoint: (index: number) => updateDraft(current => removeDraftChartPoint(current, index)),
    updateTableCell: (rowIndex: number, columnKey: string, value: string) =>
      updateDraft(current => setDraftTableCell(current, rowIndex, columnKey, value)),
    addTableRow: () => updateDraft(current => addDraftTableRow(current)),
    removeTableRow: (rowIndex: number) => updateDraft(current => removeDraftTableRow(current, rowIndex)),
    updateDiagramNodeLabel: (nodeId: string, label: string) =>
      updateDraft(current => setDraftDiagramNodeLabel(current, nodeId, label)),
    apply,
    cancel,
  };
}
