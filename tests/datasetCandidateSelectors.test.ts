import { describe, it, expect } from 'vitest';
import { selectDatasetFirstGroups, splitAndSortRecommendations } from '../src/analysis/datasetCandidateSelectors';
import { VisualCandidate } from '../src/types';
import { FigureRecommendation } from '../src/analysis/datasetModel';

describe('datasetCandidateSelectors', () => {
  const mockCandidate1: VisualCandidate = {
    id: 'c1',
    sourceGroupId: 'groupA',
    sourceText: 'Data A',
    visualType: 'bar_chart',
    confidence: 0.9,
    detectionMethod: 'rule',
    source: 'rule',
    finalConfidence: 0.9,
    title: 'Chart 1',
    rationale: 'Reason 1',
    extractedItems: [],
    data: { type: 'chart', title: 'Chart 1' },
    uiStatus: 'ready'
  };

  const mockCandidate2: VisualCandidate = {
    id: 'c2',
    sourceGroupId: 'groupA', // Same group
    sourceText: 'Data A',
    visualType: 'line_chart',
    confidence: 0.8,
    detectionMethod: 'ai',
    source: 'ai',
    finalConfidence: 0.8,
    title: 'Chart 2',
    rationale: 'Reason 2',
    extractedItems: [],
    data: { type: 'chart', title: 'Chart 2' },
    uiStatus: 'needs_review',
    warnings: ['Low confidence']
  };

  const mockCandidate3: VisualCandidate = {
    id: 'c3',
    // No sourceGroupId
    sourceText: 'Data B',
    visualType: 'table',
    confidence: 0.95,
    detectionMethod: 'rule',
    source: 'rule',
    finalConfidence: 0.95,
    title: 'Table 1',
    rationale: 'Reason 3',
    extractedItems: [],
    data: { type: 'table', title: 'Table 1' },
    status: 'previewing'
  };

  it('handles empty candidate list', () => {
    const result = selectDatasetFirstGroups([]);
    expect(result.groups).toEqual([]);
    expect(result.legacyCandidateByRecommendationId).toEqual({});

    const resultUndefined = selectDatasetFirstGroups(undefined as any);
    expect(resultUndefined.groups).toEqual([]);
  });

  it('groups derived dataset candidates from multiple legacy VisualCandidates', () => {
    const candidates = [mockCandidate1, mockCandidate2, mockCandidate3];
    const result = selectDatasetFirstGroups(candidates);

    // c1 and c2 share groupA, c3 has no group so it's alone
    expect(result.groups.length).toBe(2);

    const groupA = result.groups.find(g => g.datasetCandidate.id === 'dataset-group-groupA');
    expect(groupA).toBeDefined();
    expect(groupA?.recommendations.length).toBe(2);
    expect(groupA?.recommendations[0].id).toBe('rec-c1');
    expect(groupA?.recommendations[1].id).toBe('rec-c2');

    const groupB = result.groups.find(g => g.datasetCandidate.id === 'dataset-single-c3');
    expect(groupB).toBeDefined();
    expect(groupB?.recommendations.length).toBe(1);
  });

  it('preserves mapping from recommendation back to original VisualCandidate', () => {
    const result = selectDatasetFirstGroups([mockCandidate1]);
    const recId = result.groups[0].recommendations[0].id;
    
    expect(result.legacyCandidateByRecommendationId[recId]).toBe(mockCandidate1);
  });

  it('produces deterministic stable group IDs', () => {
    const result1 = selectDatasetFirstGroups([mockCandidate1, mockCandidate2]);
    const result2 = selectDatasetFirstGroups([mockCandidate1, mockCandidate2]);

    expect(result1.groups[0].datasetCandidate.id).toBe(result2.groups[0].datasetCandidate.id);
    expect(result1.groups[0].datasetCandidate.id).toBe('dataset-group-groupA');
  });

  it('does not mutate input candidates', () => {
    const candidateCopy = JSON.parse(JSON.stringify(mockCandidate1));
    selectDatasetFirstGroups([mockCandidate1]);
    expect(mockCandidate1).toEqual(candidateCopy);
  });

  it('preserves candidate warnings/status without changing policy behavior', () => {
    const result = selectDatasetFirstGroups([mockCandidate2, mockCandidate3]);
    
    const rec2 = result.groups.find(g => g.datasetCandidate.id === 'dataset-group-groupA')?.recommendations[0];
    expect(rec2?.uiStatus).toBe('needs_review');
    expect(rec2?.warnings).toEqual(['Low confidence']);

    const rec3 = result.groups.find(g => g.datasetCandidate.id === 'dataset-single-c3')?.recommendations[0];
    expect(rec3?.status).toBe('previewing');
  });
});

describe('splitAndSortRecommendations', () => {
  const mockRecUsable: FigureRecommendation = {
    id: 'rec-usable',
    datasetCandidateId: 'd1',
    title: 'test',
    confidence: 0.9,
    rationale: 'test',
    source: 'rule',
    detectionMethod: 'rule',
    finalConfidence: 0.9,
    typeOptions: [{ id: 'opt1', visualType: 'bar_chart', figureType: 'chart' }]
  };

  const mockRecInvalid: FigureRecommendation = {
    id: 'rec-invalid',
    datasetCandidateId: 'd1',
    title: 'test',
    confidence: 0.9,
    rationale: 'test',
    source: 'rule',
    detectionMethod: 'rule',
    finalConfidence: 0.9,
    typeOptions: [{ id: 'opt2', visualType: 'flowchart', figureType: 'diagram' }]
  };

  const mockCandUsable: VisualCandidate = {
    id: 'cand-usable',
    sourceText: '',
    visualType: 'bar_chart',
    title: 'test',
    rationale: 'test',
    confidence: 0.9,
    detectionMethod: 'rule',
    source: 'rule',
    finalConfidence: 0.9,
    extractedItems: [],
    uiStatus: 'ready',
    data: { type: 'chart', title: 'test', chart: { data: [], config: { type: 'bar', title: 'test', xAxisLabel: '', yAxisLabel: '', showGrid: true, caption: '', isDoubleColumn: false } } }
  };

  const mockCandInvalid: VisualCandidate = {
    id: 'cand-invalid',
    sourceText: '',
    visualType: 'flowchart',
    title: 'test',
    rationale: 'test',
    confidence: 0.9,
    detectionMethod: 'rule',
    source: 'rule',
    finalConfidence: 0.9,
    extractedItems: [],
    uiStatus: 'needs_mapping',
    data: { type: 'diagram', title: 'test' }
  };

  it('splits usable and invalid recommendations correctly', () => {
    const legacyMap: Record<string, VisualCandidate> = {
      'rec-usable': mockCandUsable,
      'rec-invalid': mockCandInvalid
    };

    const { usableRecs, invalidRecs } = splitAndSortRecommendations(
      [mockRecUsable, mockRecInvalid],
      legacyMap
    );

    expect(usableRecs).toEqual([mockRecUsable]);
    expect(invalidRecs).toEqual([mockRecInvalid]);
  });

  it('handles missing legacy candidates gracefully', () => {
    const legacyMap: Record<string, VisualCandidate> = {
      'rec-usable': mockCandUsable
      // rec-invalid missing
    };

    const { usableRecs, invalidRecs } = splitAndSortRecommendations(
      [mockRecUsable, mockRecInvalid],
      legacyMap
    );

    expect(usableRecs).toEqual([mockRecUsable]);
    expect(invalidRecs).toEqual([]);
  });
});
