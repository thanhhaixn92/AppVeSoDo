
import React from 'react';
import { 
  X, Download, FileImage, FileText, Code, CheckCircle2, AlertCircle, Info, Hash 
} from 'lucide-react';
import { SavedFigure, PreviewFigure } from '../types';
import { runExportAudit } from '../academicArchitecture';
import { getExportSupport } from '../lib/workflowUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  figure: SavedFigure | PreviewFigure;
  currentTab: 'png' | 'svg' | 'pdf' | 'tikz';
  setCurrentTab: (tab: 'png' | 'svg' | 'pdf' | 'tikz') => void;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onExportPDF: () => void;
  onCopyTikZ: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  figure,
  currentTab,
  setCurrentTab,
  onExportPNG,
  onExportSVG,
  onExportPDF,
  onCopyTikZ
}) => {
  if (!isOpen) return null;

  const audit = runExportAudit(currentTab, figure);
  const isHighRisk = audit.risks.some((r: any) => r.severity === 'high');

  const pngSupport = getExportSupport(figure, 'png');
  const svgSupport = getExportSupport(figure, 'svg');
  const pdfSupport = getExportSupport(figure, 'pdf');
  const tikzSupport = getExportSupport(figure, 'tikz');

  return (
    <div className="fixed inset-0 bg-header-bg/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-3xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col border border-border">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-soft/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-main uppercase tracking-tight">Xuất bản hình vẽ học thuật</h3>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest leading-none mt-1">Tiêu chuẩn APA/VMS v2.0</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-muted rounded-full text-text-subtle transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-[400px]">
          {/* Sidebar Tabs */}
          <div className="w-48 bg-surface-soft border-r border-border flex flex-col p-2 gap-1">
            {[
              { id: 'png', label: 'Ảnh PNG', icon: FileImage },
              { id: 'svg', label: 'Vector SVG', icon: Code },
              { id: 'pdf', label: 'Tài liệu PDF', icon: FileText },
              { id: 'tikz', label: 'Mã TikZ/LaTeX', icon: Hash },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-2 ${
                  currentTab === tab.id 
                    ? 'bg-surface text-primary shadow-sm ring-1 ring-border' 
                    : 'text-text-subtle hover:text-text-muted hover:bg-surface/50'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
            
            <div className="mt-auto p-4 text-[9px] text-text-subtle font-bold uppercase tracking-widest leading-relaxed">
              Hỗ trợ dữ liệu văn bản, bảng số liệu và quy trình mô phỏng.
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-8 bg-surface flex flex-col">
            {/* Validation Banner */}
            {!audit.passed ? (
              <div className="mb-6 p-4 bg-danger-soft border border-danger/20 rounded-xl flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-danger shrink-0" />
                <div className="space-y-1">
                  <h5 className="text-[11px] font-bold text-danger uppercase tracking-tight">Không thể xuất hình</h5>
                  <p className="text-[10px] text-danger/80 font-medium leading-relaxed">
                    {audit.warnings[0] || "Hình ảnh thiếu dữ liệu hiển thị hoặc không đạt chuẩn tối thiểu."}
                  </p>
                </div>
              </div>
            ) : audit.risks.length > 0 ? (
              <div className="mb-6 p-4 bg-warning-soft border border-warning/20 rounded-xl flex gap-3 items-start">
                <Info className="w-5 h-5 text-warning shrink-0" />
                <div className="space-y-1">
                  <h5 className="text-[11px] font-bold text-warning uppercase tracking-tight">Khuyến nghị hiệu chỉnh</h5>
                  <div className="space-y-1">
                    {audit.risks.map((r: any, i: number) => (
                      <p key={i} className="text-[9px] text-warning/80 font-medium leading-tight">• {r.risk}</p>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-success-soft border border-success/20 rounded-xl flex gap-3 items-center">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                <div className="space-y-0.5">
                  <h5 className="text-[11px] font-bold text-success uppercase tracking-tight">Sẵn sàng xuất bản</h5>
                  <p className="text-[9px] text-success/80 font-medium tracking-wide leading-tight">Đã vượt qua các bài kiểm tra rủi ro graphic cơ bản.</p>
                </div>
              </div>
            )}

            {/* Format Specific UI */}
            <div className="flex-1 flex flex-col">
              {currentTab === 'png' && (
                <div className="flex flex-col h-full items-center text-center gap-6 py-4">
                  <div className="w-16 h-16 bg-surface-soft border border-border rounded-2xl flex items-center justify-center">
                    <FileImage className="w-8 h-8 text-text-subtle" />
                  </div>
                  <div>
                    <h4 className="font-bold text-text-main text-sm uppercase tracking-tight mb-1">Ảnh PNG học thuật</h4>
                    <p className="text-[10px] text-text-muted max-w-xs font-medium">Xuất ảnh raster độ phân giải 300 DPI, phù hợp để chèn nhanh vào báo cáo.</p>
                    {!pngSupport.supported && (
                      <p className="text-[9px] text-danger font-bold mt-2 uppercase tracking-tight">⚠️ {pngSupport.reason}</p>
                    )}
                  </div>
                  <button 
                    disabled={!audit.passed || !pngSupport.supported}
                    onClick={onExportPNG} 
                    className="mt-auto w-full py-3 bg-primary hover:bg-primary-hover disabled:bg-surface-muted disabled:text-text-subtle text-white font-bold text-xs rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> {pngSupport.supported ? 'Tải PNG (High Res)' : 'PNG Không khả dụng'}
                  </button>
                </div>
              )}

              {currentTab === 'svg' && (
                <div className="flex flex-col h-full items-center text-center gap-6 py-4">
                  <div className="w-16 h-16 bg-primary-soft border border-primary/20 rounded-2xl flex items-center justify-center">
                    <Code className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-text-main text-sm uppercase tracking-tight mb-1">Đồ họa Vector SVG</h4>
                    <p className="text-[10px] text-text-muted max-w-xs font-medium">Định dạng vector nguyên bản, không vỡ nét khi phóng to. Tối ưu cho trình bày slide và in ấn khổ lớn.</p>
                    {!svgSupport.supported && (
                      <p className="text-[9px] text-danger font-bold mt-2 uppercase tracking-tight">⚠️ {svgSupport.reason}</p>
                    )}
                  </div>
                  <button 
                    disabled={!audit.passed || !svgSupport.supported}
                    onClick={onExportSVG} 
                    className="mt-auto w-full py-3 bg-primary hover:bg-primary-hover disabled:bg-surface-muted disabled:text-text-subtle text-white font-bold text-xs rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> {svgSupport.supported ? 'Tải SVG (Vector)' : 'SVG Không khả dụng'}
                  </button>
                </div>
              )}

              {currentTab === 'pdf' && (
                <div className="flex flex-col h-full items-center text-center gap-6 py-4">
                  <div className="w-16 h-16 bg-danger-soft border border-danger/20 rounded-2xl flex items-center justify-center">
                    <FileText className="w-8 h-8 text-danger" />
                  </div>
                  <div>
                    <h4 className="font-bold text-text-main text-sm uppercase tracking-tight mb-1">Lưu hoặc In PDF</h4>
                    <p className="text-[10px] text-text-muted max-w-xs font-medium">Sử dụng tính năng in của trình duyệt để lưu hình ảnh dưới dạng trang PDF độc lập.</p>
                    {!pdfSupport.supported && (
                      <p className="text-[9px] text-danger font-bold mt-2 uppercase tracking-tight">⚠️ {pdfSupport.reason}</p>
                    )}
                  </div>
                  <button 
                    disabled={!audit.passed || !pdfSupport.supported}
                    onClick={onExportPDF} 
                    className="mt-auto w-full py-3 bg-primary hover:bg-primary-hover disabled:bg-surface-muted disabled:text-text-subtle text-white font-bold text-xs rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> {pdfSupport.supported ? 'In/Lưu PDF qua trình duyệt' : 'PDF Không khả dụng'}
                  </button>
                </div>
              )}

              {currentTab === 'tikz' && (
                <div className="flex flex-col h-full items-center text-center gap-6 py-4">
                  <div className="w-16 h-16 bg-header-bg rounded-2xl flex items-center justify-center">
                    <Hash className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-text-main text-sm uppercase tracking-tight mb-1">Mã nguồn TikZ/LaTeX</h4>
                    <p className="text-[10px] text-text-muted max-w-xs font-medium">Sao chép mã nguồn TikZ (Diagram/Chart) hoặc Tabular (Table) chuẩn Academic để chèn trực tiếp vào LaTeX.</p>
                    {!tikzSupport.supported && (
                      <p className="text-[9px] text-danger font-bold mt-2 uppercase tracking-tight">⚠️ {tikzSupport.reason}</p>
                    )}
                  </div>
                  <button 
                    disabled={!audit.passed || !tikzSupport.supported}
                    onClick={onCopyTikZ} 
                    className="mt-auto w-full py-3 bg-header-bg hover:bg-black disabled:bg-surface-muted disabled:text-text-subtle text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest cursor-pointer"
                  >
                    <Hash className="w-4 h-4" /> {tikzSupport.supported ? 'Sao chép mã LaTeX' : 'LaTeX Không khả dụng'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
