import { describe, expect, it } from 'vitest';
import { deriveDatasetFirstFromLegacyCandidate } from '../src/analysis/datasetModel';
import { VisualCandidate } from '../src/types';

function createMockCandidate(id: string, type: 'chart' | 'table' | 'diagram', payload: unknown, extra: Partial<VisualCandidate> = {}): VisualCandidate {
  return {
    id,
    sourceText: 'Raw source',
    sourceExcerpt: 'Excerpt',
    sourceSectionHeading: 'Heading',
    visualType: `${type}_type`,
    confidence: 0.9,
    detectionMethod: 'rule',
    source: 'rule',
    finalConfidence: 0.9,
    title: `Mock ${type}`,
    rationale: 'Reason',
    extractedItems: [{ dummy: 1 }],
    uiStatus: 'ready',
    data: {
      type,
      title: `Mock ${type}`,
      [type]: payload
    },
    ...extra
  } as VisualCandidate;
}

describe('datasetModel pure derivation', () => {
  it('derives a DatasetCandidate from a chart VisualCandidate', () => {
    const chartPayload = { config: { type: 'bar' }, data: [] };
    const legacy = createMockCandidate('c1', 'chart', chartPayload);
    
    const { datasetCandidate, recommendation } = deriveDatasetFirstFromLegacyCandidate(legacy);
    
    expect(datasetCandidate.data.chart).toBe(chartPayload);
    expect(datasetCandidate.datasetSelection.sourceExcerpt).toBe('Excerpt');
    expect(recommendation.typeOptions[0].figureType).toBe('chart');
    expect(recommendation.title).toBe('Mock chart');
  });

  it('derives a DatasetCandidate from a table VisualCandidate', () => {
    const tablePayload = { columns: [], rows: [] };
    const legacy = createMockCandidate('t1', 'table', tablePayload);
    
    const { datasetCandidate, recommendation } = deriveDatasetFirstFromLegacyCandidate(legacy);
    
    expect(datasetCandidate.data.table).toBe(tablePayload);
    expect(recommendation.typeOptions[0].figureType).toBe('table');
  });

  it('derives a DatasetCandidate from a diagram/flow VisualCandidate', () => {
    const diagramPayload = { nodes: [], connections: [] };
    const legacy = createMockCandidate('d1', 'diagram', diagramPayload, { figureType: 'diagram' });
    
    const { datasetCandidate, recommendation } = deriveDatasetFirstFromLegacyCandidate(legacy);
    
    expect(datasetCandidate.data.diagram).toBe(diagramPayload);
    expect(recommendation.typeOptions[0].figureType).toBe('diagram');
  });

  it('preserves original VisualCandidate identity/provenance linkage', () => {
    const legacy = createMockCandidate('id-123', 'chart', {}, { sourceRange: { start: 10, end: 20 }, sourceSectionId: 'sec-1' });
    const { datasetCandidate, recommendation } = deriveDatasetFirstFromLegacyCandidate(legacy);
    
    expect(datasetCandidate.datasetSelection.sourceRange).toEqual({ start: 10, end: 20 });
    expect(datasetCandidate.datasetSelection.sourceSectionId).toBe('sec-1');
    expect(recommendation.id).toBe('rec-id-123');
    expect(recommendation.datasetCandidateId).toBe('dataset-id-123');
  });

  it('produces deterministic IDs', () => {
    const legacy = createMockCandidate('test-id', 'chart', {});
    const r1 = deriveDatasetFirstFromLegacyCandidate(legacy);
    const r2 = deriveDatasetFirstFromLegacyCandidate(legacy);
    
    expect(r1.datasetCandidate.id).toBe(r2.datasetCandidate.id);
    expect(r1.recommendation.id).toBe(r2.recommendation.id);
    expect(r1.recommendation.typeOptions[0].id).toBe(r2.recommendation.typeOptions[0].id);
  });

  it('does not mutate the input VisualCandidate', () => {
    const legacy = createMockCandidate('mut-1', 'chart', {});
    const cloned = JSON.parse(JSON.stringify(legacy));
    
    deriveDatasetFirstFromLegacyCandidate(legacy);
    
    expect(legacy).toEqual(cloned);
  });

  it('handles candidates with warnings/status without changing candidate policy behavior', () => {
    const legacy = createMockCandidate('warn-1', 'chart', {}, { 
      uiStatus: 'needs_review', 
      warnings: ['Missing data'], 
      status: 'suggested' 
    });
    
    const { recommendation } = deriveDatasetFirstFromLegacyCandidate(legacy);
    
    expect(recommendation.uiStatus).toBe('needs_review');
    expect(recommendation.status).toBe('suggested');
    expect(recommendation.warnings).toEqual(['Missing data']);
  });

  it('produces recommendation/type options that point back to the dataset candidate', () => {
    const legacy = createMockCandidate('link-1', 'chart', {});
    const { datasetCandidate, recommendation } = deriveDatasetFirstFromLegacyCandidate(legacy);
    
    expect(recommendation.datasetCandidateId).toBe(datasetCandidate.id);
  });
});
