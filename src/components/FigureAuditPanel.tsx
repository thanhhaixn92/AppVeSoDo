import React from 'react';
import { 
  X, Check, AlertTriangle, Printer, FileText, Download, Award, Zap, ShieldCheck, HelpCircle
} from 'lucide-react';
import { SavedFigure, PreviewFigure } from '../types';
import { 
  runExportAudit 
} from '../academicArchitecture';
import { useFigureQuality } from '../hooks/useFigureQuality';

interface FigureAuditPanelProps {
  currentFigure: SavedFigure | PreviewFigure | null;
  currentFigureId: string | null;
  onAlignNodes: () => void;
  onSuperOptimize: () => void;
  onChangeTheme: (theme: any) => void;
  setExportModalState: (state: { isOpen: boolean; tab: 'png' | 'svg' | 'pdf' | 'tikz' }) => void;
  showToast: (msg: string) => void;
  onClose: () => void;
}

export const FigureAuditPanel: React.FC<FigureAuditPanelProps> = ({
  currentFigure,
  currentFigureId,
  onAlignNodes,
  onSuperOptimize,
  onChangeTheme,
  setExportModalState,
  showToast,
  onClose,
}) => {
  const qualityModel = useFigureQuality(currentFigure);

  if (qualityModel.status === 'empty' || !currentFigure) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-subtle gap-3">
        <HelpCircle className="w-10 h-10 opacity-20" />
        <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Chọn một bản vẽ để kiểm định chất lượng học thuật</p>
      </div>
    );
  }

  if (qualityModel.status === 'invalid') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-subtle gap-3">
        <AlertTriangle className="w-10 h-10 text-danger opacity-80" />
        <p className="text-xs font-bold text-danger uppercase tracking-widest leading-relaxed">Dữ liệu chưa sẵn sàng / Không hợp lệ</p>
        <p className="text-[10px] text-text-muted mt-2 text-center leading-relaxed">{qualityModel.renderableValidation.error}</p>
      </div>
    );
  }

  // 1. Gather all statistics & indicators
  const quality = qualityModel.quality!;
  const a4 = qualityModel.a4!;
  const exportFormat = currentFigure.type === 'diagram' ? 'svg' : 'png';
  const exportCheck = runExportAudit(exportFormat, currentFigure as SavedFigure);

  // Localization translator helpers
  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'ready':
      case 'production_ready':
        return 'Sẵn sàng (Ready)';
      case 'usable':
        return 'Có thể dùng (Usable)';
      case 'needs_revision':
        return 'Cần hiệu chỉnh (Needs Revision)';
      case 'not_ready':
      default:
        return 'Chưa sẵn sàng (Not Ready)';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ready':
      case 'production_ready':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'usable':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'needs_revision':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'not_ready':
      default:
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  const figureTheme = (currentFigure as SavedFigure).theme || '';
  const isGrayscale = figureTheme.endsWith('_bw') || figureTheme === 'classic_academic';

  return (
    <div className="w-full h-full bg-surface flex flex-col font-sans relative z-40 overflow-hidden">
      {/* Header section */}
      <div className="h-12 border-b border-header-border flex items-center justify-between px-4 shrink-0 bg-header-bg">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-white uppercase tracking-widest">
            Kiểm tra chất lượng hình
          </span>
        </div>
        <button 
          onClick={onClose} 
          className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Panel Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        
        {/* SECTION 1: OVERALL QUALITY SCORE */}
        <div className="bg-surface-soft border border-border rounded-xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted">
              Điểm chất lượng
            </span>
            <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${getLevelColor(quality.level)}`}>
              {getLevelLabel(quality.level)}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="var(--border)" strokeWidth="6" fill="transparent" />
                <circle cx="32" cy="32" r="28" stroke={quality.score >= 85 ? 'var(--success)' : quality.score >= 60 ? 'var(--warning)' : 'var(--danger)'} strokeWidth="6" fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - quality.score / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-sm font-bold text-text-main leading-none">{quality.score}</span>
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <p className="text-[10px] text-text-muted font-medium leading-relaxed">
                Hệ thống đánh giá dựa trên tiêu chuẩn trực quan học thuật: bố cục, tương phản và nhãn.
              </p>
              <button 
                onClick={onSuperOptimize}
                className="flex items-center gap-1.5 text-primary hover:text-primary-hover text-[10px] font-bold uppercase tracking-widest transition-colors"
              >
                <Zap className="w-3 h-3" /> Tự động tối ưu hình
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: CHECKLIST */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase font-mono font-bold text-text-subtle tracking-wider flex items-center justify-between px-1">
            <span>Chi tiết kiểm định</span>
            <span>{quality.checks.filter(c => c.passed).length}/{quality.checks.length} Pass</span>
          </div>
          <div className="space-y-1.5">
            {quality.checks.map((check) => (
              <div 
                key={check.id} 
                className={`p-2.5 rounded-lg border transition-all text-xs flex gap-2.5 items-start ${
                  check.passed 
                    ? 'bg-success-soft/50 border-success/20 text-text-main' 
                    : check.severity === 'high'
                      ? 'bg-danger-soft border-danger/20 text-text-main'
                      : 'bg-warning-soft border-warning/20 text-text-main'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {check.passed ? (
                    <Check className="w-3.5 h-3.5 text-success font-bold" />
                  ) : check.severity === 'high' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-danger font-bold" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                  )}
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10.5px] leading-tight text-text-main">
                      {check.label}
                    </span>
                  </div>
                  {!check.passed && (
                    <p className="text-[10px] leading-relaxed text-text-muted font-medium italic mt-1">
                      {check.message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: A4 COMPLIANCE SPECIFICS */}
        <div className="bg-surface-soft border border-border rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-text-main">
            <Printer className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-widest">Thẩm định in khổ A4</h4>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-surface p-2 rounded-lg border border-border">
              <span className="text-[9px] font-bold text-text-subtle block uppercase">Độ lọt vùng in</span>
              <span className={`text-xs font-bold ${a4.passed ? 'text-success' : 'text-danger'}`}>
                {a4.printableAreaFit}% (Khớp)
              </span>
            </div>
            <div className="bg-surface p-2 rounded-lg border border-border">
              <span className="text-[9px] font-bold text-text-subtle block uppercase">Hướng trang lý thuyết</span>
              <span className="text-xs font-bold text-text-main capitalize">
                {a4.orientation === 'portrait' ? 'Khổ dọc (Portrait)' : 'Khổ ngang (Landscape)'}
              </span>
            </div>
          </div>

          <div className="text-[10.5px] space-y-1.5 font-medium text-text-muted pt-1">
            <div className="flex items-center justify-between">
              <span>Đạt chuẩn chú thích (Caption):</span>
              <span className="font-bold text-text-main">{a4.captionFit ? '🔷 Có / Hợp lệ' : '⚠️ Thiếu / Trống'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Nguồn gốc rõ ràng (Source):</span>
              <span className="font-bold text-text-main">{a4.sourceFit ? '🔷 Đúng quy cách' : '⚠️ Thiếu nguồn'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>In đen trắng sắc nét:</span>
              <span className="font-bold text-text-main">{isGrayscale ? '🔷 An toàn (B&W)' : '💡 Đang có màu'}</span>
            </div>
          </div>

          {a4.warnings.length > 0 && (
            <div className="p-2 bg-warning-soft border border-warning/20 rounded-lg text-[9.5px] leading-relaxed text-warning font-medium space-y-1">
              <div className="font-bold uppercase tracking-wider">Cảnh báo lọt vùng A4:</div>
              {a4.warnings.map((w: string, i: number) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          )}
        </div>

          {/* SECTION 4: EXPORT QUALITY AUDIT */}
        <div className="bg-surface-soft border border-border rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-text-main">
            <FileText className="w-4 h-4 text-success" />
            <h4 className="text-xs font-bold uppercase tracking-widest">Thẩm định vector/image</h4>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-muted font-semibold">Tương thích xuất file:</span>
              <span className={`font-bold ${exportCheck.passed ? 'text-success' : 'text-warning'}`}>
                {exportCheck.passed ? 'Đạt chuẩn' : 'Cần sửa'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-muted font-semibold">Định dạng khuyên xuất:</span>
              <span className="font-mono text-[10px] font-bold text-primary uppercase">
                {exportFormat} (Vector)
              </span>
            </div>
          </div>

          {exportCheck.risks.length > 0 && (
            <div className="p-2 bg-primary-soft/50 border border-primary/20 rounded-lg text-[9.5px] leading-relaxed text-primary font-medium space-y-0.5">
              {exportCheck.risks.map((r: any, j: number) => (
                <div key={j}>• {r.risk}</div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 5: INTERACTIVE ACTIONS */}
        <div className="space-y-2 pt-2">
          <div className="text-[10px] uppercase font-mono font-bold text-text-subtle tracking-wider">
            Công cụ hỗ trợ
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button 
              type="button"
              onClick={() => {
                onAlignNodes();
                showToast("Đã căn chỉnh lưới hình học!");
              }}
              className="px-2.5 py-1.5 bg-surface border border-border hover:border-primary hover:bg-surface-soft rounded-lg text-[11px] font-bold text-text-main hover:text-primary transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Zap className="w-3 h-3 text-primary" />
              Căn lề chuẩn
            </button>

            {!isGrayscale && (
              <button
                type="button"
                onClick={() => {
                  onChangeTheme('classic_academic_bw');
                  showToast("Đã chuyển sang chế độ đen trắng.");
                }}
                className="px-2.5 py-1.5 bg-surface border border-border hover:border-text-main rounded-lg text-[11px] font-bold text-text-main transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Printer className="w-3 h-3 text-text-muted" />
                In đen trắng
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Footer sticky area: Export triggering Button */}
      <div className="p-4 border-t border-border shrink-0 bg-surface-soft flex flex-col gap-2">
        <button
          onClick={() => setExportModalState({ isOpen: true, tab: 'png' })}
          className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl shadow-md text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Tiến hành xuất bản (Export)
        </button>
      </div>

    </div>
  );
};
