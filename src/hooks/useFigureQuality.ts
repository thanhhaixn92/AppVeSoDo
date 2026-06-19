import { useMemo } from 'react';
import { SavedFigure, PreviewFigure } from '../types';
import { evaluateFigureQuality, checkA4Compliance } from '../academicArchitecture';
import { validateRenderableFigurePayload } from '../lib/workflowUtils';

export type FigureQualityStatus = 'empty' | 'invalid' | 'ready';

export function useFigureQuality(figure: SavedFigure | PreviewFigure | null) {
  return useMemo(() => {
    if (!figure) {
      return {
        status: 'empty' as FigureQualityStatus,
        figure: null,
        renderableValidation: { valid: false, error: 'Chưa có hình để kiểm tra.' },
        quality: null,
        a4: null,
        score: 0,
        checks: [],
      };
    }

    const renderableValidation = validateRenderableFigurePayload(figure);

    if (!renderableValidation.valid) {
      return {
        status: 'invalid' as FigureQualityStatus,
        figure,
        renderableValidation,
        quality: null,
        a4: null,
        score: 0,
        checks: [],
      };
    }

    const savedLikeFigure = figure as SavedFigure;
    const quality = evaluateFigureQuality(savedLikeFigure);
    const a4 = checkA4Compliance(savedLikeFigure);

    return {
      status: 'ready' as FigureQualityStatus,
      figure,
      renderableValidation,
      quality,
      a4,
      score: quality.score,
      checks: quality.checks,
    };
  }, [figure]);
}
