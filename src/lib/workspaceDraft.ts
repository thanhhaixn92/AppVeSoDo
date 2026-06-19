import { SavedFigure, WorkflowState, PreviewFigure, RankedVisualCandidate } from '../types';
import { validateRenderableFigurePayload } from './workflowUtils';

export type WorkspaceDraftV1 = {
  version: 1;
  savedAt: string;
  documentText: string;
  rawDocumentText?: string;
  rawDocumentTextStale?: boolean;
  visualCandidates: RankedVisualCandidate[];
  previewFigure: PreviewFigure | null;
  savedFigures: SavedFigure[];
  selectedCandidateUid: string | null;
  currentFigureId: string | null;
  selectedFigureId: string | null;
  workflowState: WorkflowState;
  activeHeaderTab?: string;
  activeLeftTab?: string;
  activeRightTab?: string;
  sourceType?: 'empty' | 'user_paste' | 'sample' | 'upload' | 'restored';
};

const DRAFT_KEY = "academic_figure_creator_workspace_draft_v1";

export function saveWorkspaceDraft(draft: Omit<WorkspaceDraftV1, "version" | "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    const fullDraft: WorkspaceDraftV1 = {
      ...draft,
      version: 1,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(fullDraft));
  } catch (error) {
    console.warn("[WorkspaceDraft] Không thể lưu bản nháp:", error);
  }
}

export function loadWorkspaceDraft(): WorkspaceDraftV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(DRAFT_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data) as any;
    
    if (parsed.version !== 1) {
      console.warn("[WorkspaceDraft] Sai phiên bản draft, sẽ loại bỏ.");
      return null;
    }

    // Validate figures
    const validSavedFigures: SavedFigure[] = [];
    if (Array.isArray(parsed.savedFigures)) {
      for (const fig of parsed.savedFigures) {
        if (fig && typeof fig === 'object') {
           const validation = validateRenderableFigurePayload(fig);
           if (validation.valid) {
             validSavedFigures.push(fig);
           }
        }
      }
    }

    let validPreviewFigure: PreviewFigure | null = null;
    if (parsed.previewFigure && typeof parsed.previewFigure === 'object') {
       const validation = validateRenderableFigurePayload(parsed.previewFigure);
       if (validation.valid) {
         validPreviewFigure = parsed.previewFigure;
       }
    }
    
    let safeCurrentFigureId = parsed.currentFigureId || null;
    let safeSelectedFigureId = parsed.selectedFigureId || null;
    
    // Validate currentFigureId exists
    if (safeCurrentFigureId) {
      const exists = validSavedFigures.some(f => f.id === safeCurrentFigureId) || 
                     (validPreviewFigure && `preview_${validPreviewFigure.sourceCandidateUid}` === safeCurrentFigureId);
      if (!exists) {
        safeCurrentFigureId = validSavedFigures.length > 0 ? validSavedFigures[0].id : null;
      }
    }

    // Validate selectedFigureId exists
    if (safeSelectedFigureId) {
      const exists = validSavedFigures.some(f => f.id === safeSelectedFigureId);
      if (!exists) {
        safeSelectedFigureId = validSavedFigures.length > 0 ? validSavedFigures[0].id : null;
      }
    }

    const hasText = !!(parsed.documentText && typeof parsed.documentText === 'string' && parsed.documentText.trim());
    const validVisualCandidates = Array.isArray(parsed.visualCandidates) ? parsed.visualCandidates : [];
    
    let workflowState: WorkflowState = parsed.workflowState || "EMPTY";
    
    // workflowState consistency check
    if (!hasText && validSavedFigures.length === 0 && !validPreviewFigure) {
      workflowState = "EMPTY";
    } else if (hasText && validVisualCandidates.length === 0) {
      workflowState = "INPUT_READY";
    } else if (validVisualCandidates.length > 0 && !validPreviewFigure && workflowState === "EMPTY") {
      workflowState = "CANDIDATES_READY";
    }

    return {
      version: 1,
      savedAt: parsed.savedAt,
      documentText: parsed.documentText || "",
      rawDocumentText: parsed.rawDocumentText,
      rawDocumentTextStale: !!parsed.rawDocumentTextStale,
      visualCandidates: validVisualCandidates,
      previewFigure: validPreviewFigure,
      savedFigures: validSavedFigures,
      selectedCandidateUid: parsed.selectedCandidateUid || null,
      currentFigureId: safeCurrentFigureId,
      selectedFigureId: safeSelectedFigureId,
      workflowState: workflowState,
      activeHeaderTab: parsed.activeHeaderTab,
      activeLeftTab: parsed.activeLeftTab,
      activeRightTab: parsed.activeRightTab,
      sourceType: parsed.sourceType || "restored"
    };
  } catch (error) {
    console.warn("[WorkspaceDraft] Không thể khôi phục bản nháp:", error);
    return null;
  }
}

export function clearWorkspaceDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (e) {
    // ignore
  }
}
