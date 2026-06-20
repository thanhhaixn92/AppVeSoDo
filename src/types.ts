/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Academic styling profiles
export type AcademicTheme = string;

// --- CHARTS MODEL ---
export type UnitFamily =
  | 'currency'
  | 'percentage'
  | 'count'
  | 'income_per_person_month'
  | 'volume_or_output'
  | 'unknown';

export interface ParsedMeasure {
  raw: string;
  value: number;
  unitText?: string;
  unitFamily: UnitFamily;
  canonicalUnit:
    | 'currency_vnd_billion'
    | 'currency_vnd_million'
    | 'currency_vnd'
    | 'percentage'
    | 'income_vnd_per_person_month'
    | 'person_count'
    | 'vehicle_count'
    | 'vessel_trip_count'
    | 'volume_or_output_tr_gthl'
    | 'volume_or_output'
    | 'unknown';
  scale?: 'unit' | 'thousand' | 'million' | 'billion';
}

export interface ChartDataPoint {
  label: string;
  value: number;
  error?: number;
  percent?: number;
  unit?: string;
  meta?: Record<string, string | number | boolean>;
  unitFamily?: UnitFamily;
  canonicalUnit?: ParsedMeasure['canonicalUnit'];
  sourceGroupId?: string;
  rawValue?: string;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  showGrid: boolean;
  isDoubleColumn: boolean;
  caption: string;
  source?: string; // Standard academic source
  showLegend?: boolean;
  showLabels?: boolean;
  legendPosition?: 'right' | 'bottom';
  labelMode?: 'value' | 'percent' | 'name_percent' | 'value_percent';
  valueUnit?: string;
}

export interface ChartModel {
  config: ChartConfig;
  data: ChartDataPoint[];
}

// --- DIAGRAMS MODEL ---
export type ShapeType = 'rect' | 'circle' | 'cylinder' | 'diamond' | 'actor' | 'text';

export interface DiagramNode {
  id: string;
  type: ShapeType;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fillColor?: string;
  strokeColor?: string;
  outlineStyle?: 'solid' | 'dashed' | 'none';
  fontSize?: number;
  fontWeight?: string;
  borderRadius?: number;
  textAlign?: 'left' | 'center' | 'right';
  rx?: number;
  strokeWidth?: number;
}

export type LineStyle = 'solid' | 'dashed' | 'dotted';

export interface DiagramConnection {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  style: LineStyle;
  arrowEnd: boolean;
  strokeWidth?: number;
}

export interface DiagramModel {
  nodes: DiagramNode[];
  connections: DiagramConnection[];
  caption: string;
  source?: string;
}

// --- TABLES MODEL ---
export interface TableColumn {
  key: string;
  header: string;
  align: 'left' | 'center' | 'right';
}

export interface TableModel {
  columns: TableColumn[];
  rows: Record<string, string>[];
  caption: string;
  source?: string;
}

// --- THEMES ---
export interface DiagramTheme {
  id: string;
  name: string;
  variant: "blackWhite" | "color";
  fontFamily: string;
  canvas: {
    background: string;
    margin: number;
  };
  node: {
    fill: string;
    stroke: string;
    strokeWidth: number;
    radius: number;
    paddingX: number;
    paddingY: number;
    minWidth: number;
    minHeight: number;
    fontSize: number;
    fontWeight: number;
    textColor: string;
    lineHeight: number;
  };
  line: {
    stroke: string;
    strokeWidth: number;
    style: "solid" | "dashed";
    arrowSize: number;
  };
  spacing: {
    horizontal: number;
    vertical: number;
    groupGap: number;
  };
  caption: {
    fontSize: number;
    textColor: string;
    align: "center" | "left";
  };
}

// --- SAVED FIGURES LIST ---
export interface SavedFigure {
  id: string;
  title: string;
  type: 'chart' | 'diagram' | 'table';
  theme: AcademicTheme;
  chart?: ChartModel;
  diagram?: DiagramModel;
  table?: TableModel;
  createdAt: string;
  updatedAt?: string;
  sourceCandidateUid?: string;
}

export interface PreviewFigure {
  sourceCandidateUid: string;
  title: string;
  type: 'chart' | 'diagram' | 'table';
  chart?: ChartModel;
  diagram?: DiagramModel;
  table?: TableModel;
  isPreview: true;
}

export interface RenderableFigurePayload {
  sourceCandidateUid: string;
  title: string;
  type: 'chart' | 'diagram' | 'table';
  chart?: ChartModel;
  diagram?: DiagramModel;
  table?: TableModel;
  sourceRange?: { start: number; end: number };
  sourceSectionId?: string;
  sourceSectionHeading?: string;
  sourceExcerpt?: string;
  sourceLineRange?: { startLine: number; endLine: number };
  sourceText?: string;
  sourceGroupId?: string;
  provenance?: unknown;
}

export type MainScreen = 'document' | 'drawings' | 'canvas';
export type RightSidebarTool = 'assistant' | 'properties' | 'history' | 'settings' | null;

// --- WORKFLOW STATES ---
export type WorkflowState =
  | "EMPTY"
  | "INPUT_READY"
  | "ANALYZING"
  | "CANDIDATES_READY"
  | "PREVIEWING_CANDIDATE"
  | "APPLYING_CANDIDATE"
  | "APPLIED_FIGURE"
  | "EDITING_FIGURE"
  | "QUALITY_CHECKING"
  | "EXPORTING"
  | "ERROR";

// --- VIR ---
export interface VIRNode {
  id: string;
  label: string;
  type?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  fillColor?: string;
  strokeColor?: string;
  style?: Record<string, any>;
}

export interface VIREdge {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  style?: string;
  arrowEnd?: boolean;
  strokeColor?: string;
}

export interface VIRGroup {
  id: string;
  label: string;
  nodeIds: string[];
}

export interface VIR {
  id: string;
  type:
    | "flowchart"
    | "matrix"
    | "timeline"
    | "roadmap"
    | "comparison"
    | "hierarchy"
    | "table"
    | "line_chart"
    | "bar_chart"
    | "policy_matrix"
    | "cycle"
    | "framework";
  title: string;
  nodes: VIRNode[];
  edges: VIREdge[];
  groups?: VIRGroup[];
  metadata?: Record<string, unknown>;
}

// --- RULE MEMORY ---
export interface Rule {
  id: string;
  name: string;
  category:
    | "visual_detection"
    | "visual_selection"
    | "layout"
    | "command"
    | "quality"
    | "optimization";
  source:
    | "system"
    | "user_confirmed"
    | "ai_provisional";
  priority: number;
  locked: boolean;
  trigger: {
    keywords?: string[];
    regex?: string[];
  };
  action: {
    type: string;
    payload: Record<string, unknown>;
  };
  confidence: number;
}

// --- INTELLIGENCE ENGINE V3 TYPES ---
export type VisualCandidateType =
  | "flowchart"
  | "matrix"
  | "timeline"
  | "roadmap"
  | "framework"
  | "governance_framework"
  | "policy_matrix"
  | "input_process_output"
  | "cause_effect"
  | "criteria_table"
  | "comparison_table"
  | "summary_table"
  | "hierarchy"
  | "taxonomy"
  | "maturity_model"
  | "capability_model"
  | "line_chart"
  | "bar_chart"
  | "area_chart"
  | "scatter_chart"
  | "pie_chart"
  | "radar_chart"
  | "cycle"
  | "table"
  | "diagram";

export type DocumentBlockType =
  | "heading"
  | "paragraph"
  | "list"
  | "table"
  | "number_series"
  | "timeline"
  | "definition"
  | "comparison"
  | "process"
  | "matrix_hint"
  | "summary";

export interface DocumentBlock {
  id: string;
  type: DocumentBlockType;
  text: string;
  order: number;
  confidence: number;
  sourceRange?: { start: number; end: number };
}

export type EntityType =
  | "concept"
  | "actor"
  | "process_step"
  | "criterion"
  | "time_point"
  | "metric"
  | "value"
  | "group"
  | "policy_tool"
  | "outcome"
  | "organization";

export interface ExtractedEntity {
  id: string;
  label: string;
  entityType: EntityType;
  value?: string | number;
  unit?: string;
  sourceBlockId: string;
  confidence: number;
}

export type RelationType =
  | "sequence"
  | "part_of"
  | "causes"
  | "influences"
  | "compares_with"
  | "belongs_to"
  | "maps_to"
  | "input_to_output"
  | "manages"
  | "regulates"
  | "implements"
  | "supervises"
  | "provides_service"
  | "uses_tool"
  | "affects"
  | "measured_by"
  | "requires"
  | "produces"
  | "constrains"
  | "supports"
  | "evaluates"
  | "depends_on"
  | "contributes_to"
  | "evaluated_by"
  | "drives"
  | "enables"
  | "limits"
  | "transforms"
  | "governs"
  | "coordinates"
  | "allocates"
  | "monitors"
  | "audits"
  | "reports_to";

export interface ExtractedRelation {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  relationType: RelationType;
  direction: "one_way" | "two_way" | "none";
  sourceBlockId: string;
  confidence: number;
}

export interface VisualIntent {
  id: string;
  visualType: VisualCandidateType;
  score: number;
  reason: string;
  requiredDataCompleteness: number;
  sourceBlockIds: string[];
}

export type CandidateStatus = 'ready' | 'needs_review' | 'needs_mapping' | 'not_ready';

// --- DATASET-FIRST MIGRATION ALIASES (M1.5) ---

export type DatasetFigureKind = 'diagram' | 'chart' | 'table';

export interface DatasetFirstPayload {
  type: DatasetFigureKind;
  title: string;
  chart?: ChartModel;
  diagram?: DiagramModel;
  table?: TableModel;
}

export type DatasetSourceMetadata = Partial<DatasetProvenance>;

export interface DatasetProvenance {
  sourceRange?: { start: number; end: number };
  sourceSectionId?: string;
  sourceSectionHeading?: string;
  sourceExcerpt?: string;
  sourceLineRange?: { startLine: number; endLine: number };
  sourceText: string;
  extractedItems: unknown[];
  sourceGroupId?: string;
}

export interface FigureRecommendation {
  visualType: string;
  figureType?: 'diagram' | 'chart' | 'table';
  confidence: number;
  rationale: string;
  recommendedTemplates?: string[];
  suggestedTheme?: string;
  title: string;
  data: {
    type: FigureKind;
    title: string;
    chart?: ChartModel;
    diagram?: DiagramModel;
    table?: TableModel;
  };
}

export interface VisualCandidate {
  id: string;
  sourceRange?: { start: number; end: number };
  sourceSectionId?: string;
  sourceSectionHeading?: string;
  sourceExcerpt?: string;
  sourceLineRange?: { startLine: number; endLine: number };
  sourceText: string;
  visualType: string;
  confidence: number;
  detectionMethod: CandidateSource;
  source: CandidateSource;
  ruleConfidence?: number;
  aiConfidence?: number;
  finalConfidence: number;
  ruleReason?: string;
  aiReason?: string;
  mergedReason?: string;
  title: string;
  rationale: string;
  extractedItems: unknown[];
  recommendedTemplates?: string[];
  status?: 'suggested' | 'previewing' | 'applied' | 'rejected';
  uiStatus?: CandidateStatus;
  figureType?: 'diagram' | 'chart' | 'table';
  suggestedTheme?: string;
  sourceGroupId?: string;
  rejectionReason?: string;
  warnings?: string[];
  data: {
    type: FigureKind;
    title: string;
    chart?: ChartModel;
    diagram?: DiagramModel;
    table?: TableModel;
  };
}

export interface RankedVisualCandidate extends VisualCandidate {
  uid: string;
  rank: number;
  alternativeVisualTypes: Array<{
    visualType: string;
    score: number;
    reason: string;
  }>;
  dataCompleteness: number;
  validationError?: string;
  evidenceStrength: number;
  userReviewRequired: boolean;
}

export interface RuleReliability {
  ruleId: string;
  totalRuns: number;
  matchedRuns: number;
  aiAgreement: number;
  aiDisagreement: number;
  provisionalSuggestions: number;
  conflictCount: number;
  reliabilityScore: number;
  status: "experimental" | "stable" | "trusted" | "needs_review";
}

export interface CalibrationCase {
  id: string;
  timestamp: string;
  inputSnippet: string;
  ruleCandidateSummary: string;
  aiCandidateSummary: string;
  differenceType: "rule_missing_ai_found" | "ai_missing_rule_found" | "type_conflict" | "title_conflict" | "aligned";
  decision: "pending" | "user_accepted_ai" | "user_accepted_rule" | "user_rejected" | "aligned";
  safeForRuleLearning: boolean;
}

export interface CalibrationLog {
  id: string;
  timestamp: string;
  inputCommand: string;
  ruleResult: string;
  aiResult: string;
  finalDecision: string;
  reason: string;
  confidence: number;
  suggestedRulePatch?: Partial<Rule>;
  resolvedConflict: boolean;
}

export interface DomainKnowledgePack {
  id: string;
  name: string;
  keywords: string[];
  entityHints: Array<{
    keyword: string;
    entityType: EntityType;
  }>;
  relationHints: Array<{
    pattern: string;
    relationType: RelationType;
  }>;
  preferredVisualTypes: VisualCandidateType[];
}

export interface FigureQualityReport {
  score: number;
  level: "not_ready" | "needs_revision" | "usable" | "ready";
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    severity: "low" | "medium" | "high";
    message: string;
  }>;
}

export interface QualityScoreV3 {
  visualQuality: number;
  academicQuality: number;
  publicationReadiness: number;
  exportReadiness: number;
  overall: number;
  warnings: string[];
}

export interface EvaluationCase {
  id: string;
  title: string;
  domain: string;
  inputText: string;
  expectedBlocks: Array<{
    type: string;
    textIncludes: string[];
  }>;
  expectedEntities: Array<{
    label: string;
    entityType: string;
  }>;
  expectedRelations: Array<{
    fromLabel: string;
    toLabel: string;
    relationType: string;
  }>;
  expectedVisualTypes: string[];
  expectedPrimaryVisualType: string;
}

export interface UserCorrectionEvent {
  id: string;
  timestamp: string;
  documentHash?: string;
  eventType:
    | "candidate_accepted"
    | "candidate_rejected"
    | "candidate_modified"
    | "visual_type_changed"
    | "template_changed"
    | "object_edited"
    | "quality_fix_applied"
    | "export_completed";
  originalCandidateId?: string;
  originalVisualType?: string;
  selectedVisualType?: string;
  originalTemplate?: string;
  selectedTemplate?: string;
  objectId?: string;
  commandText?: string;
  domainPack?: string;
  sourceBlockIds?: string[];
  aiSuggestionUsed?: boolean;
  ruleId?: string;
  note?: string;
}

export interface HumanFeedbackDataset {
  id: string;
  createdAt: string;
  totalEvents: number;
  acceptedCandidates: number;
  rejectedCandidates: number;
  modifiedCandidates: number;
  visualTypeChanges: number;
  templateChanges: number;
  exportsCompleted: number;
  topRejectedVisualTypes: Array<{ visualType: string; count: number }>;
  topAcceptedVisualTypes: Array<{ visualType: string; count: number }>;
  ruleImpact: Array<{
    ruleId: string;
    accepted: number;
    rejected: number;
    modified: number;
  }>;
}

export interface RulePromotionSuggestion {
  ruleId: string;
  ruleName: string;
  appearances: number;
  aiAgreementRate: number;
  userAcceptanceRate: number;
  userModificationRate: number;
  conflictRate: number;
  recommendation:
    | "promote_to_confirmed"
    | "keep_testing"
    | "needs_review"
    | "reject";
  reason: string;
}

export interface RuleRetirementSuggestion {
  ruleId: string;
  ruleName: string;
  conflictRate: number;
  rejectionRate: number;
  modificationRate: number;
  recommendation:
    | "keep"
    | "review"
    | "deprioritize"
    | "retire";
  reason: string;
}

export interface A4ComplianceResult {
  passed: boolean;
  orientation: "portrait" | "landscape";
  printableAreaFit: number;
  captionFit: boolean;
  sourceFit: boolean;
  grayscaleSafe: boolean;
  warnings: string[];
}

export interface ExportQualityAudit {
  format: "pdf" | "png" | "svg";
  passed: boolean;
  warnings: string[];
  risks: Array<{
    risk: string;
    severity: "low" | "medium" | "high";
    fixSuggestion: string;
  }>;
}

export interface BenchmarkResult {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  passRate: number;
  blockAccuracy: number;
  entityPrecision: number;
  entityRecall: number;
  relationPrecision: number;
  relationRecall: number;
  visualIntentAccuracy: number;
  primaryVisualAccuracy: number;
  failureLog: Array<{
    caseId: string;
    domain: string;
    issue: string;
    expected: unknown;
    actual: unknown;
  }>;
}

// --- CORPUS REPLAY & PUBLICATION AUDIT V2 ---
export type CorpusSourceType = "text" | "pdf_text" | "pdf_scan";

export interface CorpusDocument {
  id: string;
  title: string;
  domain: string;
  sourceType: CorpusSourceType;
  rawText: string;
  createdAt: string;
  tags?: string[];
}

export interface CorpusReplayResult {
  documentId: string;
  runId: string;
  candidates: RankedVisualCandidate[];
  appliedRules: string[];
  aiUsed: boolean;
  finalPrimaryVisualType?: string;
  warnings: string[];
  createdAt: string;
}

export interface FeedbackSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  documentIds: string[];
  events: UserCorrectionEvent[];
  summary: HumanFeedbackDataset;
}

export interface RuleAccuracyTrend {
  ruleId: string;
  runs: Array<{
    date: string;
    total: number;
    accepted: number;
    rejected: number;
    modified: number;
    aiDisagreed: number;
    accuracy: number;
  }>;
  trend: "improving" | "stable" | "declining";
}

export type FigureKind = 'diagram' | 'chart' | 'table';

export type CandidateSource = 'rule' | 'ai' | 'merged';

export type VisualIntentType =
  | "compare"
  | "trend"
  | "process"
  | "relationship"
  | "matrix"
  | "summary"
  | "distribution"
  | "composition";

export interface RuleAnalysisResult {
  sourceTextHash?: string;
  detectedIntents: VisualIntentType[];
  extractedEntities: string[];
  extractedMetrics: string[];
  extractedRelations: string[];
  recommendedCandidates: VisualCandidate[];
  confidence: number;
  warnings?: string[];
}

export interface AIRecommendedFigure {
  title: string;
  figureType: FigureKind;
  visualType: string;
  intent: VisualIntentType;
  reason: string;
  confidence: number;
  extractedDataHint?: unknown;
  renderableData?: {
    diagram?: DiagramModel;
    chart?: ChartModel;
    table?: TableModel;
  };
}

export interface AIAnalysisResult {
  detectedIntent?: VisualIntentType;
  recommendedFigures: AIRecommendedFigure[];
  extractedEntities: string[];
  extractedMetrics: string[];
  extractedRelations: string[];
  confidence: number;
  rationale: string;
  warnings?: string[];
}

export interface ReconciledAnalysisResult {
  candidates: RankedVisualCandidate[];
  ruleResult?: RuleAnalysisResult;
  aiResult?: AIAnalysisResult;
  warnings: string[];
  analysisRunId: string;
}

export type CommandRoute =
  | "rule_only"
  | "geometry"
  | "ai_optional"
  | "ai_required"
  | "clarification_required";

export interface EditOperation {
  type: 'update_figure' | 'add_node' | 'update_data_point' | string;
  targetFigureId: string;
  targetType: string;
  summary: string;
  beforeSnapshot?: SavedFigure;
  afterSnapshot: SavedFigure; // Must be deep cloned
  validationStatus: 'valid' | 'invalid' | 'pending';
  warnings: string[];
  errors: string[];
}

export interface ReconciledCommandResult {
  intent: string;
  confidence: number;
  targetFigureId: string;
  targetType: string;
  operations: EditOperation[];
  warnings: string[];
  errors: string[];
  source: 'rule' | 'ai' | 'reconciled';
  requiresReview: boolean;
}

export interface RuleCommandResult extends ReconciledCommandResult {}

export interface AICommandResult extends ReconciledCommandResult {}

export interface RuleAiCalibrationLog {
  id: string;
  timestamp: string;
  analysisRunId?: string;
  inputText?: string;
  userCommand?: string;
  ruleResult?: unknown;
  aiResult?: unknown;
  reconciledResult?: unknown;
  userAction?:
    | "accepted_rule"
    | "accepted_ai"
    | "accepted_merged"
    | "rejected_all"
    | "edited_after_apply";
  finalFigureType?: FigureKind;
  notes?: string;
}
