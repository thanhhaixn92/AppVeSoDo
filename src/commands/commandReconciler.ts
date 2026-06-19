import { RuleCommandResult, AICommandResult, ReconciledCommandResult, EditOperation } from '../types';
import { validateRenderableFigurePayload } from '../lib/workflowUtils';

export function reconcileCommandResults(
  ruleResult: RuleCommandResult,
  aiResult: AICommandResult | null
): ReconciledCommandResult {

  // Default block
  const createEmptyResult = (): ReconciledCommandResult => ({
    intent: 'unknown',
    confidence: 0,
    targetFigureId: '',
    targetType: '',
    operations: [],
    warnings: [],
    errors: ['Không có lệnh nào hợp lệ.'],
    source: 'reconciled',
    requiresReview: true
  });

  let selectedSource: 'rule' | 'ai' | 'reconciled' = 'reconciled';
  let bestOps: EditOperation[] = [];
  let bestConf = 0;
  let finalErrors: string[] = [];
  let finalWarnings: string[] = [];

  // RULE FIRST logic
  // If rule has high confidence and no errors, we don't even need AI result (it might be null)
  if (ruleResult.confidence >= 0.9 && ruleResult.errors.length === 0 && ruleResult.operations.length > 0) {
    selectedSource = 'rule';
    bestOps = ruleResult.operations;
    bestConf = ruleResult.confidence;
    finalWarnings = ruleResult.warnings || [];
  } 
  // If rule failed or low confidence, we try AI if available
  else if (aiResult && aiResult.confidence > 0 && aiResult.errors.length === 0 && aiResult.operations.length > 0) {
    selectedSource = 'ai';
    bestOps = aiResult.operations;
    bestConf = aiResult.confidence;
    finalWarnings = aiResult.warnings || [];
    if (ruleResult.errors.length > 0) {
      finalWarnings.push(`Rule Engine báo lỗi: ${ruleResult.errors.join(' | ')}. Chuyển sang dùng AI.`);
    }
  } 
  // Fallback: rule might have partial confidence but still some operations
  else if (ruleResult.operations.length > 0 && ruleResult.errors.length === 0) {
    selectedSource = 'rule';
    bestOps = ruleResult.operations;
    bestConf = ruleResult.confidence;
    finalWarnings = ruleResult.warnings || [];
    if (aiResult?.errors.length) {
       finalWarnings.push(`AI Engine báo lỗi: ${aiResult.errors.join(' | ')}`);
    }
  }

  // If both failed
  if (bestOps.length === 0) {
    const res = createEmptyResult();
    if (ruleResult.errors.length) res.errors.push(`Rule: ${ruleResult.errors[0]}`);
    if (aiResult?.errors?.length) res.errors.push(`AI: ${aiResult.errors[0]}`);
    return res;
  }

  // Deep validate the selected operations
  const validatedOps: EditOperation[] = [];
  for (const op of bestOps) {
    if (!op.targetFigureId) {
      finalErrors.push("Lỗi Reconciler: Thiếu targetFigureId.");
      continue;
    }
    
    // Check against duplicated table columns
    if (op.afterSnapshot.type === 'table' && op.afterSnapshot.table) {
      const keys = op.afterSnapshot.table.columns.map(c => c.key);
      const uniqueKeys = new Set(keys);
      if (keys.length !== uniqueKeys.size) {
         finalErrors.push("Lỗi Reconciler: Bảng chứa cột trùng lặp.");
         continue;
      }
    }

    // Safety fallback standard validation
    const validation = validateRenderableFigurePayload(op.afterSnapshot);
    if (!validation.valid) {
      finalErrors.push(`Lỗi an toàn dữ liệu: ${validation.error}`);
      continue;
    }

    // If we reach here, operation is deeply safe
    op.validationStatus = 'valid';
    validatedOps.push(op);
  }

  if (validatedOps.length === 0) {
     const res = createEmptyResult();
     res.errors = finalErrors;
     return res;
  }

  return {
    intent: selectedSource === 'rule' ? ruleResult.intent : (aiResult?.intent || 'unknown'),
    confidence: bestConf,
    targetFigureId: validatedOps[0].targetFigureId,
    targetType: validatedOps[0].targetType,
    operations: validatedOps,
    warnings: finalWarnings,
    errors: finalErrors,
    source: selectedSource,
    requiresReview: true
  };
}
