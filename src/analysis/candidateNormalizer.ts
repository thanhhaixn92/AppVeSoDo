import { RankedVisualCandidate, AIRecommendedFigure } from '../types';
import { validateRenderableFigurePayload } from '../lib/workflowUtils';
import { dedupeCandidatesPreservingMetadata, isCandidateApplicable, normalizeVisualCandidates, NormalizedVisualCandidate } from './candidateModel';

function normalizeCandidateText(value: string | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPayloadSignature(cand: RankedVisualCandidate): string {
  if (!cand.data) return '';
  const type = cand.data.type;
  if (type === 'chart' && cand.data.chart) {
    // Only use structural data, not cosmetic 
    const labels = cand.data.chart.data.map((d: any) => normalizeCandidateText(d.label)).join('|');
    const chartType = cand.data.chart.config?.type || 'bar';
    return `chart_${chartType}_${labels}`;
  } else if (type === 'table' && cand.data.table) {
    const cols = cand.data.table.columns.map((c: any) => normalizeCandidateText(c.title)).join('|');
    const firstRowLabel = cand.data.table.rows[0]?.[0] ? normalizeCandidateText(cand.data.table.rows[0][0]) : '';
    return `table_${cols}_${firstRowLabel}`;
  } else if (type === 'diagram' && cand.data.diagram) {
    const nodesCount = cand.data.diagram.nodes.length;
    const firstNode = cand.data.diagram.nodes[0]?.label;
    return `diagram_${nodesCount}_${normalizeCandidateText(firstNode)}`;
  }
  return '';
}

/**
 * Normalizer: Checks if candidates are valid for rendering/applying.
 */
export function normalizeCandidates(candidates: RankedVisualCandidate[]): RankedVisualCandidate[] {
  return candidates.map(c => {
    let status: 'suggested' | 'previewing' | 'applied' | 'rejected' = 'suggested';
    if ((c.status as string) === 'rendered' || (c.status as string) === 'accepted' || c.status === 'applied') {
      status = 'applied';
    } else if (c.status === 'previewing') {
      status = 'previewing';
    } else if (c.status === 'rejected') {
      status = 'rejected';
    }

    const checkObj = {
      type: c.data.type,
      chart: c.data.chart,
      diagram: c.data.diagram,
      table: c.data.table
    } as any;

    const validation = validateRenderableFigurePayload(checkObj);

    return {
      ...c,
      status,
      figureType: c.data.type,
      dataCompleteness: validation.valid ? 1 : 0,
      validationError: validation.error
    };
  });
}

function getCandidateRankingScore(cand: RankedVisualCandidate): number {
  let score = 0;
  
  // 1. Completeness & Validity
  if (cand.dataCompleteness > 0) score += 100;
  
  // 2. Data robustenss
  if (cand.data.type === 'chart' && cand.data.chart && cand.data.chart.data.length > 2) {
    score += 10;
  }
  if (cand.data.type === 'diagram' && cand.data.diagram && cand.data.diagram.nodes.length > 2) {
    score += 15;
  }
  if (cand.data.type === 'table' && cand.data.table && cand.data.table.rows.length > 0) {
    score += 10;
  }
  
  // 3. Source preference
  if (cand.source === 'merged') {
    score += 20;
  } else if (cand.source === 'rule') {
    score += 15;
  } else {
    score += 5; // AI only
  }

  // 4. Bad title penalty
  const rawTitle = cand.title || '';
  if (rawTitle.includes('SUMMARY_TABLE') || rawTitle.includes('LINE_CHART')) {
    score -= 10;
  }
  
  // 5. Short raw title penalty
  if (rawTitle.length < 5) score -= 5;
  
  return score;
}

/**
 * Deduplicate and rank candidates.
 */
export function dedupeAndRankCandidates(candidates: RankedVisualCandidate[]): RankedVisualCandidate[] {
  const deduped = dedupeCandidatesPreservingMetadata(
    normalizeVisualCandidates(candidates) as NormalizedVisualCandidate[]
  ) as unknown as RankedVisualCandidate[];
  const finalList = deduped.map(cand => {
    const payloadSig = getPayloadSignature(cand);
    // Evaluate if year is hallucinated (basic check: if title has year 20xx but no data label has it)
    const yearMatch = cand.title?.match(/\b(20\d{2})\b/);
    if (yearMatch && payloadSig) {
      const yearStr = yearMatch[1];
      if (!payloadSig.includes(yearStr)) {
         // Suspected out-of-dataset year, reduce score
         cand.finalConfidence = (cand.finalConfidence || 0) * 0.5;
         // Note: we don't drop completely, just deprioritize.
      }
    }
    
    return { ...cand, _rankingScore: getCandidateRankingScore(cand) };
  });
  
  // Sort primarily by our custom score, secondly by earlier original finalConfidence
  finalList.sort((a, b) => {
    if (b._rankingScore !== a._rankingScore) {
      return b._rankingScore - a._rankingScore;
    }
    // secondary sort:
    return (b.finalConfidence || 0) - (a.finalConfidence || 0);
  });
  
  return finalList.map(({ _rankingScore, ...rest }) => rest as RankedVisualCandidate);
}

/**
 * Splits into renderable and non-renderable.
 */
export function splitCandidates(candidates: RankedVisualCandidate[]): { 
  renderableCandidates: RankedVisualCandidate[], 
  nonRenderableRecommendations: AIRecommendedFigure[] 
} {
  const renderableCandidates: RankedVisualCandidate[] = [];
  const nonRenderableRecommendations: AIRecommendedFigure[] = [];

  candidates.forEach(c => {
    if (c.dataCompleteness > 0) {
      renderableCandidates.push(c);
    } else {
      nonRenderableRecommendations.push({
        title: c.title,
        figureType: c.data.type,
        visualType: c.visualType,
        intent: 'summary', 
        reason: c.rationale + " (Gợi ý cần tạo dữ liệu trước khi áp dụng)",
        confidence: c.confidence
      });
    }
  });

  return { renderableCandidates, nonRenderableRecommendations };
}

/**
 * Filter for applyable candidates.
 */
export function getApplyableCandidates(candidates: RankedVisualCandidate[]): RankedVisualCandidate[] {
  return candidates.filter(c => isCandidateApplicable(c));
}
