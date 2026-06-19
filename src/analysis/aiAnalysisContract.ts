import { VisualCandidate, CandidateStatus } from "../types";

export type CandidateUiStatus = CandidateStatus;

export interface AIAnalysisInput {
  rawDocumentText: string;
  documentTitle?: string;
  locale: 'vi' | 'en';
  userGoal?: string;
}

export interface AISectionSummary {
  id: string;
  heading: string;
  summary: string;
  sourceExcerpt: string;
  semanticHints: Array<'table' | 'chart' | 'diagram' | 'timeline' | 'matrix' | 'relationship' | 'notes'>;
  confidence: number;
}

export interface AIAnalysisOutput {
  documentSummary: string;
  sections: AISectionSummary[];
  candidates: VisualCandidate[];
  warnings: string[];
}
