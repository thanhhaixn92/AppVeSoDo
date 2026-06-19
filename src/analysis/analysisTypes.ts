import { 
  FigureKind, 
  VisualIntentType, 
  VisualCandidate, 
  CandidateSource, 
  RankedVisualCandidate,
  AIRecommendedFigure,
  RuleAnalysisResult,
  AIAnalysisResult,
  DiagramModel,
  ChartModel,
  TableModel
} from '../types';

export interface ReconciledAnalysisResult {
  candidates: RankedVisualCandidate[];
  ruleResult?: RuleAnalysisResult;
  aiResult?: AIAnalysisResult;
  warnings: string[];
  analysisRunId: string;
}

export interface AnalysisPipelineResult {
  reconciled: ReconciledAnalysisResult;
  timestamp: string;
}
