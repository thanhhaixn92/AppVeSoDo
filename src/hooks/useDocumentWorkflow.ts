import { useCallback, useState } from 'react';
import { blocksToText, DocumentBlock, parseTextToBlocks } from '../lib/documentParser';
import { WorkspaceDraftV1 } from '../lib/workspaceDraft';

export const DOCUMENT_SAMPLE_TEXT = `Số liệu Sản xuất Kinh doanh trước hợp nhất (Năm 2023)

| Đơn vị (Năm 2023) | Lượt tàu dẫn | Sản lượng (Tr.GTHL) | Doanh thu (Tr. đồng) | Lợi nhuận trước thuế (Tr. đồng) |
|---|---:|---:|---:|---:|
| Công ty Hoa tiêu II | 18.649 | 4.093 | 257.789 | 81.257 |
| Công ty Hoa tiêu III | 4.909 | 1.418 | 97.922 | 25.008 |
| Công ty Hoa tiêu IV | 10.331 | 656 | 59.205 | 11.046 |
| Công ty Hoa tiêu VI | 11.271 | 902 | 85.850 | 32.408 |
| TỔNG CỘNG | 45.160 | 7.070 | 500.766 | 149.719 |

ROE/ROA 2023:
Chi nhánh VI: ROE 76%, ROA 43%
Chi nhánh II: ROE 43%, ROA 32%
Chi nhánh III: ROE 42,86%, ROA 29,4%
Chi nhánh IV: ROE 23%, ROA 19%

Kế hoạch 2026–2030:
| Chỉ tiêu | ĐVT | 2026 | 2027 | 2028 | 2029 | 2030 |
|---|---|---:|---:|---:|---:|---:|
| Lượt dẫn tàu | Lượt | 56.086 | 57.769 | 59.502 | 61.287 | 63.125 |
| Tổng doanh thu | Tr. đồng | 724.521 | 767.992 | 814.072 | 862.916 | 914.691 |
| Lợi nhuận trước thuế | Tr. đồng | 247.417 | 263.770 | 279.597 | 296.372 | 315.577 |
| Lợi nhuận sau thuế | Tr. đồng | 197.934 | 211.016 | 223.678 | 237.098 | 252.461 |
| Nộp ngân sách nhà nước | Tr. đồng | 72.797 | 77.165 | 81.795 | 86.702 | 91.905 |

Đầu tư 2026–2030:
Tổng mức đầu tư dự kiến: 711,118 tỷ đồng
Kinh phí bố trí giai đoạn 2026-2030: 637,384 tỷ đồng
Trang bị phương tiện thủy: 375 tỷ đồng
Trang bị phương tiện bộ: 30 tỷ đồng
Trung tâm mô phỏng đào tạo hoa tiêu: 60 tỷ đồng
Trang thiết bị văn phòng và sản xuất: 5 tỷ đồng

Thu nhập 2023:
Thu nhập bình quân chung: 32.543.363 đồng/người/tháng
Hoa tiêu II: 37.874.213
Hoa tiêu VI: 33.007.833
Hoa tiêu IV: 29.441.313
Hoa tiêu III: 25.576.169
Khối Hoa tiêu bình quân: 51.439.543`;

export function selectAnalysisInputText(blocks: DocumentBlock[], rawDocumentText: string, rawDocumentTextStale: boolean): string {
  return rawDocumentText && !rawDocumentTextStale ? rawDocumentText : blocksToText(blocks);
}

export function createDocumentContent(text: string) {
  return { documentText: text, rawDocumentText: text, rawDocumentTextStale: false, blocks: parseTextToBlocks(text) };
}

export type DocumentContent = ReturnType<typeof createDocumentContent>;
export type ContentInsertMode = 'replace' | 'merge';

export function restoreDocumentContent(initialDraft: WorkspaceDraftV1 | null): DocumentContent {
  const documentText = initialDraft?.documentText || '';
  return {
    documentText,
    rawDocumentText: initialDraft?.rawDocumentText || '',
    rawDocumentTextStale: initialDraft?.rawDocumentTextStale || false,
    blocks: parseTextToBlocks(documentText),
  };
}

export function insertDocumentContent(
  currentBlocks: DocumentBlock[],
  incomingRawText: string,
  incomingBlocks: DocumentBlock[],
  mode: ContentInsertMode,
): DocumentContent {
  const blocks = mode === 'replace' ? incomingBlocks : [...currentBlocks, ...incomingBlocks];
  const rawDocumentText = mode === 'replace' ? incomingRawText : blocksToText(blocks);
  return { documentText: blocksToText(blocks), rawDocumentText, rawDocumentTextStale: false, blocks };
}

export function useDocumentWorkflow(initialDraft: WorkspaceDraftV1 | null) {
  const restored = restoreDocumentContent(initialDraft);
  const [documentText, setDocumentText] = useState(restored.documentText);
  const [rawDocumentText, setRawDocumentText] = useState(restored.rawDocumentText);
  const [rawDocumentTextStale, setRawDocumentTextStale] = useState(restored.rawDocumentTextStale);
  const [blocks, setBlocks] = useState<DocumentBlock[]>(restored.blocks);

  const handleDocumentBlocksChange = useCallback((newBlocks: DocumentBlock[]) => {
    setBlocks(newBlocks);
    setDocumentText(blocksToText(newBlocks));
    setRawDocumentTextStale(true);
  }, []);

  const applyContent = useCallback((rawText: string, incomingBlocks: DocumentBlock[], mode: ContentInsertMode) => {
    const content = insertDocumentContent(blocks, rawText, incomingBlocks, mode);
    setDocumentText(content.documentText); setRawDocumentText(content.rawDocumentText);
    setRawDocumentTextStale(content.rawDocumentTextStale); setBlocks(content.blocks);
  }, [blocks]);

  const loadContent = useCallback((text: string) => {
    applyContent(text, parseTextToBlocks(text), 'replace');
  }, [applyContent]);

  const handleLoadSample = useCallback(() => loadContent(DOCUMENT_SAMPLE_TEXT), [loadContent]);
  const handleImportDocument = useCallback((text: string) => loadContent(text), [loadContent]);
  const handleResetDocument = useCallback(() => {
    setDocumentText(''); setRawDocumentText(''); setRawDocumentTextStale(false); setBlocks([]);
  }, []);
  const getAnalysisInputText = useCallback(() => selectAnalysisInputText(blocks, rawDocumentText, rawDocumentTextStale), [blocks, rawDocumentText, rawDocumentTextStale]);

  return { documentText, rawDocumentText, rawDocumentTextStale, blocks, handleDocumentBlocksChange, handleInsertContent: applyContent, handleLoadSample, handleImportDocument, handleResetDocument, getAnalysisInputText };
}
