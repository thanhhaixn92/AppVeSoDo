import React from 'react';
import { VisualCandidate, RankedVisualCandidate } from '../types';
import { BarChart3, LineChart, PieChart, Table as TableIcon, GitCommit, LayoutTemplate, AlertCircle } from 'lucide-react';

export type CandidateThumbnailKind = 'bar' | 'line' | 'pie' | 'table' | 'diagram' | 'visual' | 'unavailable';

export function getCandidateThumbnailKind(candidate: VisualCandidate | RankedVisualCandidate, isUsable: boolean): CandidateThumbnailKind {
  if (!isUsable) return 'unavailable';
  
  if (candidate.data?.table) return 'table';
  if (candidate.data?.diagram) return 'diagram';
  if (candidate.data?.chart) {
    const type = candidate.data.chart.config?.type;
    if (type === 'line' || type === 'area') return 'line';
    if (type === 'pie') return 'pie';
    return 'bar'; // default chart
  }
  
  // Fallback checking types/titles if missing payloads
  const typeStr = String(candidate.visualType || '').toLowerCase();
  const titleStr = String(candidate.title || '').toLowerCase();
  if (typeStr.includes('table') || titleStr.includes('bảng')) return 'table';
  if (typeStr.includes('line') || titleStr.includes('xu hướng') || titleStr.includes('đường')) return 'line';
  if (typeStr.includes('pie') || titleStr.includes('cơ cấu') || titleStr.includes('tròn')) return 'pie';
  if (typeStr.includes('bar') || typeStr.includes('column') || titleStr.includes('cột')) return 'bar';
  if (typeStr.includes('diagram') || titleStr.includes('sơ đồ')) return 'diagram';
  
  return 'visual';
}

interface CandidateThumbnailProps {
  candidate: VisualCandidate | RankedVisualCandidate;
  isUsable: boolean;
}

export function CandidateThumbnail({ candidate, isUsable }: CandidateThumbnailProps) {
  const kind = getCandidateThumbnailKind(candidate, isUsable);
  
  const getIconAndStyle = () => {
    switch (kind) {
      case 'bar':
        return {
          icon: <BarChart3 className="w-5 h-5 stroke-[1.5]" />,
          bg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
          title: 'Minh họa biểu đồ cột'
        };
      case 'line':
        return {
          icon: <LineChart className="w-5 h-5 stroke-[1.5]" />,
          bg: 'bg-blue-50 text-blue-600 border border-blue-100',
          title: 'Minh họa biểu đồ xu hướng'
        };
      case 'pie':
        return {
          icon: <PieChart className="w-5 h-5 stroke-[1.5]" />,
          bg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
          title: 'Minh họa biểu đồ cơ cấu'
        };
      case 'table':
        return {
          icon: <TableIcon className="w-5 h-5 stroke-[1.5]" />,
          bg: 'bg-slate-50 text-slate-600 border border-slate-200',
          title: 'Minh họa bảng dữ liệu'
        };
      case 'diagram':
        return {
          icon: <GitCommit className="w-5 h-5 stroke-[1.5]" />,
          bg: 'bg-violet-50 text-violet-600 border border-violet-100',
          title: 'Minh họa sơ đồ'
        };
      case 'unavailable':
        return {
          icon: <AlertCircle className="w-5 h-5 stroke-[1.5]" />,
          bg: 'bg-surface-muted text-text-muted opacity-60 border border-border',
          title: 'Chưa thể tạo'
        };
      case 'visual':
      default:
        return {
          icon: <LayoutTemplate className="w-5 h-5 stroke-[1.5]" />,
          bg: 'bg-slate-50 text-slate-500 border border-slate-200',
          title: 'Minh họa trực quan'
        };
    }
  };

  const { icon, bg, title } = getIconAndStyle();

  return (
    <div 
      className={`shrink-0 w-11 h-11 rounded-lg flex items-center justify-center ${bg}`}
      title={title}
      aria-label={title}
    >
      {icon}
    </div>
  );
}
