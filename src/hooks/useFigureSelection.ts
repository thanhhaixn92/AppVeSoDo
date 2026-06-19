import { useCallback } from 'react';

type SetString = (value: string) => void;
type SetNullableString = (value: string | null) => void;
type SetUnknownNullable = (value: null) => void;

type UseFigureSelectionArgs = {
  setSelectedFigureId: SetNullableString;
  setCurrentFigureId: SetString;
  setPreviewFigure: SetUnknownNullable;
  setSelectedNodeId: SetUnknownNullable;
  setSelectedConnectionId: SetUnknownNullable;
};

export const useFigureSelection = ({
  setSelectedFigureId,
  setCurrentFigureId,
  setPreviewFigure,
  setSelectedNodeId,
  setSelectedConnectionId,
}: UseFigureSelectionArgs) => {
  const selectActiveFigure = useCallback((id: string | null) => {
    setSelectedFigureId(id);
    setCurrentFigureId(id || '');
    setPreviewFigure(null);
    setSelectedNodeId(null);
    setSelectedConnectionId(null);
  }, [
    setSelectedFigureId,
    setCurrentFigureId,
    setPreviewFigure,
    setSelectedNodeId,
    setSelectedConnectionId,
  ]);

  const clearSavedSelectionForPreview = useCallback(() => {
    setSelectedFigureId(null);
    setCurrentFigureId('');
    setSelectedNodeId(null);
    setSelectedConnectionId(null);
  }, [
    setSelectedFigureId,
    setCurrentFigureId,
    setSelectedNodeId,
    setSelectedConnectionId,
  ]);

  return {
    selectActiveFigure,
    clearSavedSelectionForPreview,
  };
};
