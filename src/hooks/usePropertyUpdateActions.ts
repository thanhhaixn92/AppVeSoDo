import { useCallback, useRef } from 'react';
import React from 'react';
import { validateRenderableFigurePayload } from '../lib/workflowUtils';

type UsePropertyUpdateActionsArgs = {
  currentFigureId: string | null;
  setPreviewFigure?: React.Dispatch<React.SetStateAction<any>>;
  setSavedFigures: React.Dispatch<React.SetStateAction<any[]>>;
  saveToHistory?: () => void;
};

export const usePropertyUpdateActions = ({
  currentFigureId,
  setPreviewFigure,
  setSavedFigures,
  saveToHistory,
}: UsePropertyUpdateActionsArgs) => {
  const historySessionsRef = useRef<Set<string>>(new Set());

  const getScopedSessionKey = useCallback(
    (sessionKey: string) => `${currentFigureId ?? 'none'}:${sessionKey}`,
    [currentFigureId]
  );

  const warnIfInvalidRenderablePayload = useCallback((figure: any) => {
    const validation = validateRenderableFigurePayload(figure);
    if (!validation.valid) {
      console.warn('[PropertyPanel] Invalid renderable payload after property update:', validation.error);
    }
    return figure;
  }, []);

  const updateActiveFigure = useCallback(
    (updater: (fig: any) => any) => {
      if (currentFigureId === 'preview' && setPreviewFigure) {
        setPreviewFigure(prev => {
          if (!prev) return prev;
          const nextFig = updater(prev);
          return warnIfInvalidRenderablePayload(nextFig);
        });
      } else {
        setSavedFigures(prev =>
          prev.map(f => {
            if (f.id !== currentFigureId) return f;
            const nextFig = updater(f);
            return warnIfInvalidRenderablePayload(nextFig);
          })
        );
      }
    },
    [currentFigureId, setPreviewFigure, setSavedFigures, warnIfInvalidRenderablePayload]
  );

  const updateActiveFigureWithHistory = useCallback(
    (updater: (fig: any) => any) => {
      if (currentFigureId && currentFigureId !== 'preview') {
        saveToHistory?.();
      }
      updateActiveFigure(updater);
    },
    [currentFigureId, saveToHistory, updateActiveFigure]
  );

  const updateActiveFigureWithSessionHistory = useCallback(
    (sessionKey: string, updater: (fig: any) => any) => {
      const scopedKey = getScopedSessionKey(sessionKey);

      if (currentFigureId && currentFigureId !== 'preview' && !historySessionsRef.current.has(scopedKey)) {
        saveToHistory?.();
        historySessionsRef.current.add(scopedKey);
      }

      updateActiveFigure(updater);
    },
    [currentFigureId, getScopedSessionKey, saveToHistory, updateActiveFigure]
  );

  const resetPropertyHistorySession = useCallback(
    (sessionKey: string) => {
      historySessionsRef.current.delete(getScopedSessionKey(sessionKey));
    },
    [getScopedSessionKey]
  );

  return {
    updateActiveFigure,
    updateActiveFigureWithHistory,
    updateActiveFigureWithSessionHistory,
    resetPropertyHistorySession,
  };
};
