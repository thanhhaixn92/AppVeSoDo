import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  FileText, 
  Database, 
  Trash2, 
  Plus, 
  Columns, 
  Rows, 
  ArrowUp, 
  ArrowDown, 
  Type, 
  Heading1, 
  Heading2, 
  List, 
  Table as TableIcon, 
  Wand2, 
  RefreshCw, 
  Upload,
  Sparkles,
  Copy
} from "lucide-react";
import { DocumentBlock, parseHtmlToBlocks, parseTextToBlocks } from "../lib/documentParser";

interface RichDocumentEditorProps {
  blocks: DocumentBlock[];
  onChange: (newBlocks: DocumentBlock[]) => void;
  onInsertContent: (rawText: string, blocks: DocumentBlock[], mode: 'replace' | 'merge') => void;
  onImportDocument: (rawText: string) => void;
  isGenerating: boolean;
  onAnalyze: () => void;
  onReset: () => void;
  onLoadSample: () => void;
}

export const RichDocumentEditor: React.FC<RichDocumentEditorProps> = ({
  blocks,
  onChange,
  onInsertContent,
  onImportDocument,
  isGenerating,
  onAnalyze,
  onReset,
  onLoadSample,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emptyDraft, setEmptyDraft] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);


  // Use local state and ref for two-stage reset confirmation (avoid window.confirm iframe blockage)
  const [isResetConfirm, setIsResetConfirm] = useState(false);
  const resetTimeoutRef = useRef<any>(null);

  const handleResetClick = () => {
    if (isResetConfirm) {
      onReset();
      setIsResetConfirm(false);
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
    } else {
      setIsResetConfirm(true);
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      resetTimeoutRef.current = setTimeout(() => {
        setIsResetConfirm(false);
      }, 3000);
    }
  };

  const handleEmptyDraftSubmit = () => {
    if (!emptyDraft.trim()) return;
    const pastedBlocks = parseTextToBlocks(emptyDraft);
    if (pastedBlocks.length > 0) {
      onInsertContent(emptyDraft, pastedBlocks, 'replace');
      setEmptyDraft("");
    }
  };

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  // Focus case state
  const [activeCell, setActiveCell] = useState<{ blockId: string; row: number; col: number } | null>(null);

  // Document-level selection state
  const [isAllSelected, setIsAllSelected] = useState(false);

  const handleCopyAll = useCallback(() => {
    let text = "";
    if (blocks.length === 0 && emptyDraft.trim()) {
      text = emptyDraft;
    } else {
      text = blocks.map(b => {
        if (b.type === 'heading') return `# ${b.text}`;
        if (b.type === 'list') return `- ${b.text}`;
        if (b.type === 'table' && b.tableData) {
          const rows = b.tableData.rows.map(r => r.join('\t')).join('\n');
          return `${b.tableData.headers.join('\t')}\n${rows}`;
        }
        return b.text;
      }).join('\n\n');
    }
    navigator.clipboard.writeText(text).catch(err => {
      console.warn("Clipboard write failed", err);
    });
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }, [blocks, emptyDraft]);

  // Global keydown listener for document-level selection
  useEffect(() => {
    if (!isAllSelected) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAllSelected(false);
        e.preventDefault();
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        onChange([]); // Clear document content via safe callback
        setEmptyDraft("");
        setIsAllSelected(false);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        handleCopyAll();
        e.preventDefault();
        // Optional: blink or toast feedback, but keep it simple
        return;
      }
      // Re-trigger select all if they press Ctrl+A again while already selected
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isAllSelected, onChange, handleCopyAll]);

  // Removed handleCopyAll from here because it was moved into a useCallback above.

  // Helper listener to allow Ctrl+A select all within inputs/textareas and stop bubbling
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      e.stopPropagation();
      setIsAllSelected(true);
      e.currentTarget.blur(); // Remove focus from individual input to show document-level selection
    }
  };

  const isEmpty = blocks.length === 0 && !emptyDraft.trim();

  // Block Manipulation Helper
  const updateBlockText = (id: string, text: string) => {
    const next = blocks.map(b => b.id === id ? { ...b, text } : b);
    onChange(next);
  };

  const removeBlock = (id: string) => {
    const next = blocks.filter(b => b.id !== id);
    onChange(next);
  };

  const addBlock = (type: 'heading' | 'paragraph' | 'list' | 'table') => {
    const id = `block-${Math.random().toString(36).substring(2, 11)}`;
    const newBlock: DocumentBlock = {
      id,
      type,
      text: type === 'table' ? undefined : "",
      level: type === 'heading' ? 2 : undefined,
      tableData: type === 'table' ? {
        headers: ["Tiêu đề 1", "Tiêu đề 2"],
        rows: [["Dữ liệu A1", "Dữ liệu A2"], ["Dữ liệu B1", "Dữ liệu B2"]]
      } : undefined
    };
    onChange([...blocks, newBlock]);
  };

  // Table manipulation helper actions
  const addTableRow = (blockId: string) => {
    const next = blocks.map(b => {
      if (b.id === blockId && b.tableData) {
        const colCount = b.tableData.headers.length;
        const newRow = Array(colCount).fill("");
        return {
          ...b,
          tableData: {
            ...b.tableData,
            rows: [...b.tableData.rows, newRow]
          }
        };
      }
      return b;
    });
    onChange(next);
  };

  const deleteTableRow = (blockId: string, rowIndex: number) => {
    const next = blocks.map(b => {
      if (b.id === blockId && b.tableData) {
        const nextRows = b.tableData.rows.filter((_, idx) => idx !== rowIndex);
        return {
          ...b,
          tableData: {
            ...b.tableData,
            rows: nextRows
          }
        };
      }
      return b;
    });
    onChange(next);
  };

  const addTableColumn = (blockId: string) => {
    const next = blocks.map(b => {
      if (b.id === blockId && b.tableData) {
        const nextHeaders = [...b.tableData.headers, `Cột ${b.tableData.headers.length + 1}`];
        const nextRows = b.tableData.rows.map(row => [...row, ""]);
        return {
          ...b,
          tableData: {
            headers: nextHeaders,
            rows: nextRows
          }
        };
      }
      return b;
    });
    onChange(next);
  };

  const deleteTableColumn = (blockId: string, colIndex: number) => {
    const next = blocks.map(b => {
      if (b.id === blockId && b.tableData) {
        if (b.tableData.headers.length <= 1) return b; // Prevent deleting the last column
        const nextHeaders = b.tableData.headers.filter((_, idx) => idx !== colIndex);
        const nextRows = b.tableData.rows.map(row => row.filter((_, idx) => idx !== colIndex));
        return {
          ...b,
          tableData: {
            headers: nextHeaders,
            rows: nextRows
          }
        };
      }
      return b;
    });
    onChange(next);
  };

  const updateTableCell = (blockId: string, rowIndex: number, colIndex: number, val: string) => {
    const next = blocks.map(b => {
      if (b.id === blockId && b.tableData) {
        const nextRows = [...b.tableData.rows];
        nextRows[rowIndex] = [...nextRows[rowIndex]];
        nextRows[rowIndex][colIndex] = val;
        return {
          ...b,
          tableData: {
            ...b.tableData,
            rows: nextRows
          }
        };
      }
      return b;
    });
    onChange(next);
  };

  const updateTableHeaderCell = (blockId: string, colIndex: number, val: string) => {
    const next = blocks.map(b => {
      if (b.id === blockId && b.tableData) {
        const nextHeaders = [...b.tableData.headers];
        nextHeaders[colIndex] = val;
        return {
          ...b,
          tableData: {
            ...b.tableData,
            headers: nextHeaders
          }
        };
      }
      return b;
    });
    onChange(next);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const next = [...blocks];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    onChange(next);
  };

  // Intercept Paste events inside the page component
  const handlePasteEvent = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");

    if (html && (html.includes("<table") || html.includes("<p>") || html.includes("<h1>"))) {
      e.preventDefault();
      const pastedBlocks = parseHtmlToBlocks(html, text);
      if (pastedBlocks.length > 0) {
        onInsertContent(text || html, pastedBlocks, 'merge');
      }
    } else if (text) {
      const containsMarkdownTable = text.includes("|") && text.split("\n").some(l => l.includes("---"));
      if (containsMarkdownTable || text.includes("#") || text.includes("\n")) {
        e.preventDefault();
        const pastedBlocks = parseTextToBlocks(text);
        if (pastedBlocks.length > 0) {
          onInsertContent(text, pastedBlocks, 'merge');
        }
      }
    }
  };

  // Drag and drop processing
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleUploadedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        onImportDocument(text);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div 
      className="flex-1 w-full max-w-6xl mx-auto flex flex-col gap-2 p-1 sm:p-2 overflow-hidden h-full relative"
      onPaste={handlePasteEvent}
    >
      {isAllSelected && (
        <div data-testid="document-selection-banner" className="absolute top-0 left-0 right-0 z-50 bg-primary text-white text-xs font-bold text-center py-2 shadow-md flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-3.5 h-3.5" />
          Đã chọn toàn bộ tài liệu — Ctrl+C để sao chép, Delete để xóa, Esc để hủy.
        </div>
      )}
      <div className="flex flex-col gap-1 mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black text-text-main tracking-tight">Trình biên dịch Tài liệu đầu vào</h2>
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Rich v2
          </span>
        </div>
        <p className="text-sm text-text-muted">
          Hệ thống tương thích hoàn toàn việc kéo thả tập tin, dán nội dung từ Word/Excel hoặc nhập văn bản. Nội dung bảng biểu sẽ được giữ nguyên cấu trúc trực quan.
        </p>
      </div>

      {/* TOOLBAR FOR QUICK INSERTION & CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-header-bg border border-header-border rounded-xl shadow-md z-15">
        <div className="flex items-center flex-wrap gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2 select-none">Thêm nhanh:</span>
          <button 
            onClick={() => addBlock('heading')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/5 font-semibold"
          >
            <Heading2 className="w-3.5 h-3.5" /> Tiêu đề
          </button>
          <button 
            onClick={() => addBlock('paragraph')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/5 font-semibold"
          >
            <Type className="w-3.5 h-3.5" /> Đoạn văn
          </button>
          <button 
            onClick={() => addBlock('list')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/5 font-semibold"
          >
            <List className="w-3.5 h-3.5" /> Liệt kê
          </button>
          <button 
            onClick={() => addBlock('table')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/5 font-semibold"
          >
            <TableIcon className="w-3.5 h-3.5 mr-0.5" /> Bảng thực
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[8px] text-slate-400 italic hidden sm:inline">Tự động đồng bộ</span>
          <button
            onClick={() => setIsAllSelected(true)}
            disabled={isEmpty}
            className="p-1 px-2 border rounded-lg text-xs font-bold transition-all flex items-center gap-1 select-none bg-surface/5 hover:bg-surface/20 text-slate-300 border-transparent hover:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Chọn tất cả"
          >
            Chọn tất cả
          </button>
          <button
            onClick={handleCopyAll}
            disabled={isEmpty}
            className="p-1 px-2 border rounded-lg text-xs font-bold transition-all flex items-center gap-1 select-none bg-surface/5 hover:bg-surface/20 text-slate-300 border-transparent hover:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed w-[130px] justify-center"
            title="Sao chép tất cả"
          >
            {copyFeedback ? (
              <span className="text-green-400 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đã sao chép!</span>
            ) : (
              <><Copy className="w-3.5 h-3.5" /> Sao chép tất cả</>
            )}
          </button>
          <button
            onClick={handleResetClick}
            className={`p-1 px-2 border rounded-lg text-xs font-bold transition-all flex items-center gap-1 select-none ${
              isResetConfirm 
                ? "bg-red-600 text-white border-red-500 animate-pulse scale-105" 
                : "bg-red-950/40 text-red-400 hover:text-red-300 border-red-900/40 hover:bg-red-950/80"
            }`}
            title={isResetConfirm ? "Click lại một lần nữa để xác nhận xóa toàn bộ" : "Dọn sạch tài liệu"}
          >
            <Trash2 className="w-3.5 h-3.5" /> {isResetConfirm ? "Xác nhận xóa?" : "Dọn sạch"}
          </button>
        </div>
      </div>

      {/* DOCUMENT PREVIEW CANVAS CONTAINER */}
      <div 
        data-testid="document-editor-surface"
        data-all-selected={isAllSelected}
        className={`relative flex-1 min-h-[200px] p-2 sm:p-4 flex flex-col gap-4 overflow-y-auto transition-all ${
          isAllSelected ? 'ring-2 ring-primary bg-primary/[0.03] border border-primary rounded-xl' :
          dragActive ? 'bg-primary/[0.01] ring-2 ring-primary/20 scale-[0.99] rounded-xl' : ''
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {blocks.length === 0 ? (
          <div className="flex-1 flex flex-col w-full max-w-2xl mx-auto items-center justify-center text-center py-6 text-text-subtle">
            <FileText className="w-12 h-12 text-text-subtle mb-3 stroke-[1.25]" />
            <p className="font-bold text-lg text-text-main mb-1">Tài liệu của bạn đang trống</p>
            <p className="text-sm max-w-md mx-auto mb-6">
              Dán hoặc nhập nội dung vào ô bên dưới, sau đó bấm &quot;Đưa nội dung vào tài liệu&quot;.
              Bạn vẫn có thể kéo thả tệp, tải tài liệu mẫu.
            </p>

            <div className="w-full flex flex-col items-center gap-3 mb-6">
              <textarea
                aria-label="Vùng nhập tài liệu trống"
                placeholder="Dán hoặc nhập dữ liệu tại đây...&#10;Ví dụ: bảng số liệu, mô tả quy trình, danh sách bước, nguồn trích dẫn.&#10;Bạn có thể dán nhiều dòng từ Word, Excel hoặc văn bản thuần."
                value={emptyDraft}
                onChange={(e) => setEmptyDraft(e.target.value)}
                onKeyDown={(e) => {
                  handleInputKeyDown(e);
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleEmptyDraftSubmit();
                  }
                }}
                className="w-full min-h-[240px] md:min-h-[300px] p-4 text-sm font-medium text-text-main bg-surface outline-none border border-border rounded-xl focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all resize-y shadow-sm"
              />
              <button
                onClick={handleEmptyDraftSubmit}
                disabled={!emptyDraft.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white rounded-xl tracking-wider select-none transition-all uppercase shadow-sm disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" /> Đưa nội dung vào tài liệu
              </button>
            </div>

            <div className="w-full relative flex items-center justify-center py-2 mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
              <div className="relative px-4 bg-surface text-xs font-bold text-text-subtle uppercase tracking-wider">Hoặc</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={onLoadSample}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-surface hover:bg-surface-soft border border-border rounded-xl tracking-wider select-none transition-all uppercase hover:border-primary/20 hover:text-primary"
              >
                <Database className="w-3.5 h-3.5" /> Dựng dữ liệu mẫu
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-surface hover:bg-surface-soft border border-border rounded-xl tracking-wider select-none transition-all uppercase hover:border-primary/20 hover:text-primary"
              >
                <Upload className="w-3.5 h-3.5" /> Tải tệp nghiên cứu
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".txt,.md,.rtf" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleUploadedFile(e.target.files[0]);
                }
              }} 
            />
          </div>
        ) : (
          blocks.map((block, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === blocks.length - 1;

            return (
              <div 
                key={block.id} 
                className={`group relative pl-4 border-l-2 border-transparent hover:border-primary/40 focus-within:border-primary/80 transition-all py-1 ${isAllSelected ? 'opacity-80 mix-blend-multiply' : ''}`}
                onClick={(e) => {
                  if (isAllSelected) {
                    setIsAllSelected(false);
                  }
                }}
              >
                {/* Block Controls */}
                <div className="absolute right-0 top-0 hidden group-hover:flex items-center gap-1 p-1 bg-surface border border-border shadow-md rounded-lg z-20">
                  <button 
                    onClick={() => moveBlock(idx, 'up')}
                    disabled={isFirst}
                    className="p-1 hover:bg-surface-soft text-text-subtle disabled:opacity-20 rounded"
                    title="Di chuyển lên"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => moveBlock(idx, 'down')}
                    disabled={isLast}
                    className="p-1 hover:bg-surface-soft text-text-subtle disabled:opacity-20 rounded"
                    title="Di chuyển xuống"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => removeBlock(block.id)}
                    className="p-1 hover:bg-red-50 text-red-500 rounded"
                    title="Xóa khối"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Edit cases based on Block Type */}
                {block.type === 'heading' && (
                  <input
                    type="text"
                    value={block.text || ""}
                    onChange={(e) => updateBlockText(block.id, e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Nhập tiêu đề hoặc đề mục..."
                    className="w-full text-lg md:text-xl font-bold tracking-tight text-text-main bg-transparent outline-none border-b border-transparent focus:border-border/60 transition-colors pb-1 py-1"
                  />
                )}

                {block.type === 'paragraph' && (
                  <textarea
                    value={block.text || ""}
                    onChange={(e) => updateBlockText(block.id, e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Dán nội dung hoặc gõ nội dung văn bản..."
                    rows={Math.max(1, Math.ceil((block.text?.length || 0) / 80))}
                    className="w-full text-xs md:text-sm text-text-main leading-relaxed bg-transparent outline-none border-none resize-none overflow-hidden h-auto py-1"
                  />
                )}

                {block.type === 'list' && (
                  <div className="flex items-start gap-2">
                    <span className="text-primary mt-1.5 text-xs font-bold">•</span>
                    <input
                      type="text"
                      value={block.text || ""}
                      onChange={(e) => updateBlockText(block.id, e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder="Nội dung danh sách liệt kê..."
                      className="flex-1 text-xs md:text-sm text-text-main bg-transparent outline-none border-none py-1"
                    />
                  </div>
                )}

                {block.type === 'table' && block.tableData && (
                  <div className="my-2 bg-surface rounded-xl border border-border shadow-sm overflow-hidden select-text">
                    <div className="bg-surface-soft border-b border-border p-2 flex flex-wrap items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-text-subtle uppercase tracking-widest pl-1">Bảng cấu trúc thực</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => addTableRow(block.id)}
                          className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold bg-surface hover:bg-surface-soft text-text-main border border-border rounded transition-colors uppercase tracking-wider"
                        >
                          <Rows className="w-3 h-3" /> Thêm dòng
                        </button>
                        <button
                          onClick={() => addTableColumn(block.id)}
                          className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold bg-surface hover:bg-surface-soft text-text-main border border-border rounded transition-colors uppercase tracking-wider"
                        >
                          <Columns className="w-3 h-3" /> Thêm cột
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="bg-surface-soft/60 border-b border-border">
                            {block.tableData.headers.map((hdr, colIdx) => (
                              <th key={colIdx} className="p-2.5 text-xs font-bold text-text-main relative group/th border-r border-border last:border-r-0">
                                <input
                                  type="text"
                                  value={hdr}
                                  onChange={(e) => updateTableHeaderCell(block.id, colIdx, e.target.value)}
                                  onKeyDown={handleInputKeyDown}
                                  className="w-full bg-transparent font-bold text-xs text-text-main outline-none focus:ring-1 focus:ring-primary/20 p-0.5 rounded transition-shadow"
                                />
                                {block.tableData!.headers.length > 1 && (
                                  <button
                                    onClick={() => deleteTableColumn(block.id, colIdx)}
                                    className="absolute -top-1 -right-1 hidden group-hover/th:flex bg-red-500 text-white p-0.5 rounded-full hover:bg-red-650 shadow z-10"
                                    title="Xóa cột này"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {block.tableData.rows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-b border-border hover:bg-surface-soft/20 last:border-b-0 relative group/tr">
                              {row.map((cell, colIdx) => {
                                const isFocused = activeCell?.blockId === block.id && activeCell?.row === rowIdx && activeCell?.col === colIdx;
                                return (
                                  <td key={colIdx} className="p-2 text-xs border-r border-border last:border-r-0 relative">
                                    <input
                                      type="text"
                                      value={cell}
                                      onFocus={() => setActiveCell({ blockId: block.id, row: rowIdx, col: colIdx })}
                                      onChange={(e) => updateTableCell(block.id, rowIdx, colIdx, e.target.value)}
                                      onKeyDown={handleInputKeyDown}
                                      className="w-full bg-transparent text-text-main text-xs outline-none focus:ring-1 focus:ring-primary/20 p-0.5 rounded transition-shadow"
                                    />
                                    {colIdx === row.length - 1 && (
                                      <button
                                        onClick={() => deleteTableRow(block.id, rowIdx)}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover/tr:flex bg-red-500 text-white p-0.5 rounded-full hover:bg-red-650 shadow z-10"
                                        title="Xóa dòng này"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* CORE ACTION SUBMISSION PANEL */}
      {blocks.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <button
            onClick={onAnalyze}
            disabled={isGenerating}
            className="w-full py-4 bg-primary hover:bg-primary-hover disabled:bg-surface-muted disabled:text-text-subtle disabled:opacity-75 text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] uppercase tracking-widest mt-4"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Đang phân tích chuyên sâu...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Phân tích cấu trúc & gợi ý bản vẽ
              </>
            )}
          </button>

          <div className="p-3 border border-border border-dashed rounded-xl bg-surface-soft flex items-center justify-center gap-2">
            <Upload className="w-4 h-4 text-text-subtle" />
            <span className="text-xs text-text-muted">
              Kéo thả tệp hoặc dán (HTML, Excel) để chèn bảng hoặc nội dung mới bên dưới
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
