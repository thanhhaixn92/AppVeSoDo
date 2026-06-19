import { SavedFigure } from '../types';

export interface ResolvedFigureExportMetadata {
  captionText: string;
  numberedCaption?: string;
  sourceCitation?: string;
  isPreview: boolean;
}

export function resolveFigureExportMetadata(args: {
  figure: SavedFigure | any;
  numberingEntry?: { label: string; ordinal: number };
  isPreview?: boolean;
}): ResolvedFigureExportMetadata {
  const { figure, numberingEntry, isPreview = false } = args;
  const captionText = getFigureCaptionText(figure);
  const cleanCaption = stripLegacyCaptionPrefix(captionText);
  let numberedCaption: string | undefined = undefined;

  if (!isPreview && numberingEntry) {
    numberedCaption = `${numberingEntry.label} ${numberingEntry.ordinal}. ${cleanCaption}`;
  } else if (!isPreview && !numberingEntry) {
     const label = getFigureCaptionLabel(getFigureCaptionKind(figure));
     numberedCaption = `${label}. ${cleanCaption}`;
  }

  const sourceCitation = getFigureSourceCitation(figure);

  return {
    captionText: cleanCaption,
    numberedCaption,
    sourceCitation,
    isPreview
  };
}
export function getFigureCaptionKind(figureOrType: any): 'chart' | 'table' | 'diagram' {
  if (typeof figureOrType === 'string') {
    return figureOrType as 'chart' | 'table' | 'diagram';
  }
  return figureOrType?.type || figureOrType?.figureType || 'diagram';
}

export function getFigureCaptionLabel(kind: 'chart' | 'table' | 'diagram'): 'Biểu đồ' | 'Bảng' | 'Hình' {
  switch (kind) {
    case 'chart':
      return 'Biểu đồ';
    case 'table':
      return 'Bảng';
    case 'diagram':
    default:
      return 'Hình';
  }
}

export function stripLegacyCaptionPrefix(caption: string): string {
  if (!caption) return caption;
  // Matches "Biểu đồ 1. ", "Bảng 1. ", "Hình 1: ", "Biểu đồ: ", "Bảng: ", etc.
  // Must be at the start of the string.
  return caption.replace(/^(?:Biểu đồ|Bảng|Hình)(?:\s+\d+)?\s*[.:]\s*/i, '').trim();
}

export function extractExplicitSourceCitation(text: string): string | undefined {
  if (!text) return undefined;
  const lines = text.split('\n');
  for (let line of lines) {
    line = line.trim();
    const match = line.match(/^Nguồn:\s*(.*)$/i);
    if (match && match[1].trim() !== '') {
      return match[1].trim();
    }
  }
  return undefined;
}

export function getFigureCaptionText(figure: any): string {
  if (!figure) return '';
  const data = figure.data || figure; // Handle Candidate vs Model
  if (data.type === 'table') return data.table?.caption || data.title || '';
  if (data.type === 'chart') return data.chart?.config?.caption || data.title || '';
  if (data.type === 'diagram') return data.diagram?.caption || data.title || '';
  return data.title || '';
}

export function getFigureSourceCitation(figure: any): string | undefined {
  if (!figure) return undefined;
  const data = figure.data || figure; // Handle Candidate vs SavedFigure data payload vs Model
  // SavedFigure stores the type-specific model in figure.chart/table/diagram
  if (figure.type === 'table' && figure.table?.source) return figure.table.source;
  if (figure.type === 'chart' && figure.chart?.config?.source) return figure.chart.config.source;
  if (figure.type === 'diagram' && figure.diagram?.source) return figure.diagram.source;
  
  // For Candidate inner data payload
  if (data.type === 'table') return data.table?.source;
  if (data.type === 'chart') return data.chart?.config?.source;
  if (data.type === 'diagram') return data.diagram?.source;
  
  return undefined;
}

export function buildFigureNumberingMap(savedFigures: SavedFigure[]): Record<string, { kind: 'chart' | 'table' | 'diagram', ordinal: number, label: string }> {
  const map: Record<string, { kind: 'chart' | 'table' | 'diagram', ordinal: number, label: string }> = {};
  const counters = {
    chart: 0,
    table: 0,
    diagram: 0
  };

  for (const fig of savedFigures) {
    const kind = getFigureCaptionKind(fig);
    counters[kind]++;
    map[fig.id] = {
      kind,
      ordinal: counters[kind],
      label: getFigureCaptionLabel(kind)
    };
  }

  return map;
}

export function formatNumberedCaption(label: string, ordinal: number, captionText: string): string {
  const cleanCaption = stripLegacyCaptionPrefix(captionText);
  if (!cleanCaption) return `${label} ${ordinal}`;
  return `${label} ${ordinal}. ${cleanCaption}`;
}

export function escapeHtmlText(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildPdfAcademicFooterHtml(metadata: ResolvedFigureExportMetadata): string {
  let html = `<div class="academic-export-footer" style="margin-top: 16px; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.4; overflow-wrap: anywhere; word-break: break-word;">`;
  
  const displayCaption = metadata.isPreview ? metadata.captionText : metadata.numberedCaption;
  
  if (displayCaption) {
    html += `<div class="academic-export-caption" style="font-weight: 600; text-align: center;">${escapeHtmlText(displayCaption)}</div>`;
  }
  
  if (metadata.sourceCitation && metadata.sourceCitation.trim() !== '') {
    html += `<div class="academic-export-source" style="margin-top: 6px; font-style: italic; text-align: left;">Nguồn: ${escapeHtmlText(metadata.sourceCitation)}</div>`;
  }
  
  html += `</div>`;
  return html;
}
