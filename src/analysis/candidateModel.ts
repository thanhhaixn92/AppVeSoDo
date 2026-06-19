import { VisualCandidate, CandidateStatus, FigureKind } from "../types";

export type CandidateUiStatus = 'ready' | 'needs_review' | 'needs_mapping' | 'not_ready';
export type CandidateOrigin = 'ai' | 'rule' | 'manual' | 'sample';

const STATUS_PRIORITY: CandidateUiStatus[] = ['not_ready', 'needs_mapping', 'needs_review', 'ready'];
const GENERIC_TITLES = new Set(['ai chart', 'ai summary table', 'generated process flow', 'hình vẽ chưa có tiêu đề']);
const PLACEHOLDER_TEXT = /^(unknown|n\/a|none|placeholder|không rõ nguồn|không có)$/i;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((result, key) => {
      const nested = (value as Record<string, unknown>)[key];
      if (nested !== undefined) result[key] = canonicalize(nested);
      return result;
    }, {});
  }
  return value;
}

export function canonicalSerialize(value: unknown): string { return JSON.stringify(canonicalize(value)); }

function textQuality(value: unknown, genericTitle = false): number {
  if (typeof value !== 'string' || !value.trim() || PLACEHOLDER_TEXT.test(value.trim())) return 0;
  if (genericTitle && GENERIC_TITLES.has(value.trim().toLowerCase())) return 1;
  return 10 + value.trim().length;
}

function chooseText(a: unknown, b: unknown, genericTitle = false): string | undefined {
  return [a, b].filter((v): v is string => typeof v === 'string' && !!v.trim()).sort((l, r) => textQuality(r, genericTitle) - textQuality(l, genericTitle) || l.localeCompare(r))[0];
}

function chooseStructured<T>(a: T | undefined, b: T | undefined): T | undefined {
  if (a === undefined) return b; if (b === undefined) return a;
  const sa = canonicalSerialize(a), sb = canonicalSerialize(b);
  return sa.length > sb.length || (sa.length === sb.length && sa < sb) ? a : b;
}

export interface NormalizedVisualCandidate extends VisualCandidate {
  uiStatus: CandidateUiStatus;
  origin: CandidateOrigin;
  sourceSectionHeading?: string;
  sourceExcerpt?: string;
  rationale: string;
}

export function normalizeCandidateType(type: string): FigureKind | 'timeline' | 'matrix' | 'unknown' {
  const norm = type.toLowerCase();
  if (norm.includes('table')) return 'table';
  if (norm.includes('chart')) return 'chart';
  if (norm.includes('diagram') || norm.includes('flowchart') || norm.includes('hierarchy') || norm.includes('cycle')) return 'diagram';
  if (norm.includes('timeline')) return 'timeline';
  if (norm.includes('matrix')) return 'matrix';
  return 'unknown';
}

export function getCandidateUiStatus(candidate: Partial<VisualCandidate>): CandidateUiStatus {
  let status: CandidateUiStatus = 'not_ready';

  if (candidate.uiStatus) {
    if (['ready', 'needs_review', 'needs_mapping', 'not_ready'].includes(candidate.uiStatus)) {
      status = candidate.uiStatus as CandidateUiStatus;
    }
  } else if (candidate.confidence) {
     if (candidate.confidence >= 0.9) status = 'ready';
     else if (candidate.confidence >= 0.7) status = 'needs_review';
     else if (candidate.confidence >= 0.4) status = 'needs_mapping';
  }

  // Enforce payload presence for 'ready' and 'needs_review'
  if (status === 'ready' || status === 'needs_review') {
    const type = candidate.figureType || normalizeCandidateType(candidate.visualType || '');
    if (type === 'chart') {
      const hasPayload = candidate.data?.chart || (candidate as any).chartData;
      if (!hasPayload) status = 'needs_mapping';
    } else if (type === 'table') {
      const hasPayload = candidate.data?.table || (candidate as any).tableData;
      if (!hasPayload) status = 'needs_mapping';
    } else if (type === 'diagram') {
      const hasPayload = candidate.data?.diagram || (candidate as any).diagramData;
      if (!hasPayload) status = 'needs_mapping';
    }
  }

  return status;
}

export function isCandidatePreviewable(candidate: Partial<VisualCandidate>): boolean {
  const status = getCandidateUiStatus(candidate);
  return status === 'ready' || status === 'needs_review';
}

export function isCandidateApplicable(candidate: Partial<VisualCandidate>): boolean {
  const status = getCandidateUiStatus(candidate);
  return status === 'ready' || status === 'needs_review';
}

export function isCandidateUsable(candidate: Partial<VisualCandidate>): boolean {
  return isCandidateApplicable(candidate);
}

export function hasPreviewableData(candidate: Partial<VisualCandidate>): boolean {
  return !!candidate.data && !!candidate.data.type && !!candidate.data[candidate.data.type as keyof typeof candidate.data];
}

export function getCandidateDisplayTitle(candidate: Partial<VisualCandidate>): string {
  if (candidate.title && !['AI Chart', 'AI Summary Table', 'Generated Process Flow'].includes(candidate.title)) {
    return candidate.title;
  }
  if (candidate.sourceSectionHeading) {
    return `Phân tích từ: ${candidate.sourceSectionHeading}`;
  }
  return candidate.title || "Hình vẽ chưa có tiêu đề";
}

export function getCandidateSourceLabel(candidate: Partial<VisualCandidate>): string {
  if (candidate.sourceSectionHeading) return candidate.sourceSectionHeading;
  if (candidate.sourceExcerpt) return candidate.sourceExcerpt.substring(0, 30) + '...';
  return "Không rõ nguồn";
}

export function getCandidateSourceExcerpt(candidate: Partial<VisualCandidate>): string | undefined {
  return candidate.sourceExcerpt;
}

export function normalizeVisualCandidate(candidate: VisualCandidate, fallbackOrigin: CandidateOrigin = 'rule'): NormalizedVisualCandidate {
  let origin = fallbackOrigin;
  if (candidate.source === 'ai' || candidate.detectionMethod === 'ai' || candidate.id.startsWith('ai-')) {
    origin = 'ai';
  } else if (candidate.source === 'rule' || candidate.detectionMethod === 'rule' || candidate.id.startsWith('rule-')) {
    origin = 'rule';
  }
  
  let figureType = candidate.figureType;
  if (!figureType) {
    const norm = normalizeCandidateType(candidate.visualType);
    figureType = (norm === 'table' || norm === 'chart' || norm === 'diagram') ? norm : 'diagram';
  }
  
  return {
    ...candidate,
    origin,
    figureType,
    uiStatus: getCandidateUiStatus(candidate),
    rationale: candidate.rationale || candidate.aiReason || candidate.ruleReason || candidate.mergedReason || "Không có giải trình cụ thể.",
  };
}

export function normalizeVisualCandidates(candidates: VisualCandidate[], fallbackOrigin: CandidateOrigin = 'rule'): NormalizedVisualCandidate[] {
  return candidates.map(c => normalizeVisualCandidate(c, fallbackOrigin));
}

export function getCandidateStableId(candidate: Partial<VisualCandidate>): string {
  const c = candidate as any;
  const type = normalizeCandidateType(c.visualType || c.figureType || '');
  const identity = { type, source: c.sourceSectionId || c.source || c.origin || '', data: c.data || null, title: c.data ? '' : c.title || '' };
  const serialized = canonicalSerialize(identity);
  let hash = 0;
  for (let i = 0; i < serialized.length; i++) hash = Math.imul(31, hash) + serialized.charCodeAt(i) | 0;
  return `cand-${type}-${Math.abs(hash)}`;
}

export function dedupeCandidatesPreservingMetadata(candidates: NormalizedVisualCandidate[]): NormalizedVisualCandidate[] {
  const map = new Map<string, NormalizedVisualCandidate>();
  for (const candidate of candidates) {
    const stableId = getCandidateStableId(candidate);
    const existing = map.get(stableId);
    if (!existing) { map.set(stableId, candidate); continue; }
    const base = canonicalSerialize(existing) <= canonicalSerialize(candidate) ? existing : candidate;
    const other = base === existing ? candidate : existing;
    const merged = {
      ...other, ...base,
      id: [existing.id, candidate.id].sort()[0],
      title: chooseText(existing.title, candidate.title, true) || base.title,
      rationale: chooseText(existing.rationale, candidate.rationale) || base.rationale,
      confidence: Math.max(existing.confidence || 0, candidate.confidence || 0),
      uiStatus: STATUS_PRIORITY[Math.min(STATUS_PRIORITY.indexOf(existing.uiStatus), STATUS_PRIORITY.indexOf(candidate.uiStatus))],
      sourceSectionId: chooseText(existing.sourceSectionId, candidate.sourceSectionId),
      sourceSectionHeading: chooseText(existing.sourceSectionHeading, candidate.sourceSectionHeading),
      sourceExcerpt: chooseText(existing.sourceExcerpt, candidate.sourceExcerpt),
      sourceLineRange: chooseStructured(existing.sourceLineRange, candidate.sourceLineRange),
    } as NormalizedVisualCandidate & Record<string, unknown>;
    for (const key of ['provenance', 'validationMetadata', 'validationError', 'warnings', 'evidence']) merged[key] = chooseStructured((existing as any)[key], (candidate as any)[key]);
    map.set(stableId, merged);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, candidate]) => candidate);
}
