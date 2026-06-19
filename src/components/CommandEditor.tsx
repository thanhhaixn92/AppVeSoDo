import React, { useRef, useEffect } from 'react';
import { Wand2, ChevronRight, X, Bot, User, AlertCircle, Info, Sparkles, Terminal, Lock, Check } from 'lucide-react';
import { WorkflowState, ReconciledCommandResult } from '../types';

interface CommandEditorProps {
  workflowState: WorkflowState;
  commandInput: string;
  setCommandInput: (val: string) => void;
  executeCommand: (cmd: string) => void;
  commandInputRef: React.RefObject<any>;
  chatLogs: { 
    id: string; 
    type: 'command' | 'rule' | 'ai' | 'error' | 'clarification' | 'onboarding'; 
    text: string; 
    options?: { label: string; command: string }[]; 
    showKeyInput?: boolean 
  }[];
  isCliConsoleOpen: boolean;
  setIsCliConsoleOpen: (open: boolean) => void;
  pendingProposal?: ReconciledCommandResult | null;
  onApplyProposal?: () => void;
  onCancelProposal?: () => void;
  fullHeight?: boolean;
  hasEditableContext: boolean;
}

export const CommandEditor: React.FC<CommandEditorProps> = ({
  workflowState,
  commandInput,
  setCommandInput,
  executeCommand,
  commandInputRef,
  chatLogs,
  isCliConsoleOpen,
  setIsCliConsoleOpen,
  pendingProposal,
  onApplyProposal,
  onCancelProposal,
  fullHeight,
  hasEditableContext
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isCommandActive = hasEditableContext && workflowState !== 'ANALYZING'; 

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatLogs, isCliConsoleOpen, pendingProposal]);

  if (!isCliConsoleOpen) return null;

  return (
    <div className={fullHeight ? "flex flex-col h-full w-full bg-surface" : "fixed right-6 bottom-20 z-100 flex flex-col gap-3 w-full max-w-[400px] transition-all duration-500 animate-in slide-in-from-bottom-10 fade-in"}>
      {/* Console Header */}
      <div className={fullHeight ? "flex-1 flex flex-col min-h-0 bg-surface" : "bg-surface/90 backdrop-blur-xl border border-border rounded-3xl shadow-xl flex flex-col overflow-hidden"}>
        <div className={fullHeight ? "px-5 py-3 border-b border-border flex items-center justify-between bg-surface shrink-0" : "px-5 py-3 border-b border-border flex items-center justify-between bg-surface-soft/50"}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-md shadow-primary/20">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-text-main uppercase tracking-tight">Trợ lý Hoa Tiêu MB</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-success rounded-full shadow-[0_0_8px_rgba(5,150,105,0.4)]"></div>
                <span className="text-[8px] text-text-muted font-bold uppercase tracking-widest leading-none">Hệ thống sẵn sàng</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsCliConsoleOpen(false)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-text-subtle transition-all active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Thread */}
        <div 
          ref={scrollRef}
          className={`${fullHeight ? 'flex-1' : 'h-[320px]'} overflow-y-auto p-5 flex flex-col gap-4 bg-surface-soft/20 custom-scrollbar`}
        >
          {chatLogs.map((log) => (
            <div 
              key={log.id} 
              className={`flex flex-col gap-2 ${log.type === 'command' ? 'items-end' : 'items-start'}`}
            >
              <div className={`flex gap-3 max-w-[90%] ${log.type === 'command' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border ${
                  log.type === 'command' 
                    ? 'bg-header-bg text-white border-header-border' 
                    : log.type === 'ai' 
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : log.type === 'error'
                        ? 'bg-danger-soft text-danger border-danger-soft'
                        : 'bg-white text-text-muted border-border'
                }`}>
                  {log.type === 'command' ? <User className="w-3.5 h-3.5" /> : 
                   log.type === 'ai' ? <Bot className="w-3.5 h-3.5" /> :
                   log.type === 'error' ? <AlertCircle className="w-3.5 h-3.5" /> :
                   <Info className="w-3.5 h-3.5" />}
                </div>
                
                <div className={`p-3 rounded-2xl text-[11px] font-medium leading-relaxed border ${
                  log.type === 'command'
                    ? 'bg-white border-border text-text-main rounded-tr-none'
                    : log.type === 'error'
                      ? 'bg-danger-soft/30 border-danger-soft text-danger'
                      : 'bg-white border-slate-100 text-text-main rounded-tl-none shadow-sm'
                }`}>
                  {log.text.split('\n').map((line, i) => {
                    // Safe basic inline markdown renderer for bold
                    const renderInline = (text: string) => {
                      const parts = text.split(/(\*\*.*?\*\*)/g);
                      return parts.map((part, index) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={index} className="font-extrabold">{part.slice(2, -2)}</strong>;
                        }
                        return part;
                      });
                    };

                    return (
                      <p key={i} className={i > 0 ? "mt-1.5" : ""}>
                        {renderInline(line)}
                      </p>
                    );
                  })}

                  {log.options && log.options.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {log.options.map((opt) => (
                        <button
                          key={opt.command}
                          onClick={() => executeCommand(opt.command)}
                          className="px-2.5 py-1.5 bg-primary-soft border border-primary/10 text-primary rounded-lg text-[9px] font-black uppercase tracking-wide hover:bg-primary hover:text-white transition-all active:scale-95"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Pending Proposal UI */}
          {pendingProposal && (
            <div className="flex flex-col gap-2 items-start mt-2 border-l-2 border-warning pl-3">
              <div className="p-3 bg-warning-soft/20 border border-warning/30 rounded-2xl w-full">
                <p className="text-[11px] font-bold text-warning-dark mb-1 flex items-center gap-1">
                  <Wand2 className="w-3.5 h-3.5" />
                  Đề xuất đang chờ duyệt [{pendingProposal.source.toUpperCase()}]
                </p>
                <div className="text-[10px] text-text-main mb-3 space-y-1">
                  {pendingProposal.operations.map((op, idx) => (
                    <div key={idx} className="flex gap-1.5">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{op.summary}</span>
                    </div>
                  ))}
                  {pendingProposal.warnings?.map((w, idx) => (
                    <div key={'w'+idx} className="text-warning font-semibold flex gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /> {w}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={onApplyProposal}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-success hover:bg-success-hover text-white rounded-lg text-[10px] font-black uppercase tracking-wide transition-all active:scale-95 shadow-md shadow-success/20"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Áp dụng
                  </button>
                  <button 
                    onClick={onCancelProposal}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-surface hover:bg-surface-soft text-text-main border border-border rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all active:scale-95"
                  >
                    <X className="w-3.5 h-3.5" />
                    Hủy bỏ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-surface border-t border-border mt-auto">
          {!hasEditableContext && (
            <div className="flex items-center gap-2 px-3 py-2 bg-warning-soft/10 border border-warning/10 rounded-2xl mb-3 text-warning">
              <Lock className="w-4 h-4 text-warning shrink-0" />
              <p className="text-[10px] text-warning font-semibold">
                Khuyên dùng: Chọn hoặc dán dữ liệu hình ảnh/bảng để trợ lý hỗ trợ tốt nhất.
              </p>
            </div>
          )}
          
          <div className="flex items-start gap-2 p-1.5 bg-surface-soft border border-border rounded-2xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
            <div className="p-2 text-primary bg-surface shadow-sm border border-border rounded-xl mt-0.5 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <textarea 
              ref={commandInputRef as React.RefObject<HTMLTextAreaElement>}
              rows={1}
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const trimmed = commandInput.trim();
                  if (trimmed && !pendingProposal) {
                    executeCommand(trimmed);
                  }
                }
              }}
              disabled={!!pendingProposal}
              placeholder={pendingProposal ? "Vui lòng xử lý đề xuất trước..." : "Nhập yêu cầu hiệu chỉnh..."}
              className="flex-1 bg-transparent border-none text-text-main text-xs py-2 px-1 outline-none placeholder:text-text-subtle font-semibold disabled:opacity-50 resize-none min-h-[36px] max-h-[125px] custom-scrollbar leading-normal"
            />
            <button 
              onClick={() => {
                const trimmed = commandInput.trim();
                if (trimmed && !pendingProposal) {
                  executeCommand(trimmed);
                }
              }}
              disabled={!!pendingProposal || !commandInput.trim()}
              className="p-2 bg-primary hover:bg-primary-hover text-white rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100 mt-1 shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between px-1">
             <span className="text-[9px] text-text-subtle font-black uppercase tracking-widest flex items-center gap-1.5">
               <Wand2 className="w-3 h-3" /> Trợ lý chỉnh sửa sẵn sàng
             </span>
             <span className="text-[8px] text-text-subtle font-bold italic opacity-60">Enter để gửi, Shift+Enter xuống dòng</span>
          </div>
        </div>
      </div>
    </div>
  );
};
