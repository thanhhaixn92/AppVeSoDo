import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { PreviewFigure, ReconciledCommandResult, SavedFigure } from '../types';
import { validateRenderableFigurePayload } from '../lib/workflowUtils';

type ProposalSnapshot = SavedFigure & PreviewFigure;

type UseCommandProposalActionsArgs = {
  pendingProposal: ReconciledCommandResult | null;
  savedFigures: SavedFigure[];
  setSavedFigures: Dispatch<SetStateAction<SavedFigure[]>>;
  previewFigure: PreviewFigure | null;
  setPreviewFigure: Dispatch<SetStateAction<PreviewFigure | null>>;
  saveToHistory: () => void;
  setPreviewWorkflowState: () => void;
  showToast: (message: string) => void;
  setPendingProposal: Dispatch<SetStateAction<ReconciledCommandResult | null>>;
};

export const useCommandProposalActions = ({
  pendingProposal,
  savedFigures,
  setSavedFigures,
  previewFigure,
  setPreviewFigure,
  saveToHistory,
  setPreviewWorkflowState,
  showToast,
  setPendingProposal,
}: UseCommandProposalActionsArgs) => {
  const applyProposal = useCallback(() => {
    if (!pendingProposal) return;

    const clonedFigures = [...savedFigures];

    for (const op of pendingProposal.operations) {
      const clonedSnapshot = JSON.parse(JSON.stringify(op.afterSnapshot)) as ProposalSnapshot;
      const validation = validateRenderableFigurePayload(clonedSnapshot);

      if (!validation.valid) {
        showToast(`Dữ liệu không an toàn để Apply: ${validation.error}`);
        return;
      }

      const targetIndex = clonedFigures.findIndex(f => f.id === op.targetFigureId);

      if (targetIndex === -1) {
        const isPreviewTarget = previewFigure && `preview_${previewFigure.sourceCandidateUid}` === op.targetFigureId;

        if (isPreviewTarget && previewFigure) {
          setPreviewFigure(clonedSnapshot);
          setPreviewWorkflowState();
          setPendingProposal(null);
          showToast('Đã cập nhật bản xem trước.');
          return;
        }

        showToast(`Không tìm thấy hình ${op.targetFigureId}`);
        return;
      }

      if (clonedFigures[targetIndex].type !== op.targetType) {
        showToast(`Sai kiểu dữ liệu hình (${clonedFigures[targetIndex].type} != ${op.targetType})`);
        return;
      }

      clonedFigures[targetIndex] = clonedSnapshot;
    }

    saveToHistory();
    setSavedFigures(clonedFigures);
    setPendingProposal(null);
    showToast('Áp dụng thay đổi thành công.');
  }, [
    pendingProposal,
    savedFigures,
    previewFigure,
    saveToHistory,
    setSavedFigures,
    setPreviewFigure,
    setPreviewWorkflowState,
    showToast,
    setPendingProposal,
  ]);

  const cancelProposal = useCallback(() => {
    setPendingProposal(null);
    showToast('Đã hủy đề xuất.');
  }, [setPendingProposal, showToast]);

  return {
    applyProposal,
    cancelProposal,
  };
};
