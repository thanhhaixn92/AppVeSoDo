/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Sparkles,
  Download,
  Trash2,
  Trash,
  Plus,
  Type as FontIcon,
  Type,
  Square,
  Circle,
  Database,
  GitCommit,
  ArrowRight,
  Maximize,
  BookOpen,
  Copy,
  Check,
  CheckCircle2,
  Maximize2,
  Undo2,
  Redo2,
  PlusCircle,
  Minimize,
  HelpCircle,
  FileText,
  FileImage,
  Inbox,
  Search,
  Lightbulb,
  Settings2,
  ChevronLeft,
  ChevronRight,
  TableOfContents,
  RefreshCw,
  TrendingUp,
  Table as TableIcon,
  Settings,
  Wand2,
  Eye,
  EyeOff,
  Keyboard,
  KeyRound,
  ShieldCheck,
  LayoutGrid,
  Menu,
  MousePointer2,
  ZoomIn,
  ZoomOut,
  LayoutTemplate,
  X,
  Terminal,
  Compass,
  Mail,
  AlertTriangle,
  AlertCircle,
  Award,
  Layers,
  Briefcase,
  Lock,
  FolderOpen,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import {
  AcademicTheme,
  SavedFigure,
  ChartModel,
  DiagramModel,
  TableModel,
  DiagramNode,
  DiagramConnection,
  ShapeType,
  LineStyle,
  ChartDataPoint,
  VisualCandidate,
  Rule,
  VIR,
  RankedVisualCandidate,
  CalibrationLog,
  CalibrationCase,
  RuleReliability,
  PreviewFigure,
  WorkflowState,
} from "./types";
import { getStringHash } from "./academicArchitecture";
import ThemeSelector, {
  getThemeFont,
  getThemeColors,
  THEMES,
} from "./components/ThemeSelector";
import { M1DLitePropertyPanel } from "./components/M1DLitePropertyPanel";
import { FigureAuditPanel } from "./components/FigureAuditPanel";
import { useFigureQuality } from "./hooks/useFigureQuality";
import { ExportModal } from "./components/ExportModal";
import { Header } from "./components/Header";
import { CommandEditor } from "./components/CommandEditor";
import { FigureRenderer } from "./components/FigureRenderer";
import { CandidateThumbnail } from "./components/CandidateThumbnail";
import { DatasetFirstCandidateList } from "./components/DatasetFirstCandidateList";
import {
  hasRenderablePayload,
  getFigurePayloadError,
  validateRenderableFigurePayload,
  buildPreviewFigureFromCandidate,
  buildSavedFigureFromCandidate,
} from "./lib/workflowUtils";
import { buildPdfAcademicFooterHtml, escapeHtmlText, buildFigureNumberingMap, getFigureCaptionText, getFigureSourceCitation, resolveFigureExportMetadata } from "./lib/figureCaptionMetadata";
import { buildPngExportSvgWithFooter, buildAcademicExportSvg } from "./lib/exportFigureSvg";
import { generateFigureLatex } from "./lib/exportLatex";
import { processCommand } from "./commandProcessor";
import { COMPREHENSIVE_THEMES } from "./themes";
import {
  DEFAULT_RULES,
  parseDocumentToCandidates,
  routeCommand,
  segmentDocument,
  runAICalibration,
  standardizeObjectId,
  migrateFigureObjectIDs,
  convertToVIR,
  renderVIRToFigure,
  calculateRuleReliability,
  runBenchmark,
  parseDocumentWithAI,
  CalibrationResult,
  DOMAIN_PACKS,
  analyzeFeedbackForRuleGovernance,
  runExportAudit,
  performCorpusReplay,
  calculateRuleAccuracyTrend,
} from "./academicArchitecture";
import { WorkflowStepper } from "./components/WorkflowStepper";
import { runRuleAnalysis } from "./analysis/ruleAnalyzer";
import { runAIAnalysis } from "./analysis/aiAnalyzer";
import { analyzeDocumentWithAIContract } from "./analysis/aiAnalysisAdapter";
import { reconcileAnalysisResults } from "./analysis/analysisReconciler";
import { normalizeCandidates, dedupeAndRankCandidates } from "./analysis/candidateNormalizer";
import { parseCommandByRule } from "./commands/ruleCommandParser";
import { interpretCommandByAI } from "./commands/aiCommandInterpreter";
import { useFigureSelection } from "./hooks/useFigureSelection";
import { useCommandProposalActions } from "./hooks/useCommandProposalActions";
import { reconcileCommandResults } from "./commands/commandReconciler";
import { INITIAL_SAVED_FIGURES } from "./data/initialFigures";
import { loadWorkspaceDraft, saveWorkspaceDraft, clearWorkspaceDraft } from "./lib/workspaceDraft";
import { RichDocumentEditor } from "./components/RichDocumentEditor";
import { useDocumentWorkflow } from "./hooks/useDocumentWorkflow";
import { useCandidateWorkflow } from "./hooks/useCandidateWorkflow";
import { useCanvasViewport } from "./hooks/useCanvasViewport";

// --- CANDIDATE UI HELPERS (R7C-2B) ---
function getCandidateSourceLabel(source: string): string {
  if (source === "merged" || source === "hybrid" || source === "rule_ai" || source === "rule+ai") {
    return "Kết hợp AI + quy tắc";
  }
  if (source === "ai" || source === "ai_only") {
    return "Theo AI";
  }
  if (source === "rule" || source === "rule_only") {
    return "Theo quy tắc";
  }
  return "Tự động";
}



function sanitizeValidationError(err: string | undefined): string {
  if (!err) return "Dữ liệu chưa đủ để tạo đề xuất này.";
  if (err.includes("diagram payload") || err.includes("Sơ đồ chưa có")) {
    return "Sơ đồ chưa có đủ khối (node) hoặc liên kết (edge) để hiển thị.";
  }
  if (err.includes("chart payload") || err.includes("Biểu đồ chưa có")) {
    return "Biểu đồ chưa có đủ số liệu hoặc cột dữ liệu hợp lệ.";
  }
  if (err.includes("table payload") || err.includes("Bảng chưa có")) {
    return "Bảng chưa có đủ cấu trúc dòng và cột để hiển thị.";
  }
  return "Dữ liệu chưa đủ định dạng cho đề xuất này.";
}

import { CandidateStatus } from "./types";
import { getCandidateUiStatus, isCandidateApplicable, isCandidatePreviewable, isCandidateUsable, NormalizedVisualCandidate, normalizeVisualCandidates, dedupeCandidatesPreservingMetadata } from "./analysis/candidateModel";
// -------------------------------------
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart as RePieChart,
  Pie,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { EVALUATION_DATASET } from "./evaluationDataset";
import {
  BenchmarkResult,
  DomainKnowledgePack,
  UserCorrectionEvent,
  HumanFeedbackDataset,
  CorpusDocument,
  CorpusReplayResult,
  FeedbackSession,
  ReconciledCommandResult,
} from "./types";

// Default mock templates representing highly realistic thesis scenarios
const STORAGE_KEY = "vms_navigator_pro_v1";

function loadPersistedState<T>(keySuffix: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const data = localStorage.getItem(`${STORAGE_KEY}_${keySuffix}`);
    if (!data) return fallback;
    const parsed = JSON.parse(data);
    // Basic validation: ensure savedFigures is an array if that's what we expect
    if (keySuffix === "figures") {
      if (!Array.isArray(parsed)) return fallback;
      return parsed.map((f) => migrateFigureObjectIDs(f)) as any;
    }
    return parsed;
  } catch (e) {
    console.warn(`[Storage] Failed to load ${keySuffix}, falling back.`, e);
    return fallback;
  }
}

export default function App() {
  const initialDraft = useMemo(() => loadWorkspaceDraft(), []);

  const [savedFigures, setSavedFigures] = useState<SavedFigure[]>(() => {
    if (initialDraft?.savedFigures && initialDraft.savedFigures.length > 0) {
      return initialDraft.savedFigures.map((f) => migrateFigureObjectIDs(f));
    }
    const loaded = loadPersistedState("figures", INITIAL_SAVED_FIGURES);
    return loaded.map((f) => migrateFigureObjectIDs(f));
  });
  const [currentFigureId, setCurrentFigureId] = useState<string>(() => {
    if (initialDraft?.currentFigureId) return initialDraft.currentFigureId;
    return loadPersistedState("active_id", "f1");
  });
  const [editingFigureId, setEditingFigureId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState<string>("");

  // Mobile Navigation state
  const [mobileViewTab, setMobileViewTab] = useState<
    "canvas" | "tools" | "properties"
  >("canvas");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Visual Configuration
  const [theme, setTheme] = useState<AcademicTheme>("apa");
  const [isDoubleColumn, setIsDoubleColumn] = useState<boolean>(false);

  // AI Prompt Tool State
  const [aiPrompt, setAiPrompt] = useState<string>("");

  // AI Edit Mode and Sidebar/Canvas Expansion state controls
  const [isAiEditMode, setIsAiEditMode] = useState<boolean>(true);
  const [isFullscreenCanvas, setIsFullscreenCanvas] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [pendingProposal, setPendingProposal] =
    useState<ReconciledCommandResult | null>(null);

  // --- CUSTOM CONSOLE BAR STATES ---
  const [commandInput, setCommandInput] = useState<string>("");
  const [chatLogs, setChatLogs] = useState<
    {
      id: string;
      type:
        | "command"
        | "rule"
        | "ai"
        | "error"
        | "clarification"
        | "onboarding";
      text: string;
      options?: { label: string; command: string }[];
      showKeyInput?: boolean;
    }[]
  >([
    {
      id: "welcome_1",
      type: "onboarding",
      text: "🤖 **VMS Navigator CLI**: Thiết kế / chỉnh sửa hình học thuật rảnh tay qua dòng lệnh.",
    },
    {
      id: "welcome_2",
      type: "onboarding",
      text: '💡 Thử gõ: **"thêm node Tiền xử lý sau n1"**, **"đổi màu n2 thành xanh lá"**, **"nối n3 với n5"**, hoặc bấm các **Shortcuts Gợi ý** nhanh bên dưới.',
    },
  ]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [cmdHistoryIdx, setCmdHistoryIdx] = useState<number>(-1);
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");
  const [isApiKeyOpen, setIsApiKeyOpen] = useState<boolean>(false);
  const [activeClarification, setActiveClarification] = useState<{
    question: string;
    options: { label: string; command: string }[];
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  // Main Tab State (chart | diagram | table)
  const [activeTab, setActiveTab] = useState<"diagram" | "chart" | "table">(
    "diagram",
  );

  // --- SMART SLIDING WORKSPACE STATES ---
  const [isFocusMode, setIsFocusMode] = useState<boolean>(() =>
    loadPersistedState("focus_mode", false),
  );
  const [leftPanelState, setLeftPanelState] = useState<"closed" | "open">(
    "closed",
  );
  const [rightPanelState, setRightPanelState] = useState<"closed" | "open">(
    "closed",
  );
  const [activeLeftPanelTab, setActiveLeftPanelTab] = useState<
    "source" | "suggestions" | "figures"
  >("source");
  const [activeRightPanelTab, setActiveRightPanelTab] = useState<
    "properties" | "audit"
  >("audit");

  // --- NEW ACADEMIC WORKFLOW STATES ---
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);
  const {
    documentText, rawDocumentText, rawDocumentTextStale, blocks,
    handleDocumentBlocksChange, handleInsertContent, handleImportDocument,
    handleLoadSample, handleResetDocument, getAnalysisInputText,
  } = useDocumentWorkflow(initialDraft);
  const [optimizeDiff, setOptimizeDiff] = useState<any | null>(null);
  const [showOptimizePreview, setShowOptimizePreview] =
    useState<boolean>(false);
  const [tempOptimizedFigure, setTempOptimizedFigure] =
    useState<SavedFigure | null>(null);
  const [sidebarTab, setSidebarTab] = useState<
    "command" | "extract" | "calibration" | "routing"
  >("command");

  // --- NEW WORKFLOW STATE (PHASE 4) ---
  const [workflowState, setWorkflowState] = useState<WorkflowState>(() => {
    if (initialDraft?.workflowState) return initialDraft.workflowState;
    return "EMPTY";
  });

  // Custom Rules & Calibration states
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES);
  const [calibrationHist, setCalibrationHist] = useState<CalibrationLog[]>([]);
  const [activeCalibrationCases, setActiveCalibrationCases] = useState<
    CalibrationCase[]
  >([]);
  const [activeCalibration, setSelectedCalibrationLog] =
    useState<CalibrationLog | null>(null);
  const [ocrWarning, setOcrWarning] = useState<string | null>(null);

  // --- GOVERNANCE & FEEDBACK LOOP ---
  const [correctionEvents, setCorrectionEvents] = useState<
    UserCorrectionEvent[]
  >(() => {
    try {
      const saved = localStorage.getItem("vms_correction_events");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [feedbackDataset, setFeedbackDataset] =
    useState<HumanFeedbackDataset | null>(null);

  const logEvent = (evt: Omit<UserCorrectionEvent, "id" | "timestamp">) => {
    const newEvent: UserCorrectionEvent = {
      ...evt,
      id: `EVT_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setCorrectionEvents((prev) => {
      const updated = [...prev, newEvent];
      localStorage.setItem("vms_correction_events", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    // Advanced Aggregation for Feedback Dataset
    const visualTypeCounts: Record<
      string,
      { accepted: number; rejected: number }
    > = {};
    const rulesImpactMap: Record<
      string,
      { accepted: number; rejected: number; modified: number }
    > = {};

    correctionEvents.forEach((e) => {
      // Track Visual Types performance
      if (e.selectedVisualType || e.originalVisualType) {
        const vt = e.selectedVisualType || e.originalVisualType || "unknown";
        if (!visualTypeCounts[vt])
          visualTypeCounts[vt] = { accepted: 0, rejected: 0 };
        if (e.eventType === "candidate_accepted")
          visualTypeCounts[vt].accepted++;
        if (e.eventType === "candidate_rejected")
          visualTypeCounts[vt].rejected++;
      }

      // Track Rules impact
      if (e.ruleId) {
        if (!rulesImpactMap[e.ruleId])
          rulesImpactMap[e.ruleId] = { accepted: 0, rejected: 0, modified: 0 };
        if (e.eventType === "candidate_accepted")
          rulesImpactMap[e.ruleId].accepted++;
        if (e.eventType === "candidate_rejected")
          rulesImpactMap[e.ruleId].rejected++;
        if (e.eventType === "candidate_modified")
          rulesImpactMap[e.ruleId].modified++;
      }
    });

    const topAccepted = Object.entries(visualTypeCounts)
      .map(([vt, counts]) => ({ visualType: vt, count: counts.accepted }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topRejected = Object.entries(visualTypeCounts)
      .map(([vt, counts]) => ({ visualType: vt, count: counts.rejected }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const ruleImpactArr = Object.entries(rulesImpactMap).map(([id, stats]) => ({
      ruleId: id,
      ...stats,
    }));

    const dataset: HumanFeedbackDataset = {
      id: `SET_${Date.now()}`,
      createdAt: new Date().toISOString(),
      totalEvents: correctionEvents.length,
      acceptedCandidates: correctionEvents.filter(
        (e) => e.eventType === "candidate_accepted",
      ).length,
      rejectedCandidates: correctionEvents.filter(
        (e) => e.eventType === "candidate_rejected",
      ).length,
      modifiedCandidates: correctionEvents.filter(
        (e) => e.eventType === "candidate_modified",
      ).length,
      visualTypeChanges: correctionEvents.filter(
        (e) => e.eventType === "visual_type_changed",
      ).length,
      templateChanges: correctionEvents.filter(
        (e) => e.eventType === "template_changed",
      ).length,
      exportsCompleted: correctionEvents.filter(
        (e) => e.eventType === "export_completed",
      ).length,
      topRejectedVisualTypes: topRejected,
      topAcceptedVisualTypes: topAccepted,
      ruleImpact: ruleImpactArr,
    };
    setFeedbackDataset(dataset);
  }, [correctionEvents]);

  // Routing matrix & calibration workspace live values
  const [routingInput, setRoutingInput] = useState<string>("");
  const [routingResult, setRoutingResult] = useState<any | null>(null);
  const [activeRuleTab, setActiveRuleTab] = useState<
    "user_confirmed" | "system" | "ai_provisional"
  >("system");
  const [newRuleName, setNewRuleName] = useState<string>("");
  const [newRuleKeywords, setNewRuleKeywords] = useState<string>("");

  const numberingMap = useMemo(() => buildFigureNumberingMap(savedFigures), [savedFigures]);

  // Interactive Node Drag State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<
    string | null
  >(null);
  const [draggingNode, setDraggingNode] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // New UI states for layout requirements
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const { viewport, setViewport, zoomIn, zoomOut, resetViewport, handlePointerDown, handlePointerMove, handlePointerUp } = useCanvasViewport();
  const zoomLevel = viewport.zoom;
  const setZoomLevel = useCallback((val: React.SetStateAction<number>) => {
    setViewport(prev => ({
      ...prev,
      zoom: typeof val === 'function' ? val(prev.zoom) : val
    }));
  }, [setViewport]);

  const isManualZoomRef = useRef(false);
  const [zoomDropdownOpen, setZoomDropdownOpen] = useState(false);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [exportModalState, setExportModalState] = useState<{
    isOpen: boolean;
    tab: "png" | "svg" | "pdf" | "tikz";
  }>({ isOpen: false, tab: "png" });
  const [contextMenuState, setContextMenuState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    nodeId: string | null;
  }>({ visible: false, x: 0, y: 0, nodeId: null });
  const [projectTitle, setProjectTitle] = useState(() =>
    loadPersistedState(
      "project_title",
      "VMS Navigator \u2014 Hoa Ti\u00EAu MB",
    ),
  );
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(new Date());

  // Unified Smart Panels State
  const [activeMainScreen, setActiveMainScreen] = useState<
    "document" | "drawings" | "canvas"
  >(() => (initialDraft?.activeLeftTab === "visualization" ? "drawings" : "document"));
  const [activeRightSidebar, setActiveRightSidebar] = useState<
    "assistant" | "properties" | "history" | "settings" | null
  >(() => (initialDraft?.activeRightTab as any) || null);
  
  const [activeHeaderTab, setActiveHeaderTab] = useState<
    "document" | "analysis" | "visualization" | "publication" | "export"
  >("document");
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);
  const [selectedFigureId, setSelectedFigureId] = useState<string | null>(() => initialDraft?.selectedFigureId || null);

  // --- PHASE 1 WORKFLOW RECOVERY STATES ---
  const {
    visualCandidates,
    selectedCandidateUid,
    previewFigure,
    previewError,
    aiStatus,
    isGenerating,
    setAiStatus,
    setIsGenerating,
    isAiTemporarilyBlocked,
    setPreviewFigure,
    handleAnalyzeDocumentText,
    handlePreviewCandidate,
    handleApplyCandidate,
    clearPreview,
    clearVisualCandidates,
  } = useCandidateWorkflow({
    initialDraft,
    theme,
    geminiApiKey,
    onAnalysisStart: () => setWorkflowState("ANALYZING"),
    onAnalysisSuccess: (found, warnings) => {
      if (found) {
        setWorkflowState("CANDIDATES_READY");
        setActiveMainScreen("drawings");
      } else {
        setWorkflowState("INPUT_READY");
        showToast("Không tìm thấy đề xuất thích hợp.");
      }
    },
    onAnalysisError: (err) => showToast(`Lỗi hệ thống: ${err.message}`),
    onCandidateApplied: (finalFigure, cand) => {
      saveToHistory();
      logEvent({
        eventType: "candidate_accepted",
        originalCandidateId: cand.id,
        originalVisualType: cand.visualType,
        domainPack: cand.visualType,
      });

      setActiveCalibrationCases((prev) =>
        prev.map((c) => {
          const isMatched =
            (c.ruleCandidateSummary.includes(cand.visualType) &&
              c.ruleCandidateSummary.includes(cand.title)) ||
            (c.aiCandidateSummary.includes(cand.visualType) &&
              c.aiCandidateSummary.includes(cand.title));
          if (isMatched) {
            return {
              ...c,
              decision:
                cand.source === "ai"
                  ? "user_accepted_ai"
                  : cand.source === "rule"
                    ? "user_accepted_rule"
                    : "aligned",
            };
          }
          return c;
        }),
      );

      setSavedFigures((prev) => [...prev, finalFigure]);
      handleSelectActiveFigure(finalFigure.id);
      setActiveTab(finalFigure.type);
      setActiveHeaderTab("visualization");
      setActiveMainScreen("canvas");
      setLeftPanelState("closed");
      setRightPanelState("closed");
      setWorkflowState("APPLIED_FIGURE");
      showToast(`Đã áp dụng Đề xuất: "${finalFigure.title}"! Kết quả đang hiển thị trên canvas.`);
    },
    onPreviewRequested: () => {
      clearSavedSelectionForPreview();
      setWorkflowState("PREVIEWING_CANDIDATE");
      setActiveRightSidebar("properties");
      setRightPanelCollapsed(false);
      setActiveMainScreen("canvas");
    },
    onShowToast: showToast,
    onCalibrationCasesUpdated: (newCases) => setActiveCalibrationCases((prev) => [...newCases, ...prev]),
    onCalibrationLogAdded: (log) => setCalibrationHist((prev) => [log, ...prev]),
    onOcrWarning: setOcrWarning,
  });

  // Hook for figure selection and preview clearing
  const { selectActiveFigure, clearSavedSelectionForPreview } =
    useFigureSelection({
      setSelectedFigureId,
      setCurrentFigureId,
      setPreviewFigure: clearPreview,
      setSelectedNodeId,
      setSelectedConnectionId,
    });

  const getAiServiceLabel = () => {
    switch (aiStatus.state) {
      case "available":
        return "DỊCH VỤ AI: ACTIVE";
      case "quota_limited":
        return "DỊCH VỤ AI: VƯỢT QUOTA";
      case "error":
        return "DỊCH VỤ AI: LỖI";
      case "unavailable":
        return "DỊCH VỤ AI: KHÔNG KHẢ DỤNG";
      case "rule_based":
        return "DỊCH VỤ AI: RULE-BASED";
      case "unknown":
      default:
        return "DỊCH VỤ AI: CHƯA XÁC ĐỊNH";
    }
  };

  const handleSelectActiveFigure = (id: string | null) => {
    selectActiveFigure(id);

    if (id) {
      setWorkflowState("EDITING_FIGURE");
      setActiveRightSidebar("properties");
      setRightPanelCollapsed(false);
    }
  };

  useEffect(() => {
    // Autosave workspace draft
    saveWorkspaceDraft({
      documentText,
      rawDocumentText,
      rawDocumentTextStale,
      visualCandidates,
      previewFigure,
      savedFigures,
      selectedCandidateUid,
      currentFigureId,
      selectedFigureId,
      workflowState,
      activeLeftTab: activeMainScreen === "drawings" ? "visualization" : "document",
      activeRightTab: activeRightSidebar || undefined,
    });
  }, [
    documentText,
    visualCandidates,
    previewFigure,
    savedFigures,
    selectedCandidateUid,
    currentFigureId,
    selectedFigureId,
    workflowState,
    activeMainScreen,
    activeRightSidebar,
  ]);

  const activeFigureId = selectedFigureId || currentFigureId;
  const activeSavedFigure = activeFigureId
    ? savedFigures.find((f) => f.id === activeFigureId) || null
    : null;

  const isPreviewSelected = Boolean(
    previewFigure &&
    workflowState === "PREVIEWING_CANDIDATE" &&
    selectedCandidateUid === previewFigure.sourceCandidateUid &&
    !activeSavedFigure,
  );

  const activeFigure = isPreviewSelected ? previewFigure : activeSavedFigure;
  const figureQuality = useFigureQuality(activeFigure);

  const headerQualityFeedback =
    figureQuality.status === "ready"
      ? figureQuality.checks
          .map((c: any) => c.message as string)
          .filter(Boolean)
          .slice(0, 3)
      : figureQuality.status === "invalid"
        ? [
            `Dữ liệu chưa sẵn sàng: ${figureQuality.renderableValidation.error ?? "Không hợp lệ"}`,
          ]
        : ["Chưa có hình để kiểm tra"];

  const getActiveCommandTarget = () => {
    if (isPreviewSelected && previewFigure) {
      return {
        figure: previewFigure,
        scope: "preview" as const,
        targetId: `preview_${previewFigure.sourceCandidateUid}`,
        renderable: true as const,
      };
    }

    if (activeSavedFigure) {
      return {
        figure: activeSavedFigure,
        scope: "saved" as const,
        targetId: activeSavedFigure.id,
        renderable: true as const,
      };
    }

    return null;
  };

  const activeCommandTarget = getActiveCommandTarget();

  // Validation for editable context using robust validator
  const isRenderableTarget = (target: any) => {
    if (!target?.figure) return false;
    return validateRenderableFigurePayload(target.figure).valid;
  };

  const hasEditableContext = Boolean(
    activeCommandTarget && isRenderableTarget(activeCommandTarget),
  );



  // Focus Mode ESC listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFocusMode) {
        setIsFocusMode(false);
        showToast("Đã thoát chế độ xem tập trung (Focus Mode)");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocusMode]);

  // --- Document Intelligence & Vietnam Academic Workflow States ---
  const [vietnamAcademicMode, setVietnamAcademicMode] = useState<
    "vietnam" | "admin" | "general"
  >("vietnam");
  const [activeDocTab, setActiveDocTab] = useState<
    "text" | "pdf" | "scan" | "csv"
  >("text");
  const [isGovernanceOpen, setIsGovernanceOpen] = useState(false);
  const [isVirInspectorOpen, setIsVirInspectorOpen] = useState(false);
  const [isCliConsoleOpen, setIsCliConsoleOpen] = useState(false);

  // Prioritize candidates based on active Vietnam Academic Mode
  const getPrioritizedCandidates = (
    candidates: RankedVisualCandidate[],
  ): RankedVisualCandidate[] => {
    if (!candidates) return [];
    if (vietnamAcademicMode === "vietnam") {
      return [...candidates]
        .map((cand) => {
          const titleLower = (cand.title || "").toLowerCase();
          const typeLower = (cand.visualType || "").toLowerCase();
          let boost = 0;
          if (
            titleLower.includes("ma trận") ||
            titleLower.includes("matrix") ||
            typeLower.includes("matrix") ||
            typeLower.includes("policy_matrix")
          )
            boost += 0.2;
          if (
            titleLower.includes("framework") ||
            titleLower.includes("khung") ||
            titleLower.includes("lý thuyết") ||
            titleLower.includes("phân tích")
          )
            boost += 0.18;
          if (
            titleLower.includes("timeline") ||
            titleLower.includes("lộ trình") ||
            titleLower.includes("tiến trình") ||
            typeLower.includes("timeline") ||
            typeLower.includes("roadmap") ||
            typeLower.includes("process")
          )
            boost += 0.15;
          if (
            titleLower.includes("bảng") ||
            titleLower.includes("table") ||
            typeLower.includes("table") ||
            typeLower.includes("summary_table")
          )
            boost += 0.12;
          if (
            titleLower.includes("mô hình") ||
            titleLower.includes("nghiên cứu") ||
            titleLower.includes("model")
          )
            boost += 0.15;

          if (titleLower.includes("uml") || typeLower.includes("uml"))
            boost -= 0.25;
          if (
            titleLower.includes("architecture") ||
            typeLower.includes("architecture") ||
            titleLower.includes("kiến trúc")
          )
            boost -= 0.25;
          if (
            titleLower.includes("technical") ||
            titleLower.includes("kỹ thuật") ||
            titleLower.includes("flowchart") ||
            titleLower.includes("flowchart")
          )
            boost -= 0.15;

          const newConf = Math.max(
            0.15,
            Math.min(0.99, cand.confidence + boost),
          );
          return { ...cand, confidence: newConf };
        })
        .sort((a, b) => b.confidence - a.confidence);
    } else if (vietnamAcademicMode === "admin") {
      return [...candidates]
        .map((cand) => {
          const titleLower = (cand.title || "").toLowerCase();
          const typeLower = (cand.visualType || "").toLowerCase();
          let boost = 0;
          if (
            typeLower.includes("chart") ||
            titleLower.includes("biểu đồ") ||
            titleLower.includes("thống kê") ||
            titleLower.includes("bar_chart") ||
            titleLower.includes("line_chart")
          )
            boost += 0.2;
          if (
            typeLower.includes("table") ||
            titleLower.includes("bảng") ||
            titleLower.includes("dữ liệu")
          )
            boost += 0.15;
          const newConf = Math.max(
            0.15,
            Math.min(0.99, cand.confidence + boost),
          );
          return { ...cand, confidence: newConf };
        })
        .sort((a, b) => b.confidence - a.confidence);
    }
    return candidates;
  };

  // Undo/Redo historical states
  const [history, setHistory] = useState<
    { id: string; data: any; type: string }[]
  >([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Active details editor references
  const canvasRef = useRef<SVGSVGElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const figureContentRef = useRef<HTMLDivElement | null>(null);
  const [canvasMouseCoords, setCanvasMouseCoords] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  // Get active loaded figure data
  const baseFigure =
    savedFigures.find((f) => f.id === currentFigureId) || savedFigures[0];
  const currentFigure =
    pendingProposal && pendingProposal.operations.length > 0
      ? pendingProposal.operations[pendingProposal.operations.length - 1]
          .afterSnapshot
      : baseFigure;

  const [benchmarkResult, setBenchmarkResult] =
    useState<BenchmarkResult | null>(null);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);

  // --- CORPUS & SESSION STATES ---
  const [corpusDocuments, setCorpusDocuments] = useState<CorpusDocument[]>(
    () => {
      try {
        const saved = localStorage.getItem("vms_corpus_docs");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    },
  );
  const [replayResults, setReplayResults] = useState<CorpusReplayResult[]>(
    () => {
      try {
        const saved = localStorage.getItem("vms_replay_results");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    },
  );
  const [isReplaying, setIsReplaying] = useState(false);
  const [currentSession, setCurrentSession] = useState<FeedbackSession | null>(
    null,
  );

  // Start a feedback session if none exists
  useEffect(() => {
    if (!currentSession) {
      setCurrentSession({
        id: `SESS_${Date.now()}`,
        startedAt: new Date().toISOString(),
        documentIds: [],
        events: [],
        summary: {
          id: `DS_SESS_${Date.now()}`,
          createdAt: new Date().toISOString(),
          totalEvents: 0,
          acceptedCandidates: 0,
          rejectedCandidates: 0,
          modifiedCandidates: 0,
          visualTypeChanges: 0,
          templateChanges: 0,
          exportsCompleted: 0,
          topRejectedVisualTypes: [],
          topAcceptedVisualTypes: [],
          ruleImpact: [],
        },
      });
    }
  }, []);

  // Persist focus mode
  useEffect(() => {
    localStorage.setItem(
      `${STORAGE_KEY}_focus_mode`,
      JSON.stringify(isFocusMode),
    );
  }, [isFocusMode]);

  // Auto-init visual candidates on load removed (R3B Requirement)
  useEffect(() => {
    // Explicit user action required to analyze
  }, []);

  const handleRunBenchmark = async () => {
    setIsRunningBenchmark(true);
    const res = await runBenchmark(EVALUATION_DATASET, rules);
    setBenchmarkResult(res);
    setIsRunningBenchmark(false);
    showToast(
      `Benchmark hoàn tất: Pass Rate ${res.passRate}% (${res.passedCases}/${res.totalCases})`,
    );
  };

  const handleRunCorpusReplay = async () => {
    setIsReplaying(true);
    const results = await performCorpusReplay(corpusDocuments, rules);
    setReplayResults(results);
    localStorage.setItem("vms_replay_results", JSON.stringify(results));
    setIsReplaying(false);
    showToast(`Đã replay ${results.length} tài liệu từ Corpus thật!`);
  };

  const exportFeedbackDataset = () => {
    if (!feedbackDataset) return;
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(
        JSON.stringify(
          {
            session: currentSession,
            dataset: feedbackDataset,
            events: correctionEvents,
          },
          null,
          2,
        ),
      );
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute(
      "download",
      `VMS_Feedback_Dataset_${Date.now()}.json`,
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showToast("Đã xuất dữ liệu Feedback Dataset ra JSON!");
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const timer = setTimeout(() => {
        localStorage.setItem(
          `${STORAGE_KEY}_figures`,
          JSON.stringify(savedFigures),
        );
        localStorage.setItem(
          `${STORAGE_KEY}_active_id`,
          JSON.stringify(currentFigureId),
        );
        localStorage.setItem(
          `${STORAGE_KEY}_project_title`,
          JSON.stringify(projectTitle),
        );
        setLastSaveTime(new Date());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [savedFigures, currentFigureId, projectTitle]);

  useEffect(() => {
    if (history.length === 0 && savedFigures.length > 0) {
      const snapshot = JSON.stringify(savedFigures);
      setHistory([{ id: currentFigureId, data: snapshot, type: activeTab }]);
      setHistoryIndex(0);
    }
  }, []);

  useEffect(() => {
    if (currentFigure) {
      setActiveTab(currentFigure.type);
      setTheme(currentFigure.theme);
      if (currentFigure.type === "chart" && currentFigure.chart) {
        setIsDoubleColumn(currentFigure.chart.config.isDoubleColumn);
      }
    }
  }, [currentFigureId]);

  useEffect(() => {
    const thread = document.getElementById("chat-thread-scroll");
    if (thread) {
      thread.scrollTop = thread.scrollHeight;
    }
  }, [chatLogs]);

  // Responsive default setup for mobile devices
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsLeftSidebarOpen(false);
        setZoomLevel((prev) => (prev === 1 ? 0.45 : prev));
      } else {
        setIsLeftSidebarOpen(true);
        setZoomLevel((prev) => (prev === 0.45 ? 0.95 : prev));
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle Dragging Events for Interactive Flowchart blocks
  const handleMouseDownNode = (e: React.MouseEvent, node: DiagramNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setSelectedConnectionId(null);
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = rect.width ? 800 / rect.width : 1;
    const scaleY = rect.height ? 500 / rect.height : 1;

    // Calculate precise mouse offset within the shape scaled to SVG coordinate space
    const mouseXInCanvas = (e.clientX - rect.left) * scaleX;
    const mouseYInCanvas = (e.clientY - rect.top) * scaleY;

    const nX = typeof node.x === "number" && !isNaN(node.x) ? node.x : 100;
    const nY = typeof node.y === "number" && !isNaN(node.y) ? node.y : 100;

    setDraggingNode({
      id: node.id,
      offsetX: mouseXInCanvas - nX,
      offsetY: mouseYInCanvas - nY,
    });
  };

  const handleTouchStartNode = (e: React.TouchEvent, node: DiagramNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setSelectedConnectionId(null);
    if (!canvasRef.current || e.touches.length === 0) return;

    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = rect.width ? 800 / rect.width : 1;
    const scaleY = rect.height ? 500 / rect.height : 1;

    const touchXInCanvas = (touch.clientX - rect.left) * scaleX;
    const touchYInCanvas = (touch.clientY - rect.top) * scaleY;

    const nX = typeof node.x === "number" && !isNaN(node.x) ? node.x : 100;
    const nY = typeof node.y === "number" && !isNaN(node.y) ? node.y : 100;

    setDraggingNode({
      id: node.id,
      offsetX: touchXInCanvas - nX,
      offsetY: touchYInCanvas - nY,
    });
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = rect.width ? 800 / rect.width : 1;
    const scaleY = rect.height ? 500 / rect.height : 1;

    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    setCanvasMouseCoords({ x, y });

    if (draggingNode && currentFigure.diagram) {
      const updatedNodes = currentFigure.diagram.nodes.map((n) => {
        if (n.id === draggingNode.id) {
          // Snap slightly to a 5px grid for academic crisp alignment
          const rawX = x - draggingNode.offsetX;
          const rawY = y - draggingNode.offsetY;
          const snapGrid = gridEnabled ? 5 : 1;
          const snappedX = Math.round(rawX / snapGrid) * snapGrid;
          const snappedY = Math.round(rawY / snapGrid) * snapGrid;

          return {
            ...n,
            x: Math.max(10, Math.min(800, snappedX)),
            y: Math.max(10, Math.min(500, snappedY)),
          };
        }
        return n;
      });

      updateCurrentFigureDiagram({ nodes: updatedNodes });
    }
  };

  const handleTouchMoveCanvas = (e: React.TouchEvent) => {
    if (!canvasRef.current || e.touches.length === 0) return;

    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = rect.width ? 800 / rect.width : 1;
    const scaleY = rect.height ? 500 / rect.height : 1;

    const x = Math.round((touch.clientX - rect.left) * scaleX);
    const y = Math.round((touch.clientY - rect.top) * scaleY);
    setCanvasMouseCoords({ x, y });

    if (draggingNode && currentFigure.diagram) {
      // Prevent screen scrolling when dragging flowchart elements
      if (e.cancelable) {
        e.preventDefault();
      }

      const updatedNodes = currentFigure.diagram.nodes.map((n) => {
        if (n.id === draggingNode.id) {
          const rawX = x - draggingNode.offsetX;
          const rawY = y - draggingNode.offsetY;
          const snapGrid = gridEnabled ? 5 : 1;
          const snappedX = Math.round(rawX / snapGrid) * snapGrid;
          const snappedY = Math.round(rawY / snapGrid) * snapGrid;

          return {
            ...n,
            x: Math.max(10, Math.min(800, snappedX)),
            y: Math.max(10, Math.min(500, snappedY)),
          };
        }
        return n;
      });

      updateCurrentFigureDiagram({ nodes: updatedNodes });
    }
  };

  const handleMouseUpCanvas = () => {
    if (draggingNode) {
      saveToHistory();
      setDraggingNode(null);
    }
  };

  const handleTouchEndCanvas = () => {
    if (draggingNode) {
      saveToHistory();
      setDraggingNode(null);
    }
  };

  // State updates helpers
  const updateCurrentFigureDiagram = (updates: Partial<DiagramModel>) => {
    setSavedFigures((prev) =>
      prev.map((fig) => {
        if (fig.id === currentFigureId) {
          return {
            ...fig,
            diagram: {
              ...fig.diagram!,
              ...updates,
            },
          };
        }
        return fig;
      }),
    );
  };

  const updateCurrentFigureChart = (updates: Partial<ChartModel>) => {
    setSavedFigures((prev) =>
      prev.map((fig) => {
        if (fig.id === currentFigureId) {
          return {
            ...fig,
            chart: {
              ...fig.chart!,
              ...updates,
            },
          };
        }
        return fig;
      }),
    );
  };

  const updateCurrentFigureTable = (updates: Partial<TableModel>) => {
    setSavedFigures((prev) =>
      prev.map((fig) => {
        if (fig.id === currentFigureId) {
          return {
            ...fig,
            table: {
              ...fig.table!,
              ...updates,
            },
          };
        }
        return fig;
      }),
    );
  };

  function saveToHistory() {
    // Basic history stack
    const snapshot = JSON.stringify(savedFigures);
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([
      ...newHistory,
      { id: currentFigureId, data: snapshot, type: activeTab },
    ]);
    setHistoryIndex(newHistory.length);
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const step = history[prevIdx];
      setSavedFigures(JSON.parse(step.data));
      setHistoryIndex(prevIdx);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const step = history[nextIdx];
      setSavedFigures(JSON.parse(step.data));
      setHistoryIndex(nextIdx);
    }
  };

  // Focus command bar on Space and Escape
  const commandInputRef = useRef<any>(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true");

      if (e.key === " " && !isTyping) {
        e.preventDefault(); // prevent scrolling page down
        commandInputRef.current?.focus();
      }

      if (e.key === "Escape" && isFocusMode) {
        setIsFocusMode(false);
        showToast("Đã thoát Chế độ tập trung (Focus Mode)");
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "z" &&
        !e.shiftKey &&
        !isTyping
      ) {
        e.preventDefault();
        handleUndo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey)) &&
        !isTyping
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [historyIndex, history.length, savedFigures, isFocusMode]);

  // Handle saving user dynamic API Key inline (Local only, not persisted on server)
  const handleSaveApiKey = (key: string) => {
    const cleanedKey = key.trim();
    if (cleanedKey) {
      localStorage.setItem("vms_local_ai_key", cleanedKey);
      setGeminiApiKey(cleanedKey);
      setIsApiKeyOpen(false);
      setAiStatus({ state: "unknown" }); // Reset aiStatus & blockedUntil
      showToast("Khóa AI Key cục bộ đã được ghi nhận. Dịch vụ AI sẽ được xác minh ở lần gọi tiếp theo! 🔐");
    }
  };

  useEffect(() => {
    // Avoid loading key from localStorage in production if requested,
    // but typically users want it. Let's stick to the prompt's security hint.
    const isProd = process.env.NODE_ENV === "production";
    if (!isProd) {
      const saved = localStorage.getItem("vms_local_ai_key");
      if (saved) setGeminiApiKey(saved);
    }
  }, []);

  // Modern unified command engine execution pipeline
  const executeCommand = async (cmdText: string) => {
    const text = cmdText.trim();
    const target = getActiveCommandTarget();

    if (!text || !target) {
      showToast(
        "Vui lòng chọn một trực quan hoặc đề xuất để bắt đầu hiệu chỉnh.",
      );
      return;
    }

    const { figure: targetFigure, targetId } = target;
    setWorkflowState("EDITING_FIGURE");

    const pendingLogId = "pending_ai_" + Date.now();
    setChatLogs((prev) =>
      [
        ...prev,
        {
          id: pendingLogId,
          type: "ai" as const,
          text: "⚡ Đang phân tích lệnh điều khiển...",
        },
      ].slice(-25),
    );

    // 1. Run Rule Parser
    const ruleResult = parseCommandByRule(
      text,
      targetFigure,
      selectedNodeId || selectedConnectionId,
    );

    // Set explicit target scope/id in result
    ruleResult.targetFigureId = targetId;
    ruleResult.targetType = targetFigure.type;

    // 2. Run AI Interpreter if needed
    let aiResult = null;
    const localKey =
      geminiApiKey || localStorage.getItem("vms_local_ai_key") || "";

    // Rule First Strategy
    if (ruleResult.confidence >= 0.9 && ruleResult.errors.length === 0) {
      // Skip AI
      setChatLogs((prev) =>
        prev
          .filter((l) => l.id !== pendingLogId)
          .concat([
            {
              id: "rule_info_" + Date.now(),
              type: "rule" as const,
              text: `✨ Rule Engine: ${ruleResult.operations[0]?.summary}`,
            },
          ])
          .slice(-25),
      );
    } else {
      // Try AI
      if (isAiTemporarilyBlocked()) {
        showToast(
          "AI đang tắt hoặc đã hết quota. Bạn có thể dùng dữ liệu mẫu hoặc thử lại sau.",
        );
      } else {
        setIsGenerating(true);
        aiResult = await interpretCommandByAI(text, targetFigure, localKey);
        
        if (aiResult) {
          aiResult.targetFigureId = targetId;
          aiResult.targetType = targetFigure.type;
          
          if (aiResult.errors && aiResult.errors.length > 0) {
            const errorMsg = aiResult.errors.join(" ").toLowerCase();
            if (errorMsg.includes("quota") || errorMsg.includes("exhausted") || errorMsg.includes("disabled")) {
               setAiStatus({ state: "quota_limited", blockedUntil: Date.now() + 60000, message: "AI đang bị giới hạn quota." });
            } else if (errorMsg.includes("khóa") || errorMsg.includes("key") || errorMsg.includes("hợp lệ")) {
               setAiStatus({ state: "unavailable", message: aiResult.errors[0] });
            } else {
               setAiStatus({ state: "error", blockedUntil: Date.now() + 30000, message: aiResult.errors[0] });
            }
          } else {
            if (aiStatus.state !== "available") {
               setAiStatus({ state: "available" });
            }
          }
        }
        setIsGenerating(false);
      }
    }

    // 3. Reconcile
    const finalResult = reconcileCommandResults(ruleResult, aiResult);

    // 4. Update UI
    if (finalResult.operations.length > 0 && finalResult.errors.length === 0) {
      setPendingProposal(finalResult);
      if (finalResult.source === "ai") {
        setChatLogs((prev) =>
          prev
            .filter((l) => l.id !== pendingLogId)
            .concat([
              {
                id: "ai_res_" + Date.now(),
                type: "ai" as const,
                text: `✨ [Gemini AI]: Đã chuẩn bị đề xuất hiệu chỉnh. Vui lòng kiểm tra và bấm Áp dụng.`,
              },
            ])
            .slice(-25),
        );
      }
    } else {
      setPendingProposal(null);
      setChatLogs((prev) =>
        prev
          .filter((l) => l.id !== pendingLogId)
          .concat([
            {
              id: "err_" + Date.now(),
              type: "error" as const,
              text: `❌ Lỗi thực thi: ${finalResult.errors.join(" | ")}`,
            },
          ])
          .slice(-25),
      );
    }
  };

  const { applyProposal, cancelProposal } = useCommandProposalActions({
    pendingProposal,
    savedFigures,
    setSavedFigures,
    previewFigure,
    setPreviewFigure,
    saveToHistory,
    setPreviewWorkflowState: () => setWorkflowState("PREVIEWING_CANDIDATE"),
    showToast,
    setPendingProposal,
  });

  const handleCommandBarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const txt = commandInput.trim();
    if (!txt) return;

    // Add search input to history
    const updatedHistory = [txt, ...cmdHistory.filter((c) => c !== txt)].slice(
      0,
      20,
    );
    setCmdHistory(updatedHistory);
    setCmdHistoryIdx(-1);

    // Clear prompt state and push user bubble to log
    setCommandInput("");
    setChatLogs((prev) =>
      [
        ...prev,
        { id: "user_" + Date.now(), type: "command" as const, text: txt },
      ].slice(-25),
    );

    executeCommand(txt);
  };

  const handleAssistantCommandSubmit = async (commandText: string) => {
    const text = commandText.trim();
    if (!text) return;

    // Add prompt input to history
    const updatedHistory = [text, ...cmdHistory.filter((c) => c !== text)].slice(
      0,
      20,
    );
    setCmdHistory(updatedHistory);
    setCmdHistoryIdx(-1);

    // 1. Append User Message
    setChatLogs((prev) =>
      [
        ...prev,
        { id: "user_" + Date.now(), type: "command" as const, text },
      ].slice(-25),
    );

    // 2. Clear command input
    setCommandInput("");

    // 3. Check for editable context/target
    const target = getActiveCommandTarget();
    if (!target) {
      showToast(
        "Vui lòng chọn một biểu đồ, bảng hoặc sơ đồ có nội dung để tinh chỉnh bằng lệnh.",
      );
      setChatLogs((prev) =>
        [
          ...prev,
          {
            id: "missing_ctx_" + Date.now(),
            type: "error" as const,
            text: "Vui lòng chọn một biểu đồ, bảng hoặc sơ đồ có nội dung để tinh chỉnh bằng lệnh.",
          },
        ].slice(-25)
      );
      return;
    }

    // 4. Run existing unified command engine execution pipeline
    await executeCommand(text);
  };

  const handleCommandBarKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIdx = cmdHistoryIdx + 1;
      if (nextIdx < cmdHistory.length) {
        setCmdHistoryIdx(nextIdx);
        setCommandInput(cmdHistory[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = cmdHistoryIdx - 1;
      if (nextIdx >= 0) {
        setCmdHistoryIdx(nextIdx);
        setCommandInput(nextIdx < cmdHistory.length ? cmdHistory[nextIdx] : "");
      } else {
        setCmdHistoryIdx(-1);
        setCommandInput("");
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  const getCommandInputPlaceholder = () => {
    if (activeTab === "diagram") {
      return "Thử: 'thêm node Trích xuất sau n1', 'đổi màu n2 thành đỏ', 'nối n3 với n5'...";
    } else if (activeTab === "chart") {
      return "Thử: 'đổi tên thành So sánh hiệu năng', 'thêm điểm Mẫu D 95'...";
    } else {
      return "Thử: 'thêm cột Độ chính xác', 'thêm hàng', 'xóa hàng 1'...";
    }
  };

  // Spectacular 1-Touch Super Optimizer (Phase 7 & 8 - calculates rule-based alignments and previews differences)
  const handleFitCanvas = useCallback(() => {
    isManualZoomRef.current = false; // Reset manual zoom lock when explicit fit is triggered
    if (canvasContainerRef.current && figureContentRef.current) {
      const containerRect = canvasContainerRef.current.getBoundingClientRect();
      const contentRect = figureContentRef.current.getBoundingClientRect();

      const safePadding = 64; // Increased safe padding to avoid cropping
      const availableWidth = Math.max(1, containerRect.width - safePadding);
      const availableHeight = Math.max(1, containerRect.height - safePadding);

      const naturalWidth = contentRect.width / zoomLevel;
      const naturalHeight = contentRect.height / zoomLevel;

      if (naturalWidth <= 0 || naturalHeight <= 0) {
        setZoomLevel(1);
        return;
      }

      const scaleX = availableWidth / naturalWidth;
      const scaleY = availableHeight / naturalHeight;
      const scale = Math.min(1.15, Math.max(0.55, Math.min(scaleX, scaleY)));
      setZoomLevel(Number(scale.toFixed(2)));
    }
  }, [zoomLevel]);

  // Reset manual zoom lock when the user switches to a different figure
  useEffect(() => {
    isManualZoomRef.current = false;
  }, [currentFigureId]);

  // Handle auto-fitting canvas on layout changes
  useEffect(() => {
    let timeoutId: any;
    const refit = () => {
      if (isManualZoomRef.current) return; // Do not override user's active manual zoom selection
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleFitCanvas();
      }, 50);
    };

    if (activeMainScreen === 'canvas') {
      refit();
    }

    const resizeObserver = new ResizeObserver(() => {
      if (activeMainScreen === 'canvas') {
        refit();
      }
    });

    if (canvasContainerRef.current) {
      resizeObserver.observe(canvasContainerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [activeMainScreen, activeRightSidebar, isLeftSidebarOpen, isFocusMode, selectedFigureId, selectedCandidateUid, previewFigure, savedFigures.length, handleFitCanvas]);

  const handleZoomIn = () => {
    isManualZoomRef.current = true;
    setZoomLevel((prev) => Math.min(prev + 0.1, 3));
  };
  const handleZoomOut = () => {
    isManualZoomRef.current = true;
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.2));
  };

  const handleAlignNodes = () => {
    if (!currentFigure || !currentFigure.diagram) return;
    const spacing = 180;
    const nodesPerRow = 3;
    const newNodes = currentFigure.diagram.nodes.map((node, idx) => ({
      ...node,
      x: 100 + (idx % nodesPerRow) * spacing,
      y: 100 + Math.floor(idx / nodesPerRow) * spacing,
    }));
    setSavedFigures((prev) =>
      prev.map((f) =>
        f.id === currentFigureId
          ? { ...f, diagram: { ...f.diagram!, nodes: newNodes } }
          : f,
      ),
    );
    showToast("Đã tối ưu hóa bố cục sơ đồ tự động");
  };

  const handleSuperOptimize = () => {
    if (!currentFigure) return;

    const diffsList: string[] = [];
    let optimizedClone: SavedFigure = { ...currentFigure };

    // 1. Diagnose and optimize Diagrams (Flowcharts, Frameworks, etc)
    if (currentFigure.type === "diagram" && currentFigure.diagram) {
      const diag = currentFigure.diagram;
      if (!diag.nodes || diag.nodes.length === 0) {
        showToast("Sơ đồ của bạn đang rỗng, không có nút nào cần tối ưu!");
        return;
      }

      diffsList.push(
        "Căn chỉnh tọa độ x/y của tất cả các nút khớp với hệ lưới 40px chuẩn đề án.",
      );
      diffsList.push(
        "Tính toán lại chiều rộng hộp chứa thông minh tương hợp với độ dài nhãn ký tự.",
      );
      diffsList.push("Tự động khử xuyên tâm chồng lấn vị trí có cự ly < 25px.");

      const optimizedNodes = diag.nodes.map((node) => {
        let newX = Math.round(node.x / 40) * 40;
        let newY = Math.round(node.y / 40) * 40;
        newX = Math.max(80, Math.min(newX, 720));
        newY = Math.max(60, Math.min(newY, 430));

        const txtLength = node.label ? node.label.length : 0;
        let finalW = node.w;
        let finalH = node.h;
        if (node.type === "rect") {
          finalW = Math.max(130, Math.min(220, txtLength * 8 + 34));
          finalH = 50;
        } else if (node.type === "circle") {
          const dim = Math.max(80, Math.min(130, txtLength * 6 + 40));
          finalW = dim;
          finalH = dim;
        } else if (node.type === "diamond") {
          finalW = Math.max(130, Math.min(190, txtLength * 7 + 40));
          finalH = Math.max(70, Math.min(100, txtLength * 4 + 40));
        }

        let strokeColor = node.strokeColor || "#1e293b";
        let fillColor = node.fillColor || "#f8fafc";

        if (theme === "apa") {
          strokeColor = "#0f172a";
          fillColor = "#f8fafc";
        } else if (theme === "ieee") {
          strokeColor = "#1d4ed8";
          fillColor = "#eff6ff";
        } else if (theme === "nature") {
          strokeColor = "#047857";
          fillColor = "#f0fdfa";
        } else if (theme === "black_white") {
          strokeColor = "#000000";
          fillColor = "#ffffff";
        }

        return {
          ...node,
          x: newX,
          y: newY,
          w: finalW,
          h: finalH,
          strokeColor,
          fillColor,
        };
      });

      // Simple repulsion solver for close overlaps
      for (let i = 0; i < optimizedNodes.length; i++) {
        for (let j = i + 1; j < optimizedNodes.length; j++) {
          const n1 = optimizedNodes[i];
          const n2 = optimizedNodes[j];
          if (Math.abs(n1.x - n2.x) < 25 && Math.abs(n1.y - n2.y) < 25) {
            optimizedNodes[j].x += 120;
            if (optimizedNodes[j].x > 750) {
              optimizedNodes[j].x = 120;
              optimizedNodes[j].y += 80;
            }
          }
        }
      }

      const optimizedConnections = diag.connections.map((conn) => ({
        ...conn,
        arrowEnd: true,
        label: conn.label ? conn.label.trim() : undefined,
      }));

      optimizedClone = {
        ...currentFigure,
        diagram: {
          ...diag,
          nodes: optimizedNodes,
          connections: optimizedConnections,
          caption:
            diag.caption ||
            `Hình Sơ đồ học thuật đã được chuẩn hóa lưới canh lề.`,
        },
      };
    }
    // 2. Diagnose and optimize Charts (Bar, Line, etc)
    else if (currentFigure.type === "chart" && currentFigure.chart) {
      const chart = currentFigure.chart;
      if (!chart.data || chart.data.length === 0) {
        showToast("Biểu đồ của bạn trống dữ liệu để có thể tối ưu!");
        return;
      }

      diffsList.push(
        "Đồng bộ giá trị thực nghiệm, làm tròn số học về tối đa 1 chữ số thập phân.",
      );
      diffsList.push(
        "Kích hoạt khung lưới đo lường (gridlines) làm sáng tỏ dữ liệu.",
      );
      diffsList.push("Chuẩn hóa tiêu đề chính theo phong chữ thống nhất.");

      const optimizedData = chart.data.map((item) => ({
        ...item,
        label: item.label ? item.label.trim() : "Mẫu",
        value: Number(Number(item.value).toFixed(1)),
        error:
          item.error !== undefined
            ? Number(Number(item.error).toFixed(1))
            : undefined,
      }));

      optimizedClone = {
        ...currentFigure,
        chart: {
          ...chart,
          data: optimizedData,
          config: {
            ...chart.config,
            showGrid: true,
            title: chart.config.title
              ? chart.config.title.trim()
              : currentFigure.title,
          },
        },
      };
    }
    // 3. Diagnose and optimize Tables (Numerical, Comparisons, etc)
    else if (currentFigure.type === "table" && currentFigure.table) {
      const tbl = currentFigure.table;

      diffsList.push(
        "Căn lề tự động chuẩn học thuật: Định danh căn Giữa, Số liệu căn Phải, Văn bản căn Trái.",
      );
      diffsList.push("Độc định vị trí viết hoa chuẩn tiêu đề cho các đầu cột.");
      diffsList.push(
        "Khử toàn bộ khoảng trắng thừa trong các chuỗi tế bào dòng.",
      );

      const optimizedColumns = tbl.columns.map((col) => {
        let aligned = col.align;
        const lowerKey = col.key.toLowerCase();
        const lowerHeader = col.header.toLowerCase();
        if (
          lowerKey.includes("err") ||
          lowerKey.includes("f1") ||
          lowerKey.includes("acc") ||
          lowerKey.includes("value") ||
          lowerHeader.includes("độ lỗi") ||
          lowerHeader.includes("độ chính xác") ||
          lowerHeader.includes("đo") ||
          lowerHeader.includes("tỷ lệ") ||
          lowerHeader.includes("%")
        ) {
          aligned = "right";
        } else if (lowerKey.includes("id") || lowerKey.includes("symbol")) {
          aligned = "center";
        } else {
          aligned = "left";
        }

        const formattedHeader = col.header
          .trim()
          .replace(/^\w/, (c) => c.toUpperCase());

        return {
          ...col,
          align: aligned as "left" | "center" | "right",
          header: formattedHeader,
        };
      });

      const optimizedRows = tbl.rows.map((row) => {
        const cleanedRow: Record<string, string> = {};
        Object.entries(row).forEach(([k, v]) => {
          cleanedRow[k] = v ? v.toString().trim() : "";
        });
        return cleanedRow;
      });

      optimizedClone = {
        ...currentFigure,
        table: {
          ...tbl,
          columns: optimizedColumns,
          rows: optimizedRows,
          caption: tbl.caption
            ? tbl.caption.trim()
            : `Bảng học thuật chuẩn hóa dữ liệu thực nghiệm.`,
        },
      };
    }

    // Set preview states for interactive verification before committing
    setTempOptimizedFigure(optimizedClone);
    setOptimizeDiff(diffsList);
    setShowOptimizePreview(true);
    showToast(
      "📋 Đã xây dựng kịch bản tối ưu học thuật! Vui lòng kiểm tra báo cáo phía dưới.",
    );
  };

  // Commit permanently
  const commitSuperOptimize = () => {
    if (!tempOptimizedFigure) return;
    saveToHistory();
    setSavedFigures((prev) =>
      prev.map((fig) =>
        fig.id === tempOptimizedFigure.id ? tempOptimizedFigure : fig,
      ),
    );
    setShowOptimizePreview(false);
    setOptimizeDiff([]);
    setTempOptimizedFigure(null);
    showToast(
      "✨ Đã áp dụng kịch bản tối ưu học thuật & căn lề đồng bộ thành công!",
    );
  };

  // Node Shape Operations
  const handleAddNewNode = (shape: ShapeType) => {
    if (!currentFigure.diagram) return;
    saveToHistory();
    const newId = `n_${Date.now()}`;
    const existingPositions = currentFigure.diagram.nodes.map((n) => ({
      x: n.x,
      y: n.y,
    }));
    const newX =
      existingPositions.length > 0
        ? Math.min(700, Math.max(...existingPositions.map((p) => p.x)) + 180)
        : 150;
    const newY =
      existingPositions.length > 0
        ? existingPositions[existingPositions.length - 1].y
        : 150;

    const newNode: DiagramNode = {
      id: newId,
      type: shape,
      label: shape === "text" ? "Văn bản chú giải mới" : "Nhiệm vụ mới",
      x: newX,
      y: newY,
      w: shape === "circle" ? 80 : 160,
      h: shape === "circle" ? 80 : 50,
      fillColor: "#f8fafc",
      strokeColor: "#1e293b",
    };

    updateCurrentFigureDiagram({
      nodes: [...currentFigure.diagram.nodes, newNode],
    });
    setSelectedNodeId(newId);
  };

  const handleDeleteSelectedNode = () => {
    if (!currentFigure.diagram || !selectedNodeId) return;
    saveToHistory();

    logEvent({
      eventType: "candidate_modified",
      originalCandidateId: currentFigure.id,
      note: `Deleted node ${selectedNodeId}`,
    });
    const updatedNodes = currentFigure.diagram.nodes.filter(
      (n) => n.id !== selectedNodeId,
    );
    const updatedConnections = currentFigure.diagram.connections.filter(
      (c) => c.fromId !== selectedNodeId && c.toId !== selectedNodeId,
    );

    updateCurrentFigureDiagram({
      nodes: updatedNodes,
      connections: updatedConnections,
    });
    setSelectedNodeId(null);
  };

  const handleAddConnection = () => {
    if (!currentFigure.diagram || currentFigure.diagram.nodes.length < 2)
      return;
    saveToHistory();

    logEvent({
      eventType: "candidate_modified",
      originalCandidateId: currentFigure.id,
      note: "Added new connection",
    });
    const nodes = currentFigure.diagram.nodes;
    const fromVal = selectedNodeId || nodes[0].id;
    const toVal = nodes.find((n) => n.id !== fromVal)?.id || nodes[1].id;

    const newConnection: DiagramConnection = {
      id: `c_${Date.now()}`,
      fromId: fromVal,
      toId: toVal,
      style: "solid",
      arrowEnd: true,
      label: "Liên kết",
    };

    updateCurrentFigureDiagram({
      connections: [...currentFigure.diagram.connections, newConnection],
    });
    setSelectedConnectionId(newConnection.id);
  };

  const handleDeleteConnection = (connId: string) => {
    if (!currentFigure.diagram) return;
    saveToHistory();
    updateCurrentFigureDiagram({
      connections: currentFigure.diagram.connections.filter(
        (c) => c.id !== connId,
      ),
    });
    setSelectedConnectionId(null);
  };

  // Chart data manipulations
  const handleChartDataChange = (
    index: number,
    field: keyof ChartDataPoint,
    value: any,
  ) => {
    if (!currentFigure.chart) return;
    saveToHistory();
    const data = [...currentFigure.chart.data];
    data[index] = {
      ...data[index],
      [field]:
        field === "value" || field === "error" ? parseFloat(value) || 0 : value,
    };
    updateCurrentFigureChart({ data });
  };

  const handleAddChartRow = () => {
    if (!currentFigure.chart) return;
    saveToHistory();
    const data = [
      ...currentFigure.chart.data,
      { label: "Mới", value: 50, error: 0 },
    ];
    updateCurrentFigureChart({ data });
  };

  const handleRemoveChartRow = (idx: number) => {
    if (!currentFigure.chart || currentFigure.chart.data.length <= 1) return;
    saveToHistory();
    const data = currentFigure.chart.data.filter((_, i) => i !== idx);
    updateCurrentFigureChart({ data });
  };

  // Table structures manipulations
  const handleTableCellChange = (
    rowIdx: number,
    columnKey: string,
    val: string,
  ) => {
    if (!currentFigure.table) return;
    saveToHistory();
    const rows = [...currentFigure.table.rows];
    rows[rowIdx] = {
      ...rows[rowIdx],
      [columnKey]: val,
    };
    updateCurrentFigureTable({ rows });
  };

  const handleAddTableRow = () => {
    if (!currentFigure.table) return;
    saveToHistory();
    const newRow: Record<string, string> = {};
    currentFigure.table.columns.forEach((col) => {
      newRow[col.key] = "Mới";
    });
    updateCurrentFigureTable({
      rows: [...currentFigure.table.rows, newRow],
    });
  };

  const handleRemoveTableRow = (idx: number) => {
    if (!currentFigure.table || currentFigure.table.rows.length <= 1) return;
    saveToHistory();
    const rows = currentFigure.table.rows.filter((_, i) => i !== idx);
    updateCurrentFigureTable({ rows });
  };

  const handleAddTableColumn = () => {
    if (!currentFigure.table) return;
    saveToHistory();
    const key = `col_${Date.now()}`;
    const header = `Cột ${currentFigure.table.columns.length + 1}`;

    const columns = [
      ...currentFigure.table.columns,
      { key, header, align: "center" as const },
    ];
    const rows = currentFigure.table.rows.map((r) => ({ ...r, [key]: "-" }));

    updateCurrentFigureTable({ columns, rows });
  };

  // Clear figure canvas: delete saved figure, reset states
  const handleClearCanvas = () => {
    saveToHistory();
    if (currentFigureId) {
      const remaining = savedFigures.filter((f) => f.id !== currentFigureId);
      setSavedFigures(remaining);
      if (remaining.length > 0) {
        handleSelectActiveFigure(remaining[0].id);
        setActiveTab(remaining[0].type);
      } else {
        handleSelectActiveFigure(null);
        setWorkflowState("INPUT_READY");
      }
    }
    clearPreview();
    showToast("Đã xóa hình vẽ hiện tại khỏi canvas.");
  };

  const getActiveExportRoot = () => {
    const root = figureContentRef.current;
    if (!root) {
      showToast("Không tìm thấy vùng xuất hình đang hoạt động.");
      return null;
    }
    return root;
  };

  const getActiveExportSvg = () => {
    const root = getActiveExportRoot();
    if (!root) return null;

    const svg = root.querySelector(
      'svg[data-export-target="true"], [data-export-target="true"] svg, svg',
    ) as SVGSVGElement | null;

    if (!svg) {
      showToast(
        "Định dạng hiện chưa khả dụng hoặc không tìm thấy vùng vẽ tương ứng.",
      );
      return null;
    }

    return svg;
  };

  // Download high-resolution SVG trigger
  const handleExportSVG = () => {
    const figureToExport = previewFigure ?? currentFigure;
    const validation = validateRenderableFigurePayload(figureToExport);
    if (!validation.valid) {
      showToast(`Không thể xuất SVG: ${validation.error}`);
      return;
    }

    const type = figureToExport.type;
    if (type !== "chart" && type !== "diagram") {
      showToast("Định dạng hiện chưa khả dụng hoặc không tìm thấy vùng vẽ tương ứng.");
      return;
    }

    const root = getActiveExportRoot();
    if (!root) return;

    // Must be very strict about target
    let svgElement = root.querySelector(
      'div[data-figure-type="chart"][data-export-target="true"] svg'
    ) as SVGSVGElement | null;

    if (type === "diagram") {
      svgElement = root.querySelector(
        'div[data-figure-type="diagram"][data-export-target="true"] > svg'
      ) as SVGSVGElement | null;
    }

    if (!svgElement) {
      showToast("Định dạng hiện chưa khả dụng hoặc không tìm thấy vùng vẽ tương ứng.");
      return;
    }

    const metadata = resolveFigureExportMetadata({
      figure: figureToExport,
      numberingEntry: numberingMap[(figureToExport as any).id],
      isPreview: !!previewFigure,
    });

    const displayTitle = figureToExport.title && metadata.captionText && figureToExport.title.toLowerCase().trim() === metadata.captionText.toLowerCase().trim() ? '' : figureToExport.title;

    // Stringify and create blob using the academic export wrapper
    const source = buildAcademicExportSvg({
      svgElement,
      metadata,
      title: displayTitle
    });

    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${figureToExport.title.toLowerCase().replace(/\s+/g, "_")}_${theme}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    logEvent({
      eventType: "export_completed",
      objectId:
        (figureToExport as any).id ||
        (figureToExport as any).sourceCandidateUid,
      note: `Exported format: SVG (${type})`,
    });
    showToast("Tải file sơ đồ vector SVG học thuật thành công! 🌟");
  };

  // Copy standard LaTeX code based on current visualization standard
  const copyLaTeXCode = async () => {
    const figureToExport = previewFigure ?? currentFigure;
    const validation = validateRenderableFigurePayload(figureToExport);
    if (!validation.valid) {
      showToast(`Không thể tạo TikZ: ${validation.error}`);
      return;
    }

    const metadata = resolveFigureExportMetadata({
      figure: figureToExport,
      numberingEntry: numberingMap[(figureToExport as any).id],
      isPreview: !!previewFigure,
    });

    const code = generateFigureLatex({
      figure: figureToExport,
      metadata,
      options: { isDoubleColumn }
    });

    try {
      await navigator.clipboard.writeText(code);
      showToast(
        "Đã sao chép mã nguồn LaTeX chuẩn học thuật vào khay nhớ tạm! 📋",
      );
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi sao chép mã LaTeX vào clipboard");
    }
  };

  // Real PNG image conversion via HTML5 Canvas
  const handleExportPNG = () => {
    const figureToExport = previewFigure ?? currentFigure;
    const validation = validateRenderableFigurePayload(figureToExport);
    if (!validation.valid) {
      showToast(`Không thể xuất PNG: ${validation.error}`);
      return;
    }

    const type = figureToExport.type;
    const svgElement = getActiveExportSvg();
    if (!svgElement) return;

    try {
      showToast("Đang tiến hành biên dịch hình ảnh sang PNG học thuật...");

      const metadata = resolveFigureExportMetadata({
        figure: figureToExport,
        numberingEntry: numberingMap[(figureToExport as any).id],
        isPreview: !!previewFigure
      });

      const displayTitle = figureToExport.title && metadata.captionText && figureToExport.title.toLowerCase().trim() === metadata.captionText.toLowerCase().trim() ? '' : figureToExport.title;

      const svgString = buildPngExportSvgWithFooter({
        svgElement,
        metadata,
        title: displayTitle
      });

      const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const blobURL = window.URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        // extract dimensions from svg element or use defaults, plus footer
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, "image/svg+xml");
        const outSvg = doc.querySelector("svg");
        
        const width = parseFloat(outSvg?.getAttribute("width") || "800");
        const height = parseFloat(outSvg?.getAttribute("height") || "500");

        // High resolution (300 DPI multiplier)
        const scale = 2.5;
        canvas.width = width * scale;
        canvas.height = height * scale;

        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not create canvas context");

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const pngURL = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngURL;
        downloadLink.download = `${figureToExport.title.toLowerCase().replace(/\s+/g, "_")}_${theme}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        window.URL.revokeObjectURL(pngURL);
        window.URL.revokeObjectURL(blobURL);
        setExportModalState((prev) => ({ ...prev, isOpen: false }));

        logEvent({
          eventType: "export_completed",
          objectId:
            (figureToExport as any).id ||
            (figureToExport as any).sourceCandidateUid,
          note: `Exported format: PNG (${type})`,
        });

        showToast("Tải ảnh PNG học thuật 300 DPI thành công! 🌟");
      };

      image.onerror = () => {
        showToast("Nạp kích thước SVG thất bại khi tạo PNG.");
      };

      image.crossOrigin = "anonymous";
      image.src = blobURL;
    } catch (err: any) {
      console.error(err);
      showToast(`Không xuất được ảnh: ${err.message}`);
    }
  };

  // High quality vector-exact browser print/PDF export
  const handleExportPDF = () => {
    const figureToExport = previewFigure ?? currentFigure;
    const validation = validateRenderableFigurePayload(figureToExport);
    if (!validation.valid) {
      showToast(`Không thể in PDF: ${validation.error}`);
      return;
    }

    const type = figureToExport.type;
    const root = getActiveExportRoot();
    if (!root) return;

    const targetElement =
      root.querySelector('[data-export-target="true"]') || root;
    const htmlContent = targetElement.innerHTML;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast(
        "Hãy cho phép mở tab mới (Pop-up permission) để in/xuất file PDF.",
      );
      return;
    }

    const metadata = resolveFigureExportMetadata({
      figure: figureToExport,
      numberingEntry: numberingMap[(figureToExport as any).id],
      isPreview: !!previewFigure,
    });
    
    // Fallback if title and caption are literally the same
    const displayTitle = figureToExport.title && metadata.captionText && figureToExport.title.toLowerCase().trim() === metadata.captionText.toLowerCase().trim() ? '' : figureToExport.title;
    const headerHtml = displayTitle ? `<h2>${escapeHtmlText(displayTitle)}</h2>` : '';

    const footerHtml = buildPdfAcademicFooterHtml(metadata);

    const inheritedStyles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style')
    )
      .map((node) => node.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtmlText(figureToExport.title || 'Export')} - Academic Export</title>
          ${inheritedStyles}
          <style>
            body {
              margin: 0;
              padding: 40px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: 'Inter', sans-serif;
            }
            .container {
              max-width: 800px;
              width: 100%;
              text-align: center;
            }
            h2 {
              font-size: 16px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: -0.025em;
              color: #020617;
            }
            svg {
              width: 100%;
              max-height: 500px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border-top: 2px solid #000;
              border-bottom: 2px solid #000;
              margin: 20px 0;
            }
            th, td {
              padding: 10px;
              text-align: left;
              border-bottom: 1px solid #eee;
            }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 30px; text-align: center; background-color: #f1f5f9; padding: 15px; border-radius: 8px;">
            <p style="font-size: 13px; color: #475569; margin: 0 0 10px 0;">Trình nạp in vector Academic sẵn sàng. Nhấn nút mở hộp thoại và chọn chế độ <strong>"Save as PDF"</strong> (Lưu thành PDF).</p>
            <button onclick="window.print(); window.close();" style="padding: 8px 16px; background-color: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: bold;">Lưu Vector PDF</button>
          </div>
          <div class="container">
            ${headerHtml}
            ${htmlContent}
            ${footerHtml}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setExportModalState((prev) => ({ ...prev, isOpen: false }));

    logEvent({
      eventType: "export_completed",
      objectId:
        (figureToExport as any).id ||
        (figureToExport as any).sourceCandidateUid,
      note: `Exported format: PDF (${type})`,
    });
  };

  const currentColors = getThemeColors(theme);
  const themeFont = getThemeFont(theme);

  const getAcademicThemeConfig = () => {
    const isBW = theme === "black_white";
    if (theme && COMPREHENSIVE_THEMES[theme]) {
      return COMPREHENSIVE_THEMES[theme][isBW ? "blackWhite" : "color"];
    }
    return null;
  };
  const activeThemeConfig = getAcademicThemeConfig();

  return (
    <div
      className={`flex flex-col h-[100dvh] w-full bg-app-bg text-text-main font-sans overflow-hidden transition-all duration-300`}
      onClick={() => {
        if (contextMenuState.visible) {
          setContextMenuState((prev) => ({ ...prev, visible: false }));
        }
      }}
    >
      {!isFocusMode && (
        <Header
          activeFigureTitle={
            activeMainScreen === 'document' ? 'Tài liệu đầu vào' :
            activeMainScreen === 'drawings' ? 'Gợi ý bản vẽ' :
            (activeSavedFigure?.title || (previewFigure ? previewFigure.title : null))
          }
          figureStatus={
            activeMainScreen === 'document' ? (isGenerating ? 'Đang phân tích' : documentText.trim() ? 'Đã nhập dữ liệu' : 'Chưa có dữ liệu') :
            activeMainScreen === 'drawings' ? (visualCandidates.length > 0 ? (() => {
              const ready = visualCandidates.filter(c => getCandidateUiStatus(c) === 'ready').length;
              const review = visualCandidates.filter(c => getCandidateUiStatus(c) === 'needs_review').length;
              const notReady = visualCandidates.filter(c => getCandidateUiStatus(c) === 'not_ready').length;
              return `${visualCandidates.length} đề xuất được phát hiện · ${ready} sẵn sàng dùng · ${review} cần xem lại · ${notReady} chưa đủ dữ liệu`;
            })() : 'Chưa có gợi ý') :
            (previewFigure ? "Đang xem trước" : (activeSavedFigure ? "Đã lưu" : "Chưa có bản vẽ"))
          }
          isLeftSidebarOpen={isLeftSidebarOpen}
          setIsLeftSidebarOpen={setIsLeftSidebarOpen}
          onHistoryClick={() => {
            setActiveRightSidebar("history");
            setRightPanelCollapsed(false);
          }}
          onSettingsClick={() => {
            setActiveRightSidebar("settings");
            setRightPanelCollapsed(false);
          }}
          onSaveClick={() => {
            if (previewFigure) {
              const cand = visualCandidates.find(c => {
                const uid = (c as any).uid || c.id;
                return uid === previewFigure.sourceCandidateUid;
              });
              if (cand) {
                handleApplyCandidate(cand);
              } else {
                showToast("Đã lưu bản vẽ");
              }
            } else if (activeFigureId) {
              showToast("Đã lưu bản vẽ");
            }
          }}
          isSaveDisabled={!activeFigureId && !previewFigure}
        />
      )}

      {/* 2. TOPBAR CANVAS TOOLS */}
      {activeMainScreen === "canvas" && (
        <div className="flex bg-surface border-b border-border h-12 shrink-0 z-15 w-full items-center justify-between px-2 sm:px-4">
          {/* Left: Undo/Redo */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="px-3 py-2 flex items-center gap-1.5 text-text-subtle hover:text-text-main hover:bg-surface-soft disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all"
              title="Hoàn tác chỉnh sửa"
            >
              <Undo2 className="w-4 h-4" />
              <span className="text-xs font-bold hidden md:inline">Hoàn tác</span>
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="px-3 py-2 flex items-center gap-1.5 text-text-subtle hover:text-text-main hover:bg-surface-soft disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all"
              title="Làm lại chỉnh sửa"
            >
              <Redo2 className="w-4 h-4" />
              <span className="text-xs font-bold hidden md:inline">Làm lại</span>
            </button>
          </div>

          {/* Center: Zoom controls */}
          <div className="flex items-center gap-1 bg-surface-soft p-1.5 rounded-xl border border-border/50 relative">
            <button
              onClick={handleZoomOut}
              className="p-2 text-text-subtle hover:text-text-main hover:bg-white rounded-lg transition-all shadow-sm active:scale-95"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => setZoomDropdownOpen(!zoomDropdownOpen)}
                className="px-3 py-2 text-text-main hover:bg-white rounded-lg transition-all text-[11px] font-bold tracking-widest min-w-[128px] shadow-sm active:scale-95 flex items-center justify-between gap-1"
                title="Thay đổi tỉ lệ zoom"
              >
                <span>Vừa khung ({Math.round(zoomLevel * 100)}%)</span>
                <ChevronDown className="w-3 h-3 text-text-subtle" />
              </button>

              {zoomDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-50" 
                    onClick={() => setZoomDropdownOpen(false)} 
                  />
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-xl shadow-2xl p-1.5 min-w-[140px] z-[60] flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <button
                      onClick={() => {
                        isManualZoomRef.current = false;
                        handleFitCanvas();
                        setZoomDropdownOpen(false);
                      }}
                      className="px-3 py-1.5 text-left text-xs font-semibold rounded-lg hover:bg-primary-soft hover:text-primary transition-all flex items-center justify-between"
                    >
                      <span>Vừa khung</span>
                      <span className="text-[10px] text-text-muted">Auto</span>
                    </button>
                    <div className="h-[1px] bg-border my-1" />
                    {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => {
                          isManualZoomRef.current = true;
                          setZoomLevel(preset);
                          setZoomDropdownOpen(false);
                        }}
                        className={`px-3 py-1.5 text-left text-xs font-medium rounded-lg hover:bg-primary-soft hover:text-primary transition-all flex items-center justify-between ${Math.round(zoomLevel * 100) === Math.round(preset * 100) ? "bg-primary-soft text-primary font-bold" : "text-text-main"}`}
                      >
                        <span>{preset * 100}%</span>
                        {Math.round(zoomLevel * 100) === Math.round(preset * 100) && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={handleZoomIn}
              className="p-2 text-text-subtle hover:text-text-main hover:bg-white rounded-lg transition-all shadow-sm active:scale-95"
              title="Phóng to"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Focus */}
          <div className="flex items-center">
            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={`px-3 py-2 flex items-center gap-2 rounded-xl transition-all shadow-sm active:scale-95 ${isFocusMode ? "bg-primary text-white shadow-primary/20" : "bg-surface-soft border border-border/50 text-text-subtle hover:text-primary hover:bg-primary-soft hover:border-primary/20"}`}
              title={isFocusMode ? "Thoát chế độ tập trung" : "Chế độ tập trung (ẩn thanh công cụ)"}
            >
              <Maximize className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">{isFocusMode ? "Thoát" : "Tập trung"}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. CORE CONTENT LAYOUT */}
      <div className="flex-1 flex flex-row overflow-hidden bg-app-bg w-full relative pb-16 lg:pb-0">
        {/* COLUMN 1 REMOVED IN FAVOR OF BOTTOM NAV */}

        {/* SYNCED SIDEBAR PANEL (COLUMN 2) */}
        {!isFocusMode && (
          <div
            className={`
              absolute lg:relative inset-x-0 top-0 bottom-16 lg:bottom-0 lg:inset-auto z-40 
              w-full bg-surface-soft border-r border-border flex flex-col shrink-0 overflow-hidden
              transition-all duration-300 ease-in-out
              ${activeMainScreen !== "canvas" ? "flex-1 translate-x-0 opacity-100" : "hidden pointer-events-none"}
              shadow-2xl lg:shadow-none
            `}
          >
            {/* Sidebar Content: Document Tab */}
            {activeMainScreen === "document" && (
              <div className="flex-1 flex flex-col overflow-hidden h-full">
                <RichDocumentEditor
                  blocks={blocks}
                  onChange={(newBlocks) => {
                    handleDocumentBlocksChange(newBlocks);
                    if (newBlocks.length === 0) setWorkflowState("EMPTY");
                    else if (workflowState === "EMPTY") setWorkflowState("INPUT_READY");
                  }}
                  onInsertContent={handleInsertContent}
                  onImportDocument={handleImportDocument}
                  isGenerating={isGenerating}
                  onAnalyze={() => {
                    if (blocks.length === 0) {
                      showToast("Vui lòng nhập hoặc dán văn bản nghiên cứu trước.");
                      return;
                    }
                    const textToAnalyze = getAnalysisInputText();
                    if (textToAnalyze.length > 50000) {
                      showToast("Văn bản nguồn vượt giới hạn ký tự (tối đa 50,000 ký tự).");
                      return;
                    }
                    handleAnalyzeDocumentText(textToAnalyze);
                  }}
                  onReset={() => {
                    clearWorkspaceDraft();
                    handleResetDocument();
                    clearVisualCandidates();
                    clearPreview();
                    setWorkflowState("EMPTY");
                    setSavedFigures(INITIAL_SAVED_FIGURES.map(f => migrateFigureObjectIDs(f)));
                    setCurrentFigureId(INITIAL_SAVED_FIGURES[0].id);
                    setSelectedFigureId(null);
                    showToast("Đã dọn sạch tài liệu và tạo dự án mới.");
                  }}
                  onLoadSample={() => {
                    handleLoadSample();
                    setWorkflowState("INPUT_READY");
                  }}
                />
              </div>
            )}

            {/* Sidebar Content: Visualization Tab */}
            {activeMainScreen === "drawings" && (
              <div className="flex-1 flex flex-col overflow-hidden bg-app-bg">
                <div className="flex-1 overflow-y-auto relative">
                  {/* Header page block inside scroll container so they scroll together */}
                  <div className="flex flex-col p-4 lg:p-8 bg-surface border-b border-border mb-6">
                    <div className="flex flex-col gap-1 w-full max-w-4xl mx-auto">
                      <h2 className="text-xl font-black text-text-main tracking-tight">Gợi ý bản vẽ</h2>
                      <p className="text-sm text-text-muted">
                        Chọn một cách trình bày phù hợp để xem trước hoặc dùng cho bản vẽ.
                      </p>
                    </div>
                  </div>

                  <div className="px-4 lg:px-8 pb-8 w-full max-w-7xl mx-auto">
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-subtle gap-4 animate-pulse">
                      <RefreshCw className="w-8 h-8 animate-spin" />
                      <p className="text-xs font-bold tracking-widest uppercase">
                        Hệ thống đang suy luận...
                      </p>
                    </div>
                  ) : visualCandidates.length === 0 ? (
                    <div className="text-center py-12 px-6 bg-surface border-2 border-dashed border-border rounded-2xl max-w-lg mx-auto flex flex-col items-center">
                      <FolderOpen className="w-10 h-10 text-text-subtle mb-4 opacity-50" />
                      <p className="text-sm font-bold text-text-main mb-2">
                        Chưa có gợi ý bản vẽ
                      </p>
                      <p className="text-[11px] text-text-muted mb-6 leading-relaxed max-w-sm">
                        Hãy nhập tài liệu và phân tích để hệ thống tự động tạo gợi ý trực quan phù hợp với dữ liệu của bạn.
                      </p>
                      <div className="flex gap-3 w-full sm:w-auto">
                        <button
                          onClick={() => {
                            setActiveMainScreen("document");
                            setIsLeftSidebarOpen(true);
                          }}
                          className="flex-1 sm:flex-none px-6 py-2.5 bg-primary text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-primary-hover transition-colors shadow-sm"
                        >
                          Nhập tài liệu
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-8 pb-8">
                      <DatasetFirstCandidateList
                        candidates={visualCandidates}
                        savedFigures={savedFigures}
                        selectedCandidateUid={selectedCandidateUid}
                        documentText={documentText}
                        onPreview={handlePreviewCandidate}
                        onApply={handleApplyCandidate}
                        onCliCommand={(prefix) => {
                          setIsCliConsoleOpen(true);
                          setCommandInput(prefix);
                          setTimeout(() => commandInputRef.current?.focus(), 100);
                        }}
                        onOpenProperties={() => {
                          setActiveRightSidebar("properties");
                          setRightPanelCollapsed(false);
                        }}
                      />
                    </div>

                  )}
                  </div>
                </div>
              </div>
            )}

            {/* Sidebar Content: Figures Tab Removed (Moved to Right Panel History) */}
          </div>
        )}

        {/* CENTER COLUMN: WORKSPACE DRAWING CANVAS/CONTAINER */}
        <div
          className={`flex-1 flex-col min-w-0 bg-app-bg relative overflow-hidden transition-all duration-300 ${isFocusMode ? "p-0" : "p-2 sm:p-4 md:p-6"} ${activeMainScreen !== 'canvas' ? 'hidden' : 'flex'}`}
        >
          {/* 2. MAIN WORKSPACE */}
          <div
            className="flex-1 flex items-center justify-center relative overflow-hidden"
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setZoomLevel((prev) => {
                  const newZoom = prev - e.deltaY * 0.005;
                  return Math.max(0.2, Math.min(newZoom, 3));
                });
              }
            }}
          >
            {/* Analysis Failure Message for Canvas */}
            {workflowState === "INPUT_READY" &&
              documentText.length > 0 &&
              visualCandidates.length === 0 &&
              !currentFigureId && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface/90 backdrop-blur-md">
                  <div className="text-center max-w-sm">
                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-base font-bold text-text-main uppercase mb-2">
                      Chưa tạo được trực quan
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed px-6">
                      Hệ thống chưa tìm thấy dữ liệu cấu trúc (quy trình, bảng,
                      số liệu) để trích xuất hình ảnh. Vui lòng kiểm tra lại nội
                      dung đầu vào.
                    </p>
                  </div>
                </div>
              )}

            {/* Canvas Area with Focus Support */}
            <div
              ref={canvasContainerRef}
              className={`transition-all duration-500 ease-in-out flex flex-col bg-surface shadow-xl relative border border-border overflow-auto ${
                isFocusMode
                  ? "w-screen h-screen rounded-none z-50"
                  : "w-full h-full max-w-full rounded-2xl mx-auto my-auto"
              }`}
              style={{
                transformOrigin: "center center",
              }}
            >
              {/* Empty State Overlay */}
              {!currentFigureId && !previewFigure && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface/80 backdrop-blur-md">
                    <div className="max-w-md w-full p-10 text-center animate-in fade-in zoom-in duration-500">
                      <div className="w-16 h-16 bg-primary-soft text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/10 shadow-inner">
                        <FileText className="w-8 h-8 opacity-50" />
                      </div>
                      <h2 className="text-xl font-bold text-text-main mb-3 tracking-tight uppercase">
                        BẢN VẼ TRỐNG
                      </h2>
                      <p className="text-text-muted text-sm leading-relaxed mb-8">
                        Bạn chưa chọn bản vẽ nào để hiển thị trong Canvas. Hãy nạp tài liệu mới hoặc chọn từ danh sách đề xuất.
                      </p>
                      <div className="flex flex-col gap-4">
                        <button
                          onClick={() => {
                            setActiveMainScreen("document");
                          }}
                          className="flex items-center justify-center gap-3 p-4 bg-primary text-white border border-primary rounded-xl hover:bg-primary-hover transition-all group shadow-md"
                        >
                          <FileText className="w-5 h-5 text-white" />
                          <span className="text-[11px] font-bold uppercase tracking-widest">
                            Chuyển tới Tài liệu
                          </span>
                        </button>
                        {visualCandidates.length > 0 && (
                          <button
                            onClick={() => {
                              setActiveMainScreen("drawings");
                            }}
                            className="flex items-center justify-center gap-3 p-4 bg-surface text-text-main border border-border rounded-xl hover:bg-surface-soft transition-all group"
                          >
                            <Sparkles className="w-5 h-5 text-primary" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">
                              Xem gợi ý bản vẽ
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* Canvas Header / Focus Info */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-surface">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${workflowState === "ANALYZING" || workflowState === "APPLYING_CANDIDATE" ? "bg-warning animate-spin" : "bg-success animate-pulse"}`}
                  ></div>
                  <h3
                    className="text-sm font-bold text-text-main uppercase tracking-tight truncate max-w-[300px]"
                    title={
                      previewFigure ? previewFigure.title : currentFigure?.title
                    }
                  >
                    {previewFigure
                      ? `TRỰC QUAN ĐỀ XUẤT: ${previewFigure.title}`
                      : currentFigureId
                        ? currentFigure?.title
                        : "Bản vẽ trống (Vùng chờ)"}
                  </h3>
                </div>
              </div>

              {/* Canvas Renderer */}
              <div 
                data-testid="preview-canvas-container" 
                className="flex-1 flex flex-col items-center justify-center bg-surface relative overflow-hidden"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                data-viewport-bg="true"
              >
                <div className="absolute inset-0 bg-[linear-gradient(rgba(203,213,225,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(203,213,225,0.3)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-50" data-viewport-bg="true"></div>
                <div 
                  style={{
                    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
                    transformOrigin: 'center center',
                    transition: 'none' // disable transition so drag is smooth
                  }}
                  className="flex flex-col items-center justify-center w-full h-full relative"
                >
                  <FigureRenderer
                  ref={figureContentRef}
                  figure={activeFigure}
                  academicCaption={activeFigure ? {
                    label: (activeFigure as any).isPreview ? '' : numberingMap[(activeFigure as any).id]?.label || 'Hình',
                    ordinal: (activeFigure as any).isPreview ? 0 : numberingMap[(activeFigure as any).id]?.ordinal || 1,
                    isPreview: !!(activeFigure as any).isPreview,
                    captionText: getFigureCaptionText(activeFigure),
                    sourceCitation: getFigureSourceCitation(activeFigure)
                  } : undefined}
                  canvasRef={canvasRef}
                  zoomLevel={zoomLevel}
                  gridEnabled={gridEnabled}
                  isSelected={
                    selectedFigureId === activeFigureId || isPreviewSelected
                  }
                  onSelectFigure={() => {
                    if (isPreviewSelected) {
                      setSelectedNodeId(null);
                      setSelectedConnectionId(null);
                      setActiveRightSidebar("properties");
                      setRightPanelCollapsed(false);
                      return;
                    }
                    if (activeFigureId) {
                      handleSelectActiveFigure(activeFigureId);
                    }
                  }}
                  onMouseDownNode={handleMouseDownNode}
                  onTouchStartNode={handleTouchStartNode}
                  onMouseMoveCanvas={handleMouseMoveCanvas}
                  onMouseUpCanvas={handleMouseUpCanvas}
                  onTouchMoveCanvas={handleTouchMoveCanvas}
                  onTouchEndCanvas={handleTouchEndCanvas}
                />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Right Overlay */}
        <AnimatePresence>
          {!rightPanelCollapsed && !isFocusMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRightPanelCollapsed(true)}
              className="fixed inset-0 bg-header-bg/40 backdrop-blur-sm z-30 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* RIGHT PANEL: PROPERTIES, ASSISTANT & AUDIT (COLUMN 4) */}
        {!isFocusMode && (
          <AnimatePresence>
            {!rightPanelCollapsed && (
              <motion.div 
                initial={{ x: 320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 320, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute lg:relative top-0 bottom-16 lg:bottom-0 lg:inset-auto right-0 z-40 w-full sm:w-80 lg:w-80 bg-surface-soft border-l border-border flex flex-col shadow-2xl lg:shadow-none"
              >
                <div className="h-[52px] border-b border-header-border flex items-center justify-between px-4 shrink-0 bg-header-bg transition-colors">
              <span className="text-[11px] font-black uppercase tracking-widest text-white">
                {activeRightSidebar === "assistant" ? "Trợ lý AI" 
                 : activeRightSidebar === "properties" ? "Thuộc tính"
                 : activeRightSidebar === "history" ? "Lịch sử Bản vẽ"
                 : activeRightSidebar === "settings" ? "Cài đặt"
                 : "Bảng điều khiển"}
              </span>
              <button
                onClick={() => setRightPanelCollapsed(true)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors border border-transparent"
              >
                <X className="w-4 h-4 text-slate-300 hover:text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
              {activeRightSidebar === "assistant" ? (
                <CommandEditor
                  workflowState={workflowState}
                  commandInput={commandInput}
                  setCommandInput={setCommandInput}
                  executeCommand={handleAssistantCommandSubmit}
                  commandInputRef={commandInputRef}
                  chatLogs={chatLogs}
                  isCliConsoleOpen={true}
                  setIsCliConsoleOpen={() => {}}
                  fullHeight={true}
                  pendingProposal={pendingProposal}
                  onApplyProposal={applyProposal}
                  onCancelProposal={cancelProposal}
                  hasEditableContext={hasEditableContext}
                />
              ) : activeRightSidebar === "properties" ? (
                <M1DLitePropertyPanel
                  activeFigure={activeFigure}
                  onApply={(figure) => {
                    if ("isPreview" in figure) {
                      setPreviewFigure(figure);
                    } else {
                      saveToHistory();
                      setSavedFigures(prev => prev.map(item => item.id === figure.id ? figure : item));
                    }
                    showToast("Đã áp dụng chỉnh sửa hình.");
                  }}
                />
              ) : activeRightSidebar === "history" ? (
                <div className="flex-1 p-4 flex flex-col gap-2">
                  <p className="text-[11px] text-text-muted mb-2 tracking-tight">Danh sách các bản vẽ đã lưu của bạn:</p>
                  {savedFigures.map((fig) => (
                    <div
                      key={fig.id}
                      onClick={() => {
                        handleSelectActiveFigure(fig.id);
                        setActiveTab(fig.type);
                        setActiveMainScreen("canvas");
                      }}
                      className={`group p-3 rounded-lg border text-left cursor-pointer transition-all ${fig.id === activeFigureId ? "bg-primary-soft border-primary text-primary" : "bg-surface border-border text-text-main hover:bg-surface-soft"}`}
                    >
                      <h4 className="text-[12px] font-bold truncate tracking-tight">{fig.title || "Chưa đặt tên"}</h4>
                      <p className="text-[10px] opacity-70 uppercase tracking-widest mt-1">
                        {fig.type === "diagram" ? "Sơ đồ" : fig.type === "chart" ? "Biểu đồ" : "Bảng"}
                      </p>
                    </div>
                  ))}
                  {savedFigures.length === 0 && (
                    <div className="text-center py-10 opacity-60">
                       <FolderOpen className="w-8 h-8 mx-auto mb-3 text-text-muted" />
                       <span className="text-[11px] uppercase tracking-widest">Chưa có bản vẽ nào.</span>
                    </div>
                  )}
                </div>
              ) : activeRightSidebar === "settings" ? (
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
                  <div className="flex flex-col gap-1 pb-1">
                    <h3 className="text-xs font-black text-text-main uppercase tracking-widest">Cấu hình Đồ họa & Thiết kế</h3>
                    <p className="text-[10px] text-text-muted">Tùy biến dải màu, font chữ học thuật và phân trang cột luận án tiếng Việt / quốc tế.</p>
                  </div>
                  
                  <ThemeSelector
                    currentTheme={theme}
                    onChangeTheme={(newTheme) => {
                      setTheme(newTheme);
                      if (activeFigureId) {
                        setSavedFigures(prev => prev.map(fig => {
                          if (fig.id === activeFigureId) {
                            return {
                              ...fig,
                              theme: newTheme
                            };
                          }
                          return fig;
                        }));
                        showToast(`Đã đổi mẫu thiết kế sang: ${THEMES.find(t => t.id === newTheme)?.name || newTheme}`);
                      } else if (previewFigure) {
                        setPreviewFigure(prev => prev ? {
                          ...prev,
                          theme: newTheme
                        } : null);
                        showToast(`Đã đổi mẫu thiết kế xem trước sang: ${THEMES.find(t => t.id === newTheme)?.name || newTheme}`);
                      } else {
                        showToast(`Đã cập nhật mẫu thiết kế mặc định: ${THEMES.find(t => t.id === newTheme)?.name || newTheme}`);
                      }
                    }}
                    isDoubleColumn={isDoubleColumn}
                    onChangeIsDoubleColumn={(val) => {
                      setIsDoubleColumn(val);
                      if (activeFigureId) {
                        setSavedFigures(prev => prev.map(fig => {
                          if (fig.id === activeFigureId) {
                            const updatedFig = { ...fig };
                            if (updatedFig.chart && updatedFig.chart.config) {
                              updatedFig.chart = {
                                ...updatedFig.chart,
                                config: {
                                  ...updatedFig.chart.config,
                                  isDoubleColumn: val
                                }
                              };
                            }
                            return updatedFig;
                          }
                          return fig;
                        }));
                        showToast(`Đã đặt khổ giấy thành: ${val ? "Khổ 2 cột (IEEE)" : "Đơn cột (Toàn trang)"}`);
                      } else if (previewFigure) {
                        setPreviewFigure(prev => {
                          if (!prev) return null;
                          const updated = { ...prev };
                          if (updated.chart && updated.chart.config) {
                            updated.chart = {
                              ...updated.chart,
                              config: {
                                ...updated.chart.config,
                                isDoubleColumn: val
                              }
                            };
                          }
                          return updated;
                        });
                        showToast(`Đã đặt khổ giấy xem trước thành: ${val ? "Khổ 2 cột (IEEE)" : "Đơn cột (Toàn trang)"}`);
                      } else {
                        showToast(`Đã đặt định dạng khổ mặc định thành: ${val ? "Khổ 2 cột (IEEE)" : "Đơn cột (Toàn trang)"}`);
                      }
                    }}
                  />

                  <div className="bg-surface border border-border p-3.5 rounded-xl space-y-2 mt-2">
                    <h4 className="text-[11px] font-bold text-text-main uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-success"></span>Trạng thái kết nối
                    </h4>
                    <p className="text-[10px] text-text-muted leading-relaxed">
                      Đang liên kết với cơ sỡ dữ liệu cục bộ ổn định. Mọi cấu hình đều được đồng bộ tự động theo thời gian thực (Real-time Synced).
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
            )}
           </AnimatePresence>
        )}
      </div>

      {/* 4. BOTTOM NAVIGATION */}
      {!isFocusMode && (
        <div className="fixed bottom-0 left-0 right-0 lg:relative flex flex-col w-full z-50 shrink-0 bg-surface border-t border-border transition-all duration-300 ease-in-out">
          <div className="flex items-center justify-center gap-2 h-16 select-none px-4 pb-1">
            <button
              onClick={() => {
                setActiveMainScreen("document");
                setIsLeftSidebarOpen(true);
              }}
              className={`flex flex-col items-center gap-1 p-2 w-16 sm:w-20 transition-all ${activeMainScreen === "document" ? "text-primary scale-105" : "text-text-subtle hover:text-text-main"}`}
            >
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Tài liệu</span>
            </button>
            
            <button
              onClick={() => {
                setActiveMainScreen("drawings");
                setIsLeftSidebarOpen(true);
              }}
              className={`flex flex-col items-center gap-1 p-2 w-16 sm:w-20 transition-all ${activeMainScreen === "drawings" ? "text-primary scale-105" : "text-text-subtle hover:text-text-main"}`}
            >
              <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Bản vẽ</span>
            </button>
            
            <button
              onClick={() => setActiveMainScreen("canvas")}
              className="flex flex-col items-center justify-center p-2 group mx-2 sm:mx-6"
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-[14px] flex items-center justify-center -mt-6 border-4 border-surface group-active:scale-95 transition-all ${activeMainScreen === "canvas" ? "bg-primary shadow-lg shadow-primary/30 text-white" : "bg-surface-muted shadow-md text-text-subtle border-border hover:text-primary hover:bg-surface-soft"}`}>
                <LayoutTemplate className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mt-1 ${activeMainScreen === "canvas" ? "text-primary" : "text-text-subtle group-hover:text-text-main"}`}>Canvas</span>
            </button>

            <button
              onClick={() => {
                const isOpening = activeRightSidebar !== "assistant" || rightPanelCollapsed;
                if (isOpening) {
                  setActiveRightSidebar("assistant");
                  setRightPanelCollapsed(false);
                } else {
                  setRightPanelCollapsed(true);
                }
              }}
              className={`flex flex-col items-center gap-1 p-2 w-16 sm:w-20 transition-all ${!rightPanelCollapsed && activeRightSidebar === "assistant" ? "text-primary scale-105" : "text-text-subtle hover:text-text-main"}`}
            >
              <Wand2 className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Trợ lý</span>
            </button>

            <button
              onClick={() => {
                const isOpening = activeRightSidebar !== "properties" || rightPanelCollapsed;
                if (isOpening) {
                  setActiveRightSidebar("properties");
                  setRightPanelCollapsed(false);
                } else {
                  setRightPanelCollapsed(true);
                }
              }}
              className={`flex flex-col items-center gap-1 p-2 w-16 sm:w-20 transition-all ${!rightPanelCollapsed && activeRightSidebar === "properties" ? "text-primary scale-105" : "text-text-subtle hover:text-text-main"}`}
            >
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Thuộc tính</span>
            </button>
          </div>
        </div>
      )}

      {/* Export Modal */}
      { (previewFigure ?? currentFigure) && (
        <ExportModal
          isOpen={exportModalState.isOpen}
          onClose={() =>
            setExportModalState({ ...exportModalState, isOpen: false })
          }
          figure={(previewFigure ?? currentFigure)!}
          currentTab={exportModalState.tab}
          setCurrentTab={(tab) =>
            setExportModalState({ ...exportModalState, tab })
          }
          onExportPNG={handleExportPNG}
          onExportSVG={handleExportSVG}
          onExportPDF={handleExportPDF}
          onCopyTikZ={copyLaTeXCode}
        />
      ) }
      {/* Dynamic Academic Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-[100] pointer-events-none transition-all duration-300 w-full flex justify-end">
          <div className="bg-header-bg border border-success text-surface rounded-xl py-3 px-5 shadow-2xl flex items-center gap-3 max-w-[90vw] md:max-w-sm text-xs font-bold tracking-tight animate-in slide-in-from-right duration-300">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0"></div>
            <span className="line-clamp-3">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Super Optimize Preview Modal */}
      {showOptimizePreview && tempOptimizedFigure && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full flex flex-col overflow-hidden max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight">
                Xác nhận tối ưu hóa sơ đồ (Super Optimize)
              </h3>
              <button
                onClick={() => {
                  setShowOptimizePreview(false);
                  setTempOptimizedFigure(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <p className="text-xs text-slate-600 font-bold leading-relaxed">
                Gemini đề xuất tối ưu hóa các điểm số mỹ thuật học thuật:
              </p>
              <ul className="list-disc pl-5 text-[11px] text-slate-500 font-bold space-y-2">
                <li>
                  Căn chỉnh tọa độ x/y của tất cả các nút khớp với hệ lưới 40px
                  chuẩn đề án.
                </li>
                <li>
                  Tính toán lại chiều rộng hộp chứa thông minh tương hợp với độ
                  dài nhãn ký tự.
                </li>
                <li>
                  Tự động khử xuyên tâm chồng lấn vị trí có cự ly &lt; 25px.
                </li>
              </ul>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  setShowOptimizePreview(false);
                  setTempOptimizedFigure(null);
                }}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={commitSuperOptimize}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all"
              >
                Áp dụng tối ưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// export default App; (removed to avoid conflict)
