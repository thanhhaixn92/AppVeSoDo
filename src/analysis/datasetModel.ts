import {
  VisualCandidate,
  ChartModel,
  DiagramModel,
  TableModel,
  FigureKind,
  CandidateStatus,
  CandidateSource,
  DatasetSourceMetadata
} from '../types';

export type DatasetSelection = DatasetSourceMetadata;

export interface DatasetCandidate {
  id: string;
  datasetSelection: DatasetSelection;
  extractedItems?: unknown[];
  data: {
    chart?: ChartModel;
    diagram?: DiagramModel;
    table?: TableModel;
  };
}

export interface FigureTypeOption {
  id: string;
  visualType: string;
  figureType: FigureKind;
  recommendedTemplates?: string[];
}

export interface FigureRecommendation {
  id: string;
  datasetCandidateId: string;
  title: string;
  confidence: number;
  rationale: string;
  source: CandidateSource;
  detectionMethod: CandidateSource;
  ruleConfidence?: number;
  aiConfidence?: number;
  finalConfidence: number;
  ruleReason?: string;
  aiReason?: string;
  mergedReason?: string;
  typeOptions: FigureTypeOption[];
  uiStatus?: CandidateStatus;
  status?: 'suggested' | 'previewing' | 'applied' | 'rejected';
  warnings?: string[];
  suggestedTheme?: string;
  rejectionReason?: string;
}

export interface DatasetFirstDerivationResult {
  datasetCandidate: DatasetCandidate;
  recommendation: FigureRecommendation;
}

/**
 * Pure function that splits a monolithic legacy VisualCandidate into a dataset-first structure.
 * It does not mutate the input and does not perform any runtime validation or policy decisions.
 */
export function deriveDatasetFirstFromLegacyCandidate(
  candidate: VisualCandidate
): DatasetFirstDerivationResult {
  const datasetCandidateId = `dataset-${candidate.id}`;

  const datasetCandidate: DatasetCandidate = {
    id: datasetCandidateId,
    datasetSelection: {
      sourceRange: candidate.sourceRange,
      sourceSectionId: candidate.sourceSectionId,
      sourceSectionHeading: candidate.sourceSectionHeading,
      sourceExcerpt: candidate.sourceExcerpt,
      sourceLineRange: candidate.sourceLineRange,
      sourceText: candidate.sourceText,
      sourceGroupId: candidate.sourceGroupId,
    },
    extractedItems: candidate.extractedItems,
    data: {
      chart: candidate.data.chart,
      diagram: candidate.data.diagram,
      table: candidate.data.table,
    },
  };

  const typeOption: FigureTypeOption = {
    id: `type-${candidate.id}`,
    visualType: candidate.visualType,
    figureType: candidate.figureType ?? candidate.data.type,
    recommendedTemplates: candidate.recommendedTemplates,
  };

  const recommendation: FigureRecommendation = {
    id: `rec-${candidate.id}`,
    datasetCandidateId,
    title: candidate.title,
    confidence: candidate.confidence,
    rationale: candidate.rationale,
    source: candidate.source,
    detectionMethod: candidate.detectionMethod,
    ruleConfidence: candidate.ruleConfidence,
    aiConfidence: candidate.aiConfidence,
    finalConfidence: candidate.finalConfidence,
    ruleReason: candidate.ruleReason,
    aiReason: candidate.aiReason,
    mergedReason: candidate.mergedReason,
    typeOptions: [typeOption],
    uiStatus: candidate.uiStatus,
    status: candidate.status,
    warnings: candidate.warnings,
    suggestedTheme: candidate.suggestedTheme,
    rejectionReason: candidate.rejectionReason,
  };

  return { datasetCandidate, recommendation };
}
