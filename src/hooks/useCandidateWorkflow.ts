import { useState, useRef, useCallback } from "react";
import {
  VisualCandidate,
  RankedVisualCandidate,
  PreviewFigure,
  SavedFigure,
  AcademicTheme,
  CalibrationLog,
  CalibrationCase
} from "../types";
import {
  isCandidateApplicable,
  isCandidatePreviewable,
  NormalizedVisualCandidate,
  normalizeVisualCandidates,
  dedupeCandidatesPreservingMetadata,
} from "../analysis/candidateModel";
import {
  buildPreviewFigureFromCandidate,
  buildSavedFigureFromCandidate,
  validateRenderableFigurePayload,
} from "../lib/workflowUtils";
import { runRuleAnalysis } from "../analysis/ruleAnalyzer";
import { runAIAnalysis } from "../analysis/aiAnalyzer";
import { analyzeDocumentWithAIContract } from "../analysis/aiAnalysisAdapter";
import { reconcileAnalysisResults } from "../analysis/analysisReconciler";
import { normalizeCandidates, dedupeAndRankCandidates } from "../analysis/candidateNormalizer";
import { getStringHash } from "../academicArchitecture";

export interface CandidateWorkflowProps {
  initialDraft: any;
  theme: AcademicTheme;
  geminiApiKey: string;
  onAnalysisStart?: () => void;
  onAnalysisSuccess?: (candidatesFound: boolean, warnings: string[]) => void;
  onAnalysisError?: (error: Error) => void;
  onCandidateApplied?: (figure: SavedFigure, candidate: RankedVisualCandidate) => void;
  onPreviewRequested?: () => void;
  onShowToast?: (msg: string) => void;
  onCalibrationCasesUpdated?: (cases: any[]) => void;
  onCalibrationLogAdded?: (log: any) => void;
  onOcrWarning?: (warning: string | null) => void;
}

export function useCandidateWorkflow(props: CandidateWorkflowProps) {
  const {
    initialDraft,
    theme,
    geminiApiKey,
    onAnalysisStart,
    onAnalysisSuccess,
    onAnalysisError,
    onCandidateApplied,
    onPreviewRequested,
    onShowToast,
    onCalibrationCasesUpdated,
    onCalibrationLogAdded,
    onOcrWarning,
  } = props;

  const [visualCandidates, setVisualCandidates] = useState<RankedVisualCandidate[]>(
    () => initialDraft?.visualCandidates || []
  );
  const [selectedCandidateUid, setSelectedCandidateUid] = useState<string | null>(
    () => initialDraft?.selectedCandidateUid || null
  );
  const [previewFigure, setPreviewFigure] = useState<PreviewFigure | null>(
    () => initialDraft?.previewFigure || null
  );
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [aiStatus, setAiStatus] = useState<{
    state: "unknown" | "available" | "quota_limited" | "error" | "unavailable" | "rule_based";
    blockedUntil?: number;
    retryAfterSeconds?: number;
    message?: string;
  }>({ state: "unknown" });
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const inFlightAnalysisRef = useRef<string | null>(null);
  const [analysisRunId, setAnalysisRunId] = useState<string | number>(0);

  const isAiTemporarilyBlocked = useCallback(() => {
    if (aiStatus.state === "unavailable" || aiStatus.state === "rule_based" || aiStatus.state === "error") {
      return true;
    }
    return (
      aiStatus.state === "quota_limited" &&
      typeof aiStatus.blockedUntil === "number" &&
      Date.now() < aiStatus.blockedUntil
    );
  }, [aiStatus]);

  const handlePreviewCandidate = useCallback((cand: VisualCandidate | RankedVisualCandidate) => {
    if (!isCandidatePreviewable(cand)) {
      setPreviewError("Đề xuất này chưa đủ điều kiện để xem trước.");
      return;
    }
    const uid = (cand as RankedVisualCandidate).uid || cand.id;

    try {
      const preview = buildPreviewFigureFromCandidate(cand);
      const validation = validateRenderableFigurePayload(preview);
      if (!validation.valid) {
        throw new Error(validation.error || "Preview không có payload renderable.");
      }
      setPreviewFigure(preview);
      setSelectedCandidateUid(uid);
      setPreviewError(null);
      onPreviewRequested?.();
    } catch (err: any) {
      const message = err.message || "Không thể tạo bản xem trước cho đề xuất này.";
      setPreviewError(message);
      onShowToast?.(message);
    }
  }, [onPreviewRequested, onShowToast]);

  const handleApplyCandidate = useCallback((cand: VisualCandidate | RankedVisualCandidate) => {
    if (!cand) return;
    if (!isCandidateApplicable(cand)) {
      onShowToast?.("Đề xuất này chưa đủ điều kiện để áp dụng.");
      return;
    }

    try {
      const finalFigure = buildSavedFigureFromCandidate(cand, theme);
      const validation = validateRenderableFigurePayload(finalFigure);
      if (!validation.valid) {
        onShowToast?.(`Không thể áp dụng: ${validation.error}`);
        return;
      }

      setVisualCandidates((prev) =>
        prev.map((c) => {
          const uid = (c as RankedVisualCandidate).uid || c.id;
          const candUid = (cand as RankedVisualCandidate).uid || cand.id;
          return uid === candUid ? { ...c, status: "applied" } : c;
        })
      );

      onCandidateApplied?.(finalFigure, cand as RankedVisualCandidate);

      // Clear preview
      setPreviewFigure(null);
      setPreviewError(null);
      setSelectedCandidateUid(null);
    } catch (err: any) {
      console.error("Apply failed", err);
      onShowToast?.(`Không thể áp dụng: ${err.message || "Đề xuất không có payload renderable."}`);
    }
  }, [theme, onShowToast, onCandidateApplied]);

  const handleAnalyzeDocumentText = useCallback(async (textText: string) => {
    if (isGenerating) return;
    if (inFlightAnalysisRef.current) {
      console.log("Analysis already in flight.");
      return;
    }

    const requestKey = `analysis_${textText.length}_${getStringHash(textText.substring(0, 100))}`;
    inFlightAnalysisRef.current = requestKey;

    if (
      aiStatus.state === "quota_limited" &&
      aiStatus.blockedUntil &&
      Date.now() < aiStatus.blockedUntil
    ) {
      const waitTime = Math.ceil((aiStatus.blockedUntil - Date.now()) / 1000);
      onShowToast?.(`AI đang bị giới hạn quota. Vui lòng thử lại sau ${waitTime} giây.`);
      inFlightAnalysisRef.current = null;
      return;
    }

    setSelectedCandidateUid(null);
    setPreviewFigure(null);
    setPreviewError(null);
    onAnalysisStart?.();

    const textHash = getStringHash(textText).toString();
    setAnalysisRunId(textHash);
    const runId = `RUN_${textHash}`;
    const localKey = geminiApiKey || localStorage.getItem("vms_local_ai_key") || "";

    const isScannedPDF = textText.includes("%PDF") || (textText.length < 50 && textText.length > 0);
    if (isScannedPDF) {
      onOcrWarning?.("Tài liệu có thể là PDF ảnh hoặc thiếu nội dung văn bản. OCR sẽ được hỗ trợ ở giai đoạn tiếp theo.");
      onShowToast?.("Phát hiện lỗi định dạng: Tài liệu thiếu metadata văn bản.");
    } else {
      onOcrWarning?.(null);
    }

    setIsGenerating(true);

    try {
      const shouldRunAI = !isAiTemporarilyBlocked();

      const [ruleResultSettled, aiResultSettled] = await Promise.allSettled([
        runRuleAnalysis(textText),
        shouldRunAI ? runAIAnalysis(textText, { apiKey: localKey }) : Promise.resolve(null),
      ]);

      const ruleResult = ruleResultSettled.status === "fulfilled" ? ruleResultSettled.value : null;
      let aiResult = aiResultSettled.status === "fulfilled" ? aiResultSettled.value : null;

      if (!shouldRunAI) {
        // Handled
      } else if (aiResultSettled.status === "rejected") {
        const error = aiResultSettled.reason;
        const msg = error?.message || String(error || "");

        const isAiDisabledOrQuota =
          msg.includes("AI_DISABLED_OR_QUOTA") ||
          msg.includes("AI_TEMPORARILY_UNAVAILABLE") ||
          msg.includes("AI_RESOURCES_EXHAUSTED") ||
          msg.toLowerCase().includes("quota");

        const isMissingKey = 
          msg.includes("Keys missing") ||
          msg.includes("key_required") ||
          msg.toLowerCase().includes("khóa ai api") ||
          msg.toLowerCase().includes("thiếu api key");

        if (isAiDisabledOrQuota) {
          setAiStatus({
            state: "quota_limited",
            blockedUntil: Date.now() + 60000,
            retryAfterSeconds: 60,
            message: "AI đang tắt hoặc đã hết quota. Bạn có thể dùng dữ liệu mẫu hoặc thử lại sau.",
          });
          onShowToast?.("AI đang tắt hoặc đã hết quota. Bạn có thể dùng dữ liệu mẫu hoặc thử lại sau.");
        } else if (isMissingKey) {
          setAiStatus({
            state: "unavailable",
            message: "Chưa nhập khóa AI hoặc server không có khóa tĩnh. Đang phân tích bằng luật.",
          });
        } else {
          console.warn("AI Analysis step failed:", msg);
          setAiStatus({
            state: "error",
            blockedUntil: Date.now() + 30000,
            retryAfterSeconds: 30,
            message: `Không kết nối được dịch vụ AI: ${msg}. Hệ thống chuyển đổi sang Bộ luật Học thuật.`,
          });
          onShowToast?.(`Lỗi kết nối AI: ${msg}`);
        }
      } else if (
        aiResult &&
        aiResult.warnings?.some(
          (w) =>
            w.includes("AI_TEMPORARILY_UNAVAILABLE") ||
            w.toLowerCase().includes("quota") ||
            w.toLowerCase().includes("keys") ||
            w.toLowerCase().includes("resources exhausted") ||
            w.includes("AI_DISABLED_OR_QUOTA") ||
            w.includes("AI_QUOTA_EXCEEDED") ||
            w.includes("AI_ROUTE_NON_JSON_RESPONSE")
        )
      ) {
        setAiStatus({
          state: "quota_limited",
          blockedUntil: Date.now() + 60000,
          retryAfterSeconds: 60,
          message:
            "AI đang tắt hoặc đã hết quota. Bạn có thể dùng dữ liệu mẫu hoặc thử lại sau.",
        });
      } else if (aiResultSettled.status === "fulfilled" && aiResultSettled.value) {
        if (aiStatus.state !== "available") {
          setAiStatus({ state: "available" });
        }
      }

      const reconciled = reconcileAnalysisResults(
        ruleResult,
        aiResult,
        runId,
        aiStatus.state !== "available" && aiStatus.state !== "error" && aiStatus.state !== "unknown"
          ? aiStatus.message
          : undefined
      );

      const newAiResult = await analyzeDocumentWithAIContract({
        rawDocumentText: textText,
        locale: 'vi'
      });
      const aiRankedCandidates = newAiResult.candidates.map((c, i) => ({
        ...c,
        uid: c.id,
        rank: 90 - i,
        alternativeVisualTypes: [],
        dataCompleteness: 1,
        evidenceStrength: c.confidence,
        userReviewRequired: c.uiStatus === 'needs_review' || c.uiStatus === 'needs_mapping'
      }));

      const combinedCandidates = [...reconciled.candidates, ...aiRankedCandidates] as typeof reconciled.candidates;

      const normalizedOpts = normalizeVisualCandidates(combinedCandidates) as unknown as typeof combinedCandidates;
      const dedupedOpts = dedupeCandidatesPreservingMetadata(normalizedOpts as unknown as NormalizedVisualCandidate[]) as unknown as typeof combinedCandidates;
      
      const normalized = normalizeCandidates(dedupedOpts);
      const dedupedAndRanked = dedupeAndRankCandidates(normalized);

      setVisualCandidates(dedupedAndRanked);

      // Callbacks for orchestration
      const newCalCases = reconciled.calibrationCases.map((c) => ({
        ...c,
        inputSnippet: textText.substring(0, 100),
      }));
      onCalibrationCasesUpdated?.(newCalCases);

      const calibrationLog: CalibrationLog = {
        id: `LOG_${runId}`,
        timestamp: new Date().toISOString(),
        inputCommand: "Analyze Document",
        ruleResult: JSON.stringify(ruleResult?.detectedIntents || []),
        aiResult: JSON.stringify(aiResult?.recommendedFigures.map((f) => f.visualType) || []),
        finalDecision: aiResult ? "reconciled" : "rule_only",
        reason: reconciled.warnings.join(" ") || (aiResult ? "Hợp nhất đa luồng phân tích." : "Phân tích bằng bộ luật (AI tạm nghỉ)."),
        confidence: reconciled.candidates[0]?.finalConfidence || 0,
        resolvedConflict: !!(ruleResult && aiResult && ruleResult.detectedIntents.length > 0 && aiResult.recommendedFigures.length > 0),
      };
      onCalibrationLogAdded?.(calibrationLog);

      if (normalized.length > 0) {
        if (reconciled.warnings.length > 0) {
          const isAiWarning = reconciled.warnings.some(
            (w) =>
              w.toLowerCase().includes("ai không khả dụng") ||
              w.toLowerCase().includes("ai đang tắt") ||
              w.toLowerCase().includes("quota") ||
              w.toLowerCase().includes("ai_disabled") ||
              w.toLowerCase().includes("resources exhausted")
          );
          if (isAiWarning) {
            onShowToast?.(reconciled.warnings[0]);
            setAiStatus((prev) => {
              if (prev.state === "quota_limited" || prev.state === "error" || prev.state === "unavailable") {
                return prev;
              }
              return {
                ...prev,
                state: "rule_based",
                blockedUntil: Date.now() + 60000,
              };
            });
          } else {
            onShowToast?.(reconciled.warnings[0]);
          }
        }
        onAnalysisSuccess?.(true, reconciled.warnings);
      } else {
        onAnalysisSuccess?.(false, reconciled.warnings);
      }
    } catch (err: any) {
      console.error("Analysis Pipeline crashed", err);
      onAnalysisError?.(err);
    } finally {
      setIsGenerating(false);
      inFlightAnalysisRef.current = null;
    }
  }, [
    isGenerating,
    geminiApiKey,
    aiStatus.state,
    aiStatus.blockedUntil,
    isAiTemporarilyBlocked,
    onShowToast,
    onAnalysisStart,
    onOcrWarning,
    onCalibrationCasesUpdated,
    onCalibrationLogAdded,
    onAnalysisSuccess,
    onAnalysisError,
  ]);
  
  const clearPreview = useCallback(() => {
    setPreviewFigure(null);
    setPreviewError(null);
    setSelectedCandidateUid(null);
  }, []);
  
  const clearVisualCandidates = useCallback(() => {
    setVisualCandidates([]);
  }, []);

  return {
    visualCandidates,
    selectedCandidateUid,
    previewFigure,
    previewError,
    aiStatus,
    isGenerating,
    analysisRunId,
    setAiStatus,
    setIsGenerating,
    isAiTemporarilyBlocked,
    
    handleAnalyzeDocumentText,
    handlePreviewCandidate,
    handleApplyCandidate,
    setPreviewFigure,
    clearPreview,
    clearVisualCandidates,
  };
}
