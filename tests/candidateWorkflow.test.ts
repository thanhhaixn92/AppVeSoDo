// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { useCandidateWorkflow } from '../src/hooks/useCandidateWorkflow';
import { RankedVisualCandidate } from '../src/types';

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
