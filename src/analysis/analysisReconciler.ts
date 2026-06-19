import { 
  RuleAnalysisResult, 
  AIAnalysisResult, 
  ReconciledAnalysisResult, 
  VisualCandidate, 
  RankedVisualCandidate,
  CandidateSource,
  CalibrationCase
} from '../types';

/**
 * Reconciler: Merges Rule and AI analysis results.
 */
export function reconcileAnalysisResults(
  ruleResult: RuleAnalysisResult | null,
  aiResult: AIAnalysisResult | null,
  analysisRunId: string,
  aiStatusMessage?: string
): ReconciledAnalysisResult & { calibrationCases: CalibrationCase[] } {
  const finalCandidates: RankedVisualCandidate[] = [];
  const warnings: string[] = [];
  const calibrationCases: CalibrationCase[] = [];

  const ruleCandidates = ruleResult?.recommendedCandidates || [];
  const aiFigures = aiResult?.recommendedFigures || [];

  if (aiStatusMessage) {
    warnings.push(aiStatusMessage);
  } else if (!aiResult) {
    warnings.push("AI không khả dụng, đang dùng đề xuất rule-based.");
  }

  // 1. Process Rule Candidates
  ruleCandidates.forEach((rc, index) => {
    finalCandidates.push({
      ...rc,
      uid: `rule_${index}_${analysisRunId}`,
      rank: 0,
      alternativeVisualTypes: [],
      dataCompleteness: 1,
      evidenceStrength: rc.confidence,
      userReviewRequired: false,
      finalConfidence: rc.confidence
    });
  });

  // 2. Process AI Recommendations and Merge
  aiFigures.forEach((af, index) => {
    // Check for similar rule candidate to merge
    const existing = finalCandidates.find(c => 
      c.data.type === af.figureType && 
      (c.visualType === af.visualType || c.title.toLowerCase().includes(af.title.toLowerCase().substring(0, 8)))
    );
    
    if (existing) {
      // Conflict detection before merge
      if (existing.visualType !== af.visualType || existing.title !== af.title) {
        calibrationCases.push({
          id: `cal_${analysisRunId}_${index}`,
          timestamp: new Date().toISOString(),
          inputSnippet: "", // filled by caller
          ruleCandidateSummary: `${existing.visualType}: ${existing.title}`,
          aiCandidateSummary: `${af.visualType}: ${af.title}`,
          differenceType: existing.visualType !== af.visualType ? "type_conflict" : "title_conflict",
          decision: "pending",
          safeForRuleLearning: true
        });
      }

      // MERGE
      existing.source = 'merged';
      existing.detectionMethod = 'merged';
      existing.aiConfidence = af.confidence;
      existing.aiReason = af.reason;
      existing.finalConfidence = Math.min(0.99, existing.confidence + (af.confidence * 0.15));
      existing.mergedReason = `Hợp nhất đề xuất: Rule(${existing.visualType}) + AI(${af.visualType})`;
      existing.rank += 10;
    } else {
      // AI only
      const hasPayload = af.renderableData && (af.renderableData.chart || af.renderableData.diagram || af.renderableData.table);
      
      finalCandidates.push({
        id: `ai_${index}_${analysisRunId}`,
        sourceText: "", 
        visualType: af.visualType,
        confidence: af.confidence,
        detectionMethod: 'ai',
        source: 'ai',
        aiConfidence: af.confidence,
        finalConfidence: af.confidence,
        aiReason: af.reason,
        title: af.title,
        rationale: af.reason,
        extractedItems: [],
        data: {
          type: af.figureType,
          title: af.title,
          chart: af.renderableData?.chart,
          diagram: af.renderableData?.diagram,
          table: af.renderableData?.table
        },
        uid: `ai_${index}_${analysisRunId}`,
        rank: 5,
        alternativeVisualTypes: [],
        dataCompleteness: hasPayload ? 1 : 0,
        evidenceStrength: af.confidence,
        userReviewRequired: !hasPayload
      });

      calibrationCases.push({
        id: `cal_ai_only_${analysisRunId}_${index}`,
        timestamp: new Date().toISOString(),
        inputSnippet: "", 
        ruleCandidateSummary: "None",
        aiCandidateSummary: `${af.visualType}: ${af.title}`,
        differenceType: "rule_missing_ai_found",
        decision: "pending",
        safeForRuleLearning: true
      });
    }
  });

  // 3. Final Ranking
  const ranked = finalCandidates
    .sort((a, b) => b.finalConfidence - a.finalConfidence)
    .map((c, i) => ({ ...c, rank: i + 1 }));

  return {
    candidates: ranked,
    ruleResult: ruleResult || undefined,
    aiResult: aiResult || undefined,
    warnings,
    analysisRunId,
    calibrationCases
  };
}
