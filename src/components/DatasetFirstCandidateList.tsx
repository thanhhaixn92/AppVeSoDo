import React, { useState } from 'react';
import { RankedVisualCandidate, SavedFigure } from '../types';
import { selectDatasetFirstGroups, splitAndSortRecommendations } from '../analysis/datasetCandidateSelectors';
import { DatasetCandidate, FigureRecommendation } from '../analysis/datasetModel';
import { CandidateThumbnail } from './CandidateThumbnail';
import { isCandidateUsable, isCandidatePreviewable, getCandidateUiStatus } from '../analysis/candidateModel';
import { getCandidateUserTitle, getCandidateDescriptionAndReason } from './candidateDisplayUtils';
import { Sparkles, Eye, AlertTriangle, PlusCircle, CheckCircle2, Terminal, Settings2, Database, ChevronDown, ChevronRight } from 'lucide-react';

interface DatasetFirstCandidateListProps {
  candidates: RankedVisualCandidate[];
  savedFigures: SavedFigure[];
  selectedCandidateUid: string | null;
  documentText: string;
  onPreview: (candidate: RankedVisualCandidate) => void;
  onApply: (candidate: RankedVisualCandidate) => void;
  onCliCommand: (prefix: string) => void;
  onOpenProperties: () => void;
}

function getDatasetSummaryBadges(dataset: DatasetCandidate): string[] {
  const badges: string[] = [];
  const table = dataset.data?.table;
  const chart = dataset.data?.chart;
  const diagram = dataset.data?.diagram;

  if (Array.isArray(table?.columns)) badges.push(`${table.columns.length} cột`);
  if (Array.isArray(table?.rows)) badges.push(`${table.rows.length} hàng`);
  if (Array.isArray(chart?.data)) badges.push(`${chart.data.length} điểm dữ liệu`);
  if (Array.isArray(diagram?.nodes)) badges.push(`${diagram.nodes.length} thực thể`);
  if (badges.length === 0 && Array.isArray(dataset.extractedItems)) {
    badges.push(`${dataset.extractedItems.length} mục trích xuất`);
  }

  return badges.length > 0 ? badges : ['Chưa có tóm tắt dữ liệu'];
}

function getRecommendationFigureType(rec: FigureRecommendation): string | undefined {
  return rec.typeOptions?.[0]?.figureType;
}

export function DatasetFirstCandidateList({
  candidates,
  savedFigures,
  selectedCandidateUid,
  documentText,
  onPreview,
  onApply,
  onCliCommand,
  onOpenProperties
}: DatasetFirstCandidateListProps) {
  const { groups, legacyCandidateByRecommendationId } = selectDatasetFirstGroups(candidates);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  if (groups.length === 0) {
    return null;
  }

  const renderCandidateCard = (rec: FigureRecommendation, legacyCand: RankedVisualCandidate, index: number, isUsable: boolean) => {
    const candUid = legacyCand.uid || legacyCand.id;
    const isSelected = selectedCandidateUid === candUid;
    const isApplied = savedFigures.some((f) => f.sourceCandidateUid === candUid);
    const status = getCandidateUiStatus(legacyCand);
    const needsReview = status === 'needs_review';
    const isRecommended = index === 0 && status === 'ready';
    const recommendationType = getRecommendationFigureType(rec);

    return (
      <div
        key={rec.id}
        onClick={() => isCandidatePreviewable(legacyCand) ? onPreview(legacyCand) : undefined}
        data-testid="candidate-card"
        className={`p-3 ${isUsable ? 'bg-surface' : 'bg-surface-soft opacity-80 cursor-default grayscale-[30%]'} border ${isUsable ? 'hover:border-primary/50 hover:shadow-lg cursor-pointer' : 'border-border/50'} rounded-xl flex flex-col gap-3 transition-all group relative ${
          isSelected && isUsable ? "ring-1 ring-primary border-primary shadow-md shadow-primary/10" : isUsable ? "border-border" : ""
        }`}
      >
        {isRecommended && (
          <div className="absolute -top-2.5 right-4 bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 border border-primary-hover">
            <Sparkles className="w-3 h-3" />
            KHUYÊN DÙNG
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <CandidateThumbnail candidate={legacyCand} isUsable={isUsable} />
          <div className="flex flex-col gap-1 w-full overflow-hidden">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                title={getCandidateUserTitle(legacyCand, documentText)}
                className={`text-[11px] font-bold leading-snug uppercase tracking-tight line-clamp-2 ${isUsable ? 'text-text-main group-hover:text-primary transition-colors' : 'text-text-muted'}`}
              >
                {rec.title || getCandidateUserTitle(legacyCand, documentText)}
              </span>
              {!isUsable && (
                <span className="px-1.5 py-0.5 bg-warning-soft text-warning-heavy text-[8px] font-bold rounded uppercase tracking-widest whitespace-nowrap border border-warning/20">
                  Cần ánh xạ
                </span>
              )}
              {isSelected && isUsable && (
                <span className="px-1.5 py-0.5 bg-primary-soft text-primary text-[8px] font-bold rounded uppercase tracking-widest whitespace-nowrap">
                  Đang xem
                </span>
              )}
            </div>
            <div className="flex flex-col gap-0.5 mt-0.5 mb-1.5">
              <span className={`text-[10px] font-medium ${isUsable ? 'text-text-main' : 'text-text-muted'}`}>{getCandidateDescriptionAndReason(legacyCand).description}</span>
              <span className={`text-[9px] italic opacity-90 ${isUsable ? 'text-text-muted' : 'text-text-subtle'}`}>{rec.rationale || getCandidateDescriptionAndReason(legacyCand).reason}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 ${isUsable ? 'text-text-muted' : 'text-text-subtle'}`}>
                {recommendationType === "diagram" ? (
                  <span className={`px-1.5 py-0.5 rounded ${isUsable ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>SƠ ĐỒ</span>
                ) : recommendationType === "chart" ? (
                  <span className={`px-1.5 py-0.5 rounded ${isUsable ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>BIỂU ĐỒ</span>
                ) : recommendationType === "table" ? (
                  <span className={`px-1.5 py-0.5 rounded ${isUsable ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>BẢNG DỮ LIỆU</span>
                ) : (
                  <span className={`px-1.5 py-0.5 rounded ${isUsable ? 'bg-slate-100 text-slate-500' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>CHƯA XÁC ĐỊNH</span>
                )}
              </span>
            </div>
          </div>
          {isUsable && (
            <div
              className={`shrink-0 p-2 rounded-lg transition-all ${isSelected ? "bg-primary text-white" : "bg-surface-soft text-text-subtle"}`}
              title="Xem trước"
            >
              <Eye className="w-4 h-4" />
            </div>
          )}
        </div>
        {!isUsable && legacyCand.validationError && (
          <div className="mt-1 bg-danger-soft/20 border border-danger/10 rounded-md p-2 flex items-start gap-2">
            <AlertTriangle className="w-3 h-3 text-danger/70 shrink-0 mt-0.5" />
            <span className="text-[9px] text-danger/80 font-medium leading-tight">
              {legacyCand.validationError.replace(/\[\w+\] /g, '')}
            </span>
          </div>
        )}
        {!isUsable && status === 'needs_mapping' && !legacyCand.validationError && (
          <div className="mt-1 bg-warning-soft/20 border border-warning/10 rounded-md p-2 flex items-start gap-2">
            <AlertTriangle className="w-3 h-3 text-warning-heavy/70 shrink-0 mt-0.5" />
            <span className="text-[9px] text-warning-heavy/80 font-medium leading-tight">
              Cần ánh xạ dữ liệu trước khi dùng mẫu này.
            </span>
          </div>
        )}
        {isUsable && (
          <div className="flex flex-col gap-2">
            {needsReview && !isApplied && (
              <div className="mt-1 mb-1 px-2 py-1.5 bg-warning-soft/30 border border-warning/20 rounded-md">
                <p className="text-[9px] text-warning-heavy font-medium">Bạn nên xem kỹ nội dung trước khi áp dụng.</p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                data-testid="apply-candidate-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onApply(legacyCand);
                }}
                disabled={isApplied}
                className={`flex-1 py-2 rounded-lg font-bold text-[10px] flex items-center justify-center gap-2 transition-all uppercase tracking-widest ${
                  isApplied
                    ? "bg-success text-white shadow-sm"
                    : "bg-primary text-white hover:bg-primary-hover shadow-sm"
                }`}
              >
                {isApplied ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <PlusCircle className="w-3.5 h-3.5" />
                )}
                {isApplied ? "Đã áp dụng" : "Dùng mẫu này"}
              </button>
              {isSelected && !isApplied && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCliCommand("Tinh chỉnh: ");
                  }}
                  className="px-3 py-2 rounded-lg border border-border text-text-main font-bold text-[10px] flex items-center justify-center gap-1 transition-all uppercase tracking-widest hover:bg-surface-soft shadow-sm"
                  title="Chỉnh sửa bằng lệnh AI"
                >
                  <Terminal className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {isApplied && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenProperties();
                  }}
                  className="px-2 py-2 rounded-lg border border-primary text-primary font-bold text-[9px] flex items-center justify-center gap-1 transition-all uppercase tracking-widest hover:bg-primary-soft"
                >
                  <Settings2 className="w-3 h-3" />
                  Thuộc tính
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCliCommand("Sửa bản vẽ này: ");
                  }}
                  className="px-2 py-2 rounded-lg border border-text-subtle text-text-subtle font-bold text-[9px] flex items-center justify-center gap-1 transition-all uppercase tracking-widest hover:bg-surface-soft"
                >
                  <Terminal className="w-3 h-3" />
                  Lệnh AI
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="mb-2 px-1">
        <h3 className="text-[13px] font-bold text-text-main uppercase tracking-widest flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          Nhóm Dữ liệu & Gợi ý Bản vẽ
        </h3>
        <p className="text-[11px] text-text-muted mt-1">Các dữ liệu được phân tích từ tài liệu của bạn và các tùy chọn biểu diễn tương ứng.</p>
      </div>

      {groups.map((group) => {
        const dataset = group.datasetCandidate;
        const selection = dataset.datasetSelection;
        const summaryBadges = getDatasetSummaryBadges(dataset);

        const { usableRecs, invalidRecs } = splitAndSortRecommendations(group.recommendations, legacyCandidateByRecommendationId);

        const isExpanded = expandedGroups[dataset.id] ?? (usableRecs.length === 0);

        return (
          <div key={dataset.id} className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row items-stretch">
            {/* Dataset Header */}
            <div className="p-4 border-b md:border-b-0 md:border-r border-border bg-surface-soft md:w-1/3 lg:w-1/4 shrink-0 flex flex-col">
              <h4 className="text-[12px] font-bold text-text-main flex items-center gap-2">
                {selection?.sourceSectionHeading || "Dữ liệu được trích xuất"}
              </h4>
              <p className="text-[11px] text-text-muted mt-1 italic line-clamp-3">
                {selection?.sourceExcerpt || selection?.sourceText || "Không có trích đoạn nguồn"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-text-subtle font-medium">
                {summaryBadges.map((badge) => (
                  <span key={badge} className="bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
                    {badge}
                  </span>
                ))}
              </div>
              
              {/* Compact Dataset Preview */}
              {dataset.data?.table?.rows && dataset.data.table.rows.length > 0 && (
                <div className="mt-4 bg-white border border-border rounded overflow-hidden shadow-inner max-h-40 overflow-y-auto w-full">
                  <table className="w-full text-[10px] text-left">
                    <thead className="bg-surface-soft sticky top-0 z-10 shadow-sm">
                      <tr>
                        {dataset.data.table.columns.map((col: any) => (
                          <th key={col.key} className="p-1.5 border-b border-border font-semibold text-text-main whitespace-nowrap">
                            {col.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataset.data.table.rows.slice(0, 3).map((row: any, i: number) => (
                        <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-slate-50">
                          {dataset.data!.table!.columns.map((col: any) => (
                            <td key={col.key} className="p-1.5 text-text-muted truncate max-w-[120px]">
                              {row[col.key]}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {dataset.data.table.rows.length > 3 && (
                        <tr>
                          <td colSpan={dataset.data.table.columns.length} className="p-1.5 text-center text-text-subtle italic bg-slate-50">
                            + {dataset.data.table.rows.length - 3} hàng khác
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recommendations Grid */}
            <div className="p-4 flex-1 bg-white flex flex-col gap-5">
              {usableRecs.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {usableRecs.map((rec, index) => renderCandidateCard(rec, legacyCandidateByRecommendationId[rec.id], index, true))}
                </div>
              )}

              {invalidRecs.length > 0 && (
                <div className="flex flex-col gap-3">
                  {usableRecs.length > 0 && <div className="h-px bg-border/50 w-full" />}
                  <button 
                    onClick={() => toggleGroup(dataset.id)}
                    className="flex items-center gap-2 text-text-muted hover:text-text-main text-[11px] font-bold uppercase tracking-widest transition-colors w-fit px-1 py-0.5 rounded"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-warning-heavy" />
                      {invalidRecs.length} đề xuất cần ánh xạ dữ liệu
                    </span>
                  </button>

                  {isExpanded && (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                       {invalidRecs.map((rec, index) => renderCandidateCard(rec, legacyCandidateByRecommendationId[rec.id], index + usableRecs.length, false))}
                     </div>
                  )}
                </div>
              )}

              {usableRecs.length === 0 && invalidRecs.length === 0 && (
                <div className="text-[11px] text-text-muted italic flex items-center justify-center h-full min-h-[100px]">
                  Không có đề xuất nào cho dữ liệu này.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
