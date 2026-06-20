import { describe, it, expect } from 'vitest';
import { selectDatasetFirstGroups, splitAndSortRecommendations, mergeGroupDataPayload } from '../src/analysis/datasetCandidateSelectors';
import { VisualCandidate } from '../src/types';
import { FigureRecommendation, DatasetCandidate } from '../src/analysis/datasetModel';

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

  it('merges missing payload from later candidate when first lacks chart data', () => {
    const chart = { config: { type: 'bar' as const, title: 'A', xAxisLabel: '', yAxisLabel: '', showGrid: true, isDoubleColumn: false, caption: '' }, data: [{ label: 'X', value: 10 }] };
    const firstMissing: VisualCandidate = {
      id: 'merge-a',
      sourceGroupId: 'mergeGroup',
      sourceText: 'Data',
      visualType: 'bar_chart',
      confidence: 0.9,
      detectionMethod: 'rule',
      source: 'rule',
      finalConfidence: 0.9,
      title: 'First',
      rationale: '',
      extractedItems: [],
      // No chart payload in data
      data: { type: 'chart', title: 'First' },
      uiStatus: 'ready'
    };
    const secondWithChart: VisualCandidate = {
      id: 'merge-b',
      sourceGroupId: 'mergeGroup',
      sourceText: 'Data',
      visualType: 'bar_chart',
      confidence: 0.8,
      detectionMethod: 'rule',
      source: 'rule',
      finalConfidence: 0.8,
      title: 'Second',
      rationale: '',
      extractedItems: [],
      data: { type: 'chart', title: 'Second', chart },
      uiStatus: 'ready'
    };

    const result = selectDatasetFirstGroups([firstMissing, secondWithChart]);
    const group = result.groups.find(g => g.datasetCandidate.id === 'dataset-group-mergeGroup');
    expect(group).toBeDefined();
    // After merge, the group's datasetCandidate should have the chart payload from secondWithChart
    expect(group?.datasetCandidate.data.chart).toBe(chart);
    // Both recommendations are present
    expect(group?.recommendations.length).toBe(2);
    // Both original candidates are preserved in the mapping
    expect(result.legacyCandidateByRecommendationId['rec-merge-a']).toBe(firstMissing);
    expect(result.legacyCandidateByRecommendationId['rec-merge-b']).toBe(secondWithChart);
  });

  it('does not overwrite existing payload from first candidate with later one', () => {
    const chartA = { config: { type: 'bar' as const, title: 'A', xAxisLabel: '', yAxisLabel: '', showGrid: true, isDoubleColumn: false, caption: '' }, data: [{ label: 'X', value: 1 }] };
    const chartB = { config: { type: 'line' as const, title: 'B', xAxisLabel: '', yAxisLabel: '', showGrid: false, isDoubleColumn: false, caption: '' }, data: [{ label: 'Y', value: 2 }] };
    const firstWithChart: VisualCandidate = {
      id: 'overwrite-a',
      sourceGroupId: 'overwriteGroup',
      sourceText: 'Data',
      visualType: 'bar_chart',
      confidence: 0.9,
      detectionMethod: 'rule',
      source: 'rule',
      finalConfidence: 0.9,
      title: 'First',
      rationale: '',
      extractedItems: [],
      data: { type: 'chart', title: 'First', chart: chartA },
      uiStatus: 'ready'
    };
    const secondWithChart: VisualCandidate = {
      id: 'overwrite-b',
      sourceGroupId: 'overwriteGroup',
      sourceText: 'Data',
      visualType: 'bar_chart',
      confidence: 0.8,
      detectionMethod: 'rule',
      source: 'rule',
      finalConfidence: 0.8,
      title: 'Second',
      rationale: '',
      extractedItems: [],
      data: { type: 'chart', title: 'Second', chart: chartB },
      uiStatus: 'ready'
    };

    const result = selectDatasetFirstGroups([firstWithChart, secondWithChart]);
    const group = result.groups.find(g => g.datasetCandidate.id === 'dataset-group-overwriteGroup');
    // Should preserve first candidate's chart, not overwrite with second
    expect(group?.datasetCandidate.data.chart).toBe(chartA);
  });

  it('merges extractedItems from later candidate when first has empty extractedItems', () => {
    const items: unknown[] = [{ label: 'X', value: 10 }];
    const firstEmpty: VisualCandidate = {
      id: 'items-a',
      sourceGroupId: 'itemsGroup',
      sourceText: 'Data',
      visualType: 'bar_chart',
      confidence: 0.9,
      detectionMethod: 'rule',
      source: 'rule',
      finalConfidence: 0.9,
      title: 'First',
      rationale: '',
      extractedItems: [],
      data: { type: 'chart', title: 'First' },
      uiStatus: 'ready'
    };
    const secondWithItems: VisualCandidate = {
      id: 'items-b',
      sourceGroupId: 'itemsGroup',
      sourceText: 'Data',
      visualType: 'bar_chart',
      confidence: 0.8,
      detectionMethod: 'rule',
      source: 'rule',
      finalConfidence: 0.8,
      title: 'Second',
      rationale: '',
      extractedItems: items,
      data: { type: 'chart', title: 'Second' },
      uiStatus: 'ready'
    };

    const result = selectDatasetFirstGroups([firstEmpty, secondWithItems]);
    const group = result.groups.find(g => g.datasetCandidate.id === 'dataset-group-itemsGroup');
    expect(group?.datasetCandidate.extractedItems).toBe(items);
  });

  it('does not mutate input candidates during group payload merge', () => {
    const chart = { config: { type: 'bar' as const, title: 'A', xAxisLabel: '', yAxisLabel: '', showGrid: true, isDoubleColumn: false, caption: '' }, data: [{ label: 'X', value: 1 }] };
    const firstMissing: VisualCandidate = {
      id: 'nomut-a',
      sourceGroupId: 'nomutGroup',
      sourceText: 'Data',
      visualType: 'bar_chart',
      confidence: 0.9,
      detectionMethod: 'rule',
      source: 'rule',
      finalConfidence: 0.9,
      title: 'First',
      rationale: '',
      extractedItems: [],
      data: { type: 'chart', title: 'First' },
      uiStatus: 'ready'
    };
    const secondWithChart: VisualCandidate = {
      id: 'nomut-b',
      sourceGroupId: 'nomutGroup',
      sourceText: 'Data',
      visualType: 'bar_chart',
      confidence: 0.8,
      detectionMethod: 'rule',
      source: 'rule',
      finalConfidence: 0.8,
      title: 'Second',
      rationale: '',
      extractedItems: [],
      data: { type: 'chart', title: 'Second', chart },
      uiStatus: 'ready'
    };

    const firstCopy = JSON.parse(JSON.stringify(firstMissing));
    const secondCopy = JSON.parse(JSON.stringify(secondWithChart));
    selectDatasetFirstGroups([firstMissing, secondWithChart]);
    expect(firstMissing).toEqual(firstCopy);
    expect(secondWithChart).toEqual(secondCopy);
  });
});


  it('merges missing datasetSelection metadata from later candidates without mutating', () => {
    const firstMissingMetadata: VisualCandidate = {
      id: 'meta-1',
      sourceGroupId: 'metaGroup',
      sourceText: '',
      sourceExcerpt: '',
      visualType: 'bar_chart',
      confidence: 0.9,
      detectionMethod: 'rule',
      source: 'rule',
      finalConfidence: 0.9,
      title: 'First',
      rationale: '',
      extractedItems: [],
      data: { type: 'chart', title: 'First' },
      uiStatus: 'ready'
    };
    const secondWithMetadata: VisualCandidate = {
      id: 'meta-2',
      sourceGroupId: 'metaGroup',
      sourceText: 'Full source text',
      sourceExcerpt: 'Excerpt text',
      visualType: 'bar_chart',
      confidence: 0.8,
      detectionMethod: 'rule',
      source: 'rule',
      finalConfidence: 0.8,
      title: 'Second',
      rationale: '',
      extractedItems: [],
      data: { type: 'chart', title: 'Second' },
      uiStatus: 'ready'
    };

    const firstCopy = JSON.parse(JSON.stringify(firstMissingMetadata));
    const secondCopy = JSON.parse(JSON.stringify(secondWithMetadata));

    const result = selectDatasetFirstGroups([firstMissingMetadata, secondWithMetadata]);
    const group = result.groups.find(g => g.datasetCandidate.id === 'dataset-group-metaGroup');

    expect(group?.datasetCandidate.datasetSelection.sourceText).toBe('Full source text');
    expect(group?.datasetCandidate.datasetSelection.sourceExcerpt).toBe('Excerpt text');

    // Non-mutation check
    expect(firstMissingMetadata).toEqual(firstCopy);
    expect(secondWithMetadata).toEqual(secondCopy);
  });
describe('mergeGroupDataPayload', () => {
  it('fills missing payload from additional candidates', () => {
    const chart = { config: { type: 'bar' as const, title: 'A', xAxisLabel: '', yAxisLabel: '', showGrid: true, isDoubleColumn: false, caption: '' }, data: [] };
    const base: DatasetCandidate = {
      id: 'base',
      datasetSelection: { sourceText: 'x' },
      extractedItems: [],
      data: {}
    };
    const additional: VisualCandidate = {
      id: 'extra',
      sourceText: 'x',
      visualType: 'bar_chart',
      confidence: 0.9,
      detectionMethod: 'rule',
      source: 'rule',
      finalConfidence: 0.9,
      title: '',
      rationale: '',
      extractedItems: [],
      data: { type: 'chart', title: '', chart },
      uiStatus: 'ready'
    };
    const merged = mergeGroupDataPayload(base, [additional]);
    expect(merged.data.chart).toBe(chart);
    expect(merged.id).toBe('base');
  });

  it('does not overwrite existing payload', () => {
    const existingChart = { config: { type: 'bar' as const, title: 'existing', xAxisLabel: '', yAxisLabel: '', showGrid: true, isDoubleColumn: false, caption: '' }, data: [] };
    const newChart = { config: { type: 'line' as const, title: 'new', xAxisLabel: '', yAxisLabel: '', showGrid: false, isDoubleColumn: false, caption: '' }, data: [] };
    const base: DatasetCandidate = {
      id: 'base',
      datasetSelection: { sourceText: 'x' },
      extractedItems: [],
      data: { chart: existingChart }
    };
    const additional: VisualCandidate = {
      id: 'extra',
      sourceText: 'x',
      visualType: 'bar_chart',
      confidence: 0.9,
      detectionMethod: 'rule',
      source: 'rule',
      finalConfidence: 0.9,
      title: '',
      rationale: '',
      extractedItems: [],
      data: { type: 'chart', title: '', chart: newChart },
      uiStatus: 'ready'
    };
    const merged = mergeGroupDataPayload(base, [additional]);
    expect(merged.data.chart).toBe(existingChart);
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

  it('invalid-payload candidates remain blocked after selector grouping', () => {
    const invalidPayloadCand: VisualCandidate = {
      id: 'inv-payload',
      sourceGroupId: 'grp1',
      sourceText: '',
      visualType: 'bar_chart',
      title: 'Bad',
      rationale: '',
      confidence: 0.9,
      detectionMethod: 'rule',
      source: 'rule',
      finalConfidence: 0.9,
      extractedItems: [],
      // Missing chart payload → should be needs_mapping
      uiStatus: 'needs_mapping',
      data: { type: 'chart', title: 'Bad' }
    };

    const result = selectDatasetFirstGroups([invalidPayloadCand]);
    const rec = result.groups[0].recommendations[0];
    const legacyCand = result.legacyCandidateByRecommendationId[rec.id];
    const { usableRecs, invalidRecs } = splitAndSortRecommendations(
      result.groups[0].recommendations,
      result.legacyCandidateByRecommendationId
    );

    expect(legacyCand).toBe(invalidPayloadCand);
    expect(usableRecs).toHaveLength(0);
    expect(invalidRecs).toHaveLength(1);
  });
});
