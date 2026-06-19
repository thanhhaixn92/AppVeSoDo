import { RuleCommandResult, SavedFigure, PreviewFigure, EditOperation } from '../types';
import { processCommand } from '../commandProcessor';

export function parseCommandByRule(command: string, figure: SavedFigure | PreviewFigure, selectionId?: string | null): RuleCommandResult {
  const result = processCommand(command, figure, selectionId);
  const figureId = (figure as SavedFigure).id || `preview_${(figure as PreviewFigure).sourceCandidateUid}`;

  // If handled but no updated figure is returned, it might be an error or handled externally
  if (result.handled && result.updatedFigure) {
    const op: EditOperation = {
      type: 'update_figure',
      targetFigureId: figureId,
      targetType: figure.type,
      summary: result.description || 'Hiệu chỉnh bằng Rule Engine',
      beforeSnapshot: figure as SavedFigure,
      afterSnapshot: result.updatedFigure as SavedFigure,
      validationStatus: 'pending',
      warnings: [],
      errors: []
    };

    return {
      intent: 'rule_edit',
      confidence: 1.0, // Rules are deterministic
      targetFigureId: figureId,
      targetType: figure.type,
      operations: [op],
      warnings: [],
      errors: [],
      source: 'rule',
      requiresReview: true
    };
  }

  // Handle case where rule caught an error (e.g. invalid type)
  if (result.handled && !result.updatedFigure) {
    return {
      intent: 'unknown',
      confidence: 0,
      targetFigureId: figureId,
      targetType: figure.type,
      operations: [],
      warnings: [],
      errors: [result.description || 'Lỗi Rule Engine.'],
      source: 'rule',
      requiresReview: true
    };
  }

  return {
    intent: 'unknown',
    confidence: 0,
    targetFigureId: figureId,
    targetType: figure.type,
    operations: [],
    warnings: [],
    errors: [],
    source: 'rule',
    requiresReview: true
  };
}
