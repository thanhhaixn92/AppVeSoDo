import { describe, expect, it } from 'vitest';
import { adaptCandidateToRenderable } from '../src/analysis/candidateToRenderableAdapter';
import { buildPreviewFigureFromCandidate, buildSavedFigureFromCandidate } from '../src/lib/workflowUtils';

function candidate(type: 'chart' | 'table' | 'diagram', payload: unknown) {
  return {
    id: `${type}-id`,
    uid: `${type}-uid`,
    title: `${type} title`,
    uiStatus: 'ready',
    suggestedTheme: 'candidate-theme',
    sourceSectionId: 'section-1',
    sourceSectionHeading: 'Source heading',
    sourceExcerpt: 'Source excerpt',
    sourceLineRange: { startLine: 2, endLine: 4 },
    provenance: { origin: 'rule', trace: ['section-1'] },
    data: { type, [type]: payload },
  } as any;
}

describe('candidateToRenderableAdapter', () => {
  const chart = { config: { title: 'Chart' }, data: [{ label: 'A', value: 1 }] };
  const table = { columns: [{ key: 'a', header: 'A', align: 'left' }], rows: [{ a: '1' }], caption: 'Table' };
  const diagram = { nodes: [{ id: 'a', type: 'rect', label: 'A', x: 0, y: 0, w: 1, h: 1 }], connections: [], caption: 'Diagram' };

  it.each([['chart', chart], ['table', table], ['diagram', diagram]] as const)(
    'converts and deep-clones a %s candidate matching payload',
    (type, sourcePayload) => {
      const source = candidate(type, sourcePayload);
      const result = adaptCandidateToRenderable(source);

      expect(result).toMatchObject({
        sourceCandidateUid: `${type}-uid`,
        title: `${type} title`,
        type,
        [type]: sourcePayload,
      });
      expect(result[type]).not.toBe(sourcePayload);
      expect(result.chart && type !== 'chart').toBeFalsy();
      expect(result.table && type !== 'table').toBeFalsy();
      expect(result.diagram && type !== 'diagram').toBeFalsy();
    },
  );

  it('preserves and clones source trace/provenance', () => {
    const source = candidate('chart', chart);
    const result = adaptCandidateToRenderable(source);

    expect(result).toMatchObject({
      sourceSectionId: 'section-1',
      sourceSectionHeading: 'Source heading',
      sourceExcerpt: 'Source excerpt',
      sourceLineRange: { startLine: 2, endLine: 4 },
      provenance: { origin: 'rule', trace: ['section-1'] },
    });
    expect(result.provenance).not.toBe(source.provenance);
  });

  it('rejects not-ready candidates using existing candidate policy', () => {
    const source = candidate('chart', chart);
    source.uiStatus = 'not_ready';
    expect(() => adaptCandidateToRenderable(source)).toThrow('not renderable');
  });

  it('rejects needs-mapping candidates using existing candidate policy', () => {
    const source = candidate('chart', chart);
    source.uiStatus = 'needs_mapping';
    expect(() => adaptCandidateToRenderable(source)).toThrow('not renderable');
  });

  it.each(['chart', 'table', 'diagram'] as const)(
    'rejects a ready %s candidate without its matching payload',
    (type) => {
      const source = candidate(type, undefined);
      expect(() => adaptCandidateToRenderable(source)).toThrow(
        `${type[0].toUpperCase()}${type.slice(1)} candidate is missing its ${type} payload.`,
      );
    },
  );

  it('rejects a candidate whose declared type does not match its payload', () => {
    const source = candidate('chart', table);
    source.data = { type: 'table', chart } as any;
    expect(() => adaptCandidateToRenderable(source)).toThrow(
      'Table candidate is missing its table payload.',
    );
  });

  it('rejects a candidate with unsupported data type with a clear error', () => {
    const source = candidate('chart', chart);
    source.data = { type: 'flowchart', chart } as any;
    expect(() => adaptCandidateToRenderable(source)).toThrow(
      'Unsupported candidate data type: "flowchart"'
    );
  });

  it('rejects a FigureRecommendation-shaped object without VisualCandidate data field', () => {
    // FigureRecommendation does not have data.type — adapter must not accept it
    const figureRec = {
      id: 'rec-1',
      datasetCandidateId: 'd1',
      title: 'test',
      confidence: 0.9,
      rationale: 'test',
      source: 'rule',
      detectionMethod: 'rule',
      finalConfidence: 0.9,
      typeOptions: [],
      uiStatus: 'ready',
      // No data field
    } as any;
    expect(() => adaptCandidateToRenderable(figureRec)).toThrow();
  });

  it('candidate with optional provenance absent does not throw', () => {
    const source = candidate('chart', chart);
    delete source.provenance;
    const result = adaptCandidateToRenderable(source);
    expect(result.provenance).toBeUndefined();
    expect(result.chart).toEqual(chart);
  });

  it('deep clone isolation: mutating result does not affect original candidate', () => {
    const source = candidate('chart', chart);
    const result = adaptCandidateToRenderable(source);
    (result.chart as any).config.title = 'MUTATED';
    expect(source.data.chart.config.title).toBe(chart.config.title);
  });

  it('keeps preview and saved figure compatibility', () => {
    const source = candidate('diagram', diagram);
    const preview = buildPreviewFigureFromCandidate(source);
    const saved = buildSavedFigureFromCandidate(source, 'caller-theme');

    expect(preview).toEqual({
      sourceCandidateUid: 'diagram-uid',
      title: 'diagram title',
      type: 'diagram',
      chart: undefined,
      diagram,
      table: undefined,
      isPreview: true,
    });
    expect(saved).toMatchObject({
      title: 'diagram title',
      type: 'diagram',
      theme: 'candidate-theme',
      sourceCandidateUid: 'diagram-uid',
      diagram,
    });
    expect(saved.id).toMatch(/^fig_/);
    expect(saved.createdAt).toBe(saved.updatedAt);
  });
});
