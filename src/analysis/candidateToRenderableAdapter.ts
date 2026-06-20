import {
  RankedVisualCandidate,
  RenderableFigurePayload,
  VisualCandidate,
} from '../types';
import { isCandidateUsable } from './candidateModel';

const SUPPORTED_CANDIDATE_TYPES = ['chart', 'table', 'diagram'] as const;
type SupportedCandidateType = typeof SUPPORTED_CANDIDATE_TYPES[number];

function isSupportedType(type: unknown): type is SupportedCandidateType {
  return SUPPORTED_CANDIDATE_TYPES.includes(type as SupportedCandidateType);
}

/**
 * Safe deep-clone using JSON round-trip. Guards against undefined values by
 * returning undefined when input is undefined rather than throwing.
 */
function deepClone<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export function adaptCandidateToRenderable(
  candidate: VisualCandidate | RankedVisualCandidate,
): RenderableFigurePayload {
  if (!isCandidateUsable(candidate)) {
    throw new Error('Candidate is not renderable.');
  }
  if (!candidate || !candidate.data) {
    throw new Error('Candidate data is missing.');
  }

  const type = candidate.data.type;
  if (!isSupportedType(type)) {
    throw new Error(`Unsupported candidate data type: "${type}". Only chart, table, and diagram are supported.`);
  }

  const sourceCandidateUid = (candidate as RankedVisualCandidate).uid || (candidate as VisualCandidate).id || 'unknown';
  const payload: RenderableFigurePayload = {
    sourceCandidateUid,
    title: candidate.title,
    type: candidate.data.type,
    sourceRange: candidate.sourceRange ? deepClone(candidate.sourceRange) : undefined,
    sourceSectionId: candidate.sourceSectionId,
    sourceSectionHeading: candidate.sourceSectionHeading,
    sourceExcerpt: candidate.sourceExcerpt,
    sourceLineRange: candidate.sourceLineRange ? deepClone(candidate.sourceLineRange) : undefined,
    sourceText: candidate.sourceText,
    sourceGroupId: candidate.sourceGroupId,
    provenance: (candidate as VisualCandidate & { provenance?: unknown }).provenance
      ? deepClone((candidate as VisualCandidate & { provenance?: unknown }).provenance)
      : undefined,
  };

  if (payload.type === 'chart') {
    if (!candidate.data.chart) throw new Error('Chart candidate is missing its chart payload.');
    payload.chart = deepClone(candidate.data.chart);
  } else if (payload.type === 'table') {
    if (!candidate.data.table) throw new Error('Table candidate is missing its table payload.');
    payload.table = deepClone(candidate.data.table);
  } else if (payload.type === 'diagram') {
    if (!candidate.data.diagram) throw new Error('Diagram candidate is missing its diagram payload.');
    payload.diagram = deepClone(candidate.data.diagram);
  }

  return payload;
}
