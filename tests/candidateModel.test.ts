import { describe, it, expect } from 'vitest';
import { 
  getCandidateUiStatus, 
  isCandidatePreviewable, 
  isCandidateApplicable, 
  isCandidateUsable, 
  normalizeVisualCandidate, 
  dedupeCandidatesPreservingMetadata,
  getCandidateStableId,
  NormalizedVisualCandidate
} from '../src/analysis/candidateModel';
import { buildPreviewFigureFromCandidate, buildSavedFigureFromCandidate } from '../src/lib/workflowUtils';

describe('Candidate Model', () => {
  it('ready preview/apply được', () => {
    const c = { uiStatus: 'ready' as const };
    expect(isCandidatePreviewable(c)).toBe(true);
    expect(isCandidateApplicable(c)).toBe(true);
    expect(isCandidateUsable(c)).toBe(true);
  });

  it('needs_review preview được nhưng policy apply phải đúng flow hiện có', () => {
    const c = { uiStatus: 'needs_review' as const };
    expect(isCandidatePreviewable(c)).toBe(true);
    // Needs review is generally applicable/usable (it triggers a review UI)
    expect(isCandidateApplicable(c)).toBe(true);
    expect(isCandidateUsable(c)).toBe(true);
  });

  it('needs_mapping không applicable, không usable như ready', () => {
    const c = { uiStatus: 'needs_mapping' as const };
    expect(isCandidatePreviewable(c)).toBe(false);
    expect(isCandidateApplicable(c)).toBe(false);
    expect(isCandidateUsable(c)).toBe(false);
  });

  it('Builder chặn preview/apply needs_mapping', () => {
    const candidate = { id: 'blocked', title: 'Blocked', visualType: 'chart', uiStatus: 'needs_mapping', data: { type: 'chart', chart: { config: {}, data: [] } } } as any;
    expect(() => buildPreviewFigureFromCandidate(candidate)).toThrow('not previewable');
    expect(() => buildSavedFigureFromCandidate(candidate, 'default')).toThrow('not applicable');
  });

  it('not_ready không preview/apply', () => {
    const c = { uiStatus: 'not_ready' as const };
    expect(isCandidatePreviewable(c)).toBe(false);
    expect(isCandidateApplicable(c)).toBe(false);
    expect(isCandidateUsable(c)).toBe(false);
  });

  it('Normalize không làm mất source trace', () => {
    const raw: any = { 
      id: 'ai-1', 
      visualType: 'bar_chart',
      title: 'Original Title',
      sourceSectionHeading: 'Heading',
      sourceExcerpt: 'Excerpt',
      sourceLineRange: { startLine: 1, endLine: 5 },
      uiStatus: 'ready',
      confidence: 0.9,
      data: { type: 'chart' }
    };
    const norm = normalizeVisualCandidate(raw);
    expect(norm.sourceSectionHeading).toBe('Heading');
    expect(norm.sourceExcerpt).toBe('Excerpt');
    expect(norm.sourceLineRange).toEqual({ startLine: 1, endLine: 5 });
    expect(norm.origin).toBe('ai');
  });

  it('Normalize không làm mất rationale/confidence', () => {
    const raw: any = { 
      id: 'rule-2', 
      visualType: 'flowchart',
      title: 'Diagram',
      rationale: 'Because 123',
      confidence: 0.85,
      data: {}
    };
    const norm = normalizeVisualCandidate(raw);
    expect(norm.origin).toBe('rule');
    expect(norm.rationale).toBe('Because 123');
    expect(norm.confidence).toBe(0.85);
  });

  it('Dedupe giữ title cụ thể hơn title generic', () => {
    const dataObj = { type: 'chart', dummy: 1 };
    const c1 = normalizeVisualCandidate({
      id: '1', title: 'AI Chart', visualType: 'chart', confidence: 0.9, data: dataObj
    } as any);
    const c2 = normalizeVisualCandidate({
      id: '2', title: 'Sales Growth Chart', visualType: 'chart', confidence: 0.8, data: dataObj
    } as any);
    const deduped = dedupeCandidatesPreservingMetadata([c1, c2]);
    expect(deduped.length).toBe(1);
    expect(deduped[0].title).toBe('Sales Growth Chart');
  });

  it('Dedupe giữ source excerpt/section/line range tốt hơn', () => {
    const dataObj = { type: 'chart', dummy: 2 };
    const c1 = normalizeVisualCandidate({
      id: '1', title: 'A', visualType: 'chart', 
      sourceSectionHeading: 'Overview', data: dataObj
    } as any);
    const c2 = normalizeVisualCandidate({
      id: '2', title: 'A', visualType: 'chart', 
      sourceExcerpt: 'Detail excerpt',
      sourceLineRange: { startLine: 10, endLine: 12 }, data: dataObj
    } as any);
    const deduped = dedupeCandidatesPreservingMetadata([c1, c2]);
    expect(deduped.length).toBe(1);
    expect(deduped[0].sourceSectionHeading).toBe('Overview');
    expect(deduped[0].sourceExcerpt).toBe('Detail excerpt');
    expect(deduped[0].sourceLineRange).toEqual({ startLine: 10, endLine: 12 });
  });

  it('Dedupe order-independent, giữ rationale/provenance/validation metadata tốt hơn', () => {
    const data = { type: 'chart', values: { a: 1, b: 2 } };
    const first = normalizeVisualCandidate({ id: 'z', title: 'AI Chart', visualType: 'chart', data, rationale: 'Short', provenance: { source: 'rule' }, validationMetadata: { valid: true } } as any);
    const second = normalizeVisualCandidate({ id: 'a', title: 'Specific research chart', visualType: 'chart', data, rationale: 'A detailed and specific research rationale', provenance: { source: 'rule', trace: 'section-1' }, validationMetadata: { valid: true, checkedBy: 'rules' } } as any);
    const forward = dedupeCandidatesPreservingMetadata([first, second]);
    const reverse = dedupeCandidatesPreservingMetadata([second, first]);
    expect(forward).toEqual(reverse);
    expect(forward[0]).toMatchObject({
      id: 'a',
      title: 'Specific research chart',
      rationale: 'A detailed and specific research rationale',
      provenance: { source: 'rule', trace: 'section-1' },
      validationMetadata: { valid: true, checkedBy: 'rules' },
    });
  });

  it('Stable ID giống nhau với cùng input', () => {
    const dataObj = { some: 'data' };
    const raw: any = { id: 'x', title: 'Title', visualType: 'matrix', sourceSectionHeading: 'H1', data: dataObj };
    const id1 = getCandidateStableId(raw);
    const id2 = getCandidateStableId({...raw, id: 'y'});
    expect(id1).toBe(id2);
  });

  it('Stable ID không đổi khi object key reorder hoặc rerun', () => {
    const first: any = { visualType: 'chart', sourceSectionHeading: 'H1', data: { type: 'chart', config: { a: 1, b: 2 } } };
    const reordered: any = { visualType: 'chart', sourceSectionHeading: 'H1', data: { config: { b: 2, a: 1 }, type: 'chart' } };
    expect(getCandidateStableId(first)).toBe(getCandidateStableId(reordered));
    expect(getCandidateStableId(first)).toBe(getCandidateStableId({ ...first }));
  });

  it('Stable ID khác nhau khi source/type/data khác nhau', () => {
    const raw1: any = { id: 'x', title: 'Title', visualType: 'matrix', sourceSectionHeading: 'H1', data: { a: 1 } };
    const raw2: any = { id: 'x', title: 'Title2', visualType: 'matrix', sourceSectionHeading: 'H1', data: { a: 2 } };
    const id1 = getCandidateStableId(raw1);
    const id2 = getCandidateStableId(raw2);
    expect(id1).not.toBe(id2);
    expect(id1).not.toBe(getCandidateStableId({ ...raw1, sourceSectionId: 'section-2' }));
    expect(id1).not.toBe(getCandidateStableId({ ...raw1, visualType: 'chart' }));
  });

  it('Unknown type được normalize an toàn', () => {
    const c = normalizeVisualCandidate({ id: '1', visualType: 'random_stuff', title: 'A', data: {} } as any);
    expect(c.figureType).toBe('diagram');
  });

  it('Candidate thiếu metadata không được bịa source', () => {
    const c = normalizeVisualCandidate({ id: '1', visualType: 'chart', title: 'A', data: {} } as any);
    expect(c.sourceSectionHeading).toBeUndefined();
    expect(c.sourceExcerpt).toBeUndefined();
  });
});
