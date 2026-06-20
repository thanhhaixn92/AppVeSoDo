// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { useCandidateWorkflow } from '../src/hooks/useCandidateWorkflow';
import { RankedVisualCandidate } from '../src/types';
import { adaptCandidateToRenderable } from '../src/analysis/candidateToRenderableAdapter';
import { buildPreviewFigureFromCandidate, buildSavedFigureFromCandidate } from '../src/lib/workflowUtils';
import { selectDatasetFirstGroups, splitAndSortRecommendations } from '../src/analysis/datasetCandidateSelectors';
import { VisualCandidate } from '../src/types';


type CandidateWorkflow = ReturnType<typeof useCandidateWorkflow>;

const chart = {
  config: { type: 'bar', title: 'Chart', xAxisLabel: 'X', yAxisLabel: 'Y', showGrid: true, isDoubleColumn: false, caption: '' },
  data: [{ label: 'A', value: 1 }],
};

function candidate(overrides: Partial<RankedVisualCandidate> = {}): RankedVisualCandidate {
  return {
    id: 'candidate-id',
    uid: 'candidate-uid',
    title: 'Candidate chart',
    visualType: 'chart',
    uiStatus: 'ready',
    data: { type: 'chart', chart },
    ...overrides,
  } as RankedVisualCandidate;
}

function renderCandidateWorkflow(overrides: Record<string, unknown> = {}) {
  const container = document.createElement('div');
  const root: Root = createRoot(container);
  let workflow: CandidateWorkflow | undefined;

  function Harness() {
    workflow = useCandidateWorkflow({
      initialDraft: {},
      theme: 'apa',
      geminiApiKey: '',
      ...overrides,
    });
    return null;
  }

  act(() => root.render(createElement(Harness)));
  return {
    get current() {
      if (!workflow) throw new Error('Workflow did not render.');
      return workflow;
    },
    unmount: () => act(() => root.unmount()),
  };
}

describe('candidate workflow canvas orchestration', () => {
  it('builds a valid preview before requesting navigation and exposes it immediately', () => {
    const onPreviewRequested = vi.fn();
    const hook = renderCandidateWorkflow({ onPreviewRequested });

    act(() => hook.current.handlePreviewCandidate(candidate()));

    expect(onPreviewRequested).toHaveBeenCalledOnce();
    expect(hook.current.previewFigure).toMatchObject({
      sourceCandidateUid: 'candidate-uid',
      isPreview: true,
    });
    expect(hook.current.selectedCandidateUid).toBe('candidate-uid');
    expect(hook.current.previewError).toBeNull();
    hook.unmount();
  });

  it('preserves the existing preview and does not request navigation when preview construction fails', () => {
    const previousPreview = {
      sourceCandidateUid: 'previous',
      title: 'Previous preview',
      type: 'chart',
      chart,
      isPreview: true,
    };
    const onPreviewRequested = vi.fn();
    const onShowToast = vi.fn();
    const hook = renderCandidateWorkflow({
      initialDraft: { previewFigure: previousPreview, selectedCandidateUid: 'previous' },
      onPreviewRequested,
      onShowToast,
    });

    act(() => hook.current.handlePreviewCandidate(candidate({ data: { type: 'chart' } as any })));

    expect(onPreviewRequested).not.toHaveBeenCalled();
    expect(hook.current.previewFigure).toEqual(previousPreview);
    expect(hook.current.selectedCandidateUid).toBe('previous');
    expect(hook.current.previewError).toContain('Đề xuất này chưa đủ điều kiện để xem trước');
    hook.unmount();
  });

  it('reports failed apply without clearing the current preview or invoking the applied callback', () => {
    const previousPreview = {
      sourceCandidateUid: 'previous',
      title: 'Previous preview',
      type: 'chart',
      chart,
      isPreview: true,
    };
    const onCandidateApplied = vi.fn();
    const onShowToast = vi.fn();
    const hook = renderCandidateWorkflow({
      initialDraft: { previewFigure: previousPreview, selectedCandidateUid: 'previous' },
      onCandidateApplied,
      onShowToast,
    });

    act(() => hook.current.handleApplyCandidate(candidate({ data: { type: 'chart' } as any })));

    expect(onCandidateApplied).not.toHaveBeenCalled();
    expect(onShowToast).toHaveBeenCalledWith(expect.stringContaining('Đề xuất này chưa đủ điều kiện để áp dụng'));
    expect(hook.current.previewFigure).toEqual(previousPreview);
    expect(hook.current.selectedCandidateUid).toBe('previous');
    hook.unmount();
  });

  it('applies a saved figure before clearing its preview state', () => {
    let hook: ReturnType<typeof renderCandidateWorkflow>;
    const onCandidateApplied = vi.fn((figure) => {
      expect(figure).toMatchObject({
        sourceCandidateUid: 'candidate-uid',
        type: 'chart',
      });
      expect(hook.current.previewFigure).not.toBeNull();
    });
    hook = renderCandidateWorkflow({
      initialDraft: {
        previewFigure: {
          sourceCandidateUid: 'candidate-uid',
          title: 'Candidate chart',
          type: 'chart',
          chart,
          isPreview: true,
        },
        selectedCandidateUid: 'candidate-uid',
      },
      onCandidateApplied,
    });

    act(() => hook.current.handleApplyCandidate(candidate()));

    expect(onCandidateApplied).toHaveBeenCalledOnce();
    expect(hook.current.previewFigure).toBeNull();
    expect(hook.current.selectedCandidateUid).toBeNull();
    hook.unmount();
  });

  it.each(['needs_mapping', 'not_ready'] as const)(
    'keeps %s preview/apply eligibility governed by candidateModel policy',
    (uiStatus) => {
      const onPreviewRequested = vi.fn();
      const onCandidateApplied = vi.fn();
      const hook = renderCandidateWorkflow({ onPreviewRequested, onCandidateApplied });
      const blocked = candidate({ uiStatus });

      act(() => {
        hook.current.handlePreviewCandidate(blocked);
        hook.current.handleApplyCandidate(blocked);
      });

      expect(onPreviewRequested).not.toHaveBeenCalled();
      expect(onCandidateApplied).not.toHaveBeenCalled();
      hook.unmount();
    },
  );
});

// ──────────────────────────────────────────────────────────────────────────────
// CONT-2: Dataset-first bridge integrity tests (pure unit-level)
// Prove that a FigureRecommendation alone cannot build a renderable figure.
// The legacy candidate map is the required bridge for apply/preview actions.
// ──────────────────────────────────────────────────────────────────────────────

describe('dataset-first bridge integrity', () => {
  const chartPayload = {
    config: { type: 'bar' as const, title: 'Bridge Chart', xAxisLabel: '', yAxisLabel: '', showGrid: true, isDoubleColumn: false, caption: '' },
    data: [{ label: 'X', value: 42 }],
  };

  const legacyCandidate: VisualCandidate = {
    id: 'bridge-cand',
    sourceGroupId: 'grpBridge',
    sourceText: 'Bridge data',
    visualType: 'bar_chart',
    confidence: 0.9,
    detectionMethod: 'rule',
    source: 'rule',
    finalConfidence: 0.9,
    title: 'Bridge candidate',
    rationale: '',
    extractedItems: [],
    uiStatus: 'ready',
    data: { type: 'chart', title: 'Bridge candidate', chart: chartPayload },
  };

  it('a FigureRecommendation object alone cannot build a PreviewFigure — must resolve via legacy map', () => {
    const result = selectDatasetFirstGroups([legacyCandidate]);
    const rec = result.groups[0].recommendations[0];
    expect(() => adaptCandidateToRenderable(rec as any)).toThrow();
  });

  it('a FigureRecommendation object alone cannot build a SavedFigure via buildSavedFigureFromCandidate', () => {
    const result = selectDatasetFirstGroups([legacyCandidate]);
    const rec = result.groups[0].recommendations[0];
    expect(() => buildSavedFigureFromCandidate(rec as any, 'apa')).toThrow();
  });

  it('resolving the recommendation through the legacy map succeeds and produces the correct preview', () => {
    const result = selectDatasetFirstGroups([legacyCandidate]);
    const rec = result.groups[0].recommendations[0];
    const resolved = result.legacyCandidateByRecommendationId[rec.id];
    expect(resolved).toBe(legacyCandidate);
    const preview = buildPreviewFigureFromCandidate(resolved);
    expect(preview.isPreview).toBe(true);
    expect(preview.type).toBe('chart');
    expect(preview.chart).toEqual(chartPayload);
  });

  it('invalid-payload candidate routed through dataset-first grouping remains non-actionable', () => {
    const invalidCand: VisualCandidate = {
      id: 'invalid-bridge',
      sourceGroupId: 'grpBridge',
      sourceText: 'Bad data',
      visualType: 'bar_chart',
      confidence: 0.9,
      detectionMethod: 'rule',
      source: 'rule',
      finalConfidence: 0.9,
      title: 'Invalid',
      rationale: '',
      extractedItems: [],
      uiStatus: 'needs_mapping',
      data: { type: 'chart', title: 'Invalid' },
    };
    const result = selectDatasetFirstGroups([invalidCand]);
    const { usableRecs, invalidRecs } = splitAndSortRecommendations(
      result.groups[0].recommendations,
      result.legacyCandidateByRecommendationId
    );
    expect(usableRecs).toHaveLength(0);
    expect(invalidRecs).toHaveLength(1);
    const resolved = result.legacyCandidateByRecommendationId[result.groups[0].recommendations[0].id];
    expect(() => adaptCandidateToRenderable(resolved)).toThrow();
  });

  it('multi-candidate group resolves each recommendation independently to its own legacy candidate', () => {
    const secondCandidate: VisualCandidate = {
      id: 'bridge-cand-2',
      sourceGroupId: 'grpBridge',
      sourceText: 'Bridge data',
      visualType: 'line_chart',
      confidence: 0.8,
      detectionMethod: 'rule',
      source: 'rule',
      finalConfidence: 0.8,
      title: 'Bridge candidate 2',
      rationale: '',
      extractedItems: [],
      uiStatus: 'ready',
      data: { type: 'chart', title: 'Bridge candidate 2', chart: chartPayload },
    };
    const result = selectDatasetFirstGroups([legacyCandidate, secondCandidate]);
    const group = result.groups[0];
    expect(group.recommendations).toHaveLength(2);
    const rec1 = group.recommendations[0];
    const rec2 = group.recommendations[1];
    expect(result.legacyCandidateByRecommendationId[rec1.id]).toBe(legacyCandidate);
    expect(result.legacyCandidateByRecommendationId[rec2.id]).toBe(secondCandidate);
  });
});
