
import { VisualCandidate, SavedFigure, PreviewFigure, RankedVisualCandidate, ParsedMeasure } from '../types';
import { getStringHash } from '../academicArchitecture';
import { isCandidateApplicable, isCandidatePreviewable } from '../analysis/candidateModel';
import { adaptCandidateToRenderable } from '../analysis/candidateToRenderableAdapter';

// --- PARSING HELPERS ---

/**
 * Parses Vietnamese measure formats into numeric values and semantic units.
 */
export function parseVietnameseMeasure(raw: string): ParsedMeasure | null {
  if (!raw) return null;
  
  let cleaned = raw.trim();
  cleaned = stripCitations(cleaned);
  
  // Extract number part and unit part
  const match = cleaned.match(/^([+-]?[\d\s.,]+)(.*)$/);
  if (!match) return null;
  
  let numStr = match[1].trim();
  let unitStrRaw = match[2].trim();
  
  // Determine dot and comma representation
  const hasComma = numStr.includes(',');
  const hasDot = numStr.includes('.');
  if (hasComma && hasDot) {
    const lastComma = numStr.lastIndexOf(',');
    const lastDot = numStr.lastIndexOf('.');
    if (lastComma > lastDot) {
      numStr = numStr.replace(/\./g, '').replace(',', '.');
    } else {
      numStr = numStr.replace(/,/g, '');
    }
  } else if (hasComma) {
    numStr = numStr.replace(/,/g, '.');
  } else if (hasDot) {
    const dotCount = (numStr.match(/\./g) || []).length;
    if (dotCount > 1) {
      numStr = numStr.replace(/\./g, '');
    } else {
      const parts = numStr.split('.');
      if (parts[1].length === 3 && parts[0] !== '0') {
        numStr = numStr.replace(/\./g, '');
      }
    }
  }
  
  numStr = numStr.replace(/\s+/g, '');
  const parsedValue = parseFloat(numStr);
  if (!isFinite(parsedValue)) return null;

  const lowerUnit = unitStrRaw.toLowerCase().trim();
  const res: ParsedMeasure = {
    raw,
    value: parsedValue,
    unitText: unitStrRaw,
    unitFamily: 'unknown',
    canonicalUnit: 'unknown',
    scale: 'unit'
  };

  if (lowerUnit.match(/đồng\/người\/tháng|đ\/người\/tháng|vnd\/người\/tháng/)) {
    res.unitFamily = 'income_per_person_month';
    res.canonicalUnit = 'income_vnd_per_person_month';
  } else if (lowerUnit.match(/tỷ đồng|tỷ đ/)) {
    res.unitFamily = 'currency';
    res.canonicalUnit = 'currency_vnd_billion';
    res.scale = 'billion';
  } else if (lowerUnit.match(/triệu đồng|tr\. đồng|tr đồng/)) {
    res.unitFamily = 'currency';
    res.canonicalUnit = 'currency_vnd_million';
    res.scale = 'million';
  } else if (lowerUnit === 'đồng' || lowerUnit === 'đ') {
    res.unitFamily = 'currency';
    res.canonicalUnit = 'currency_vnd';
  } else if (lowerUnit === '%' || lowerUnit === 'phần trăm') {
    res.unitFamily = 'percentage';
    res.canonicalUnit = 'percentage';
  } else if (lowerUnit.match(/lượt tàu|lượt dẫn tàu|lượt/)) {
    res.unitFamily = 'count';
    res.canonicalUnit = 'vessel_trip_count';
  } else if (lowerUnit.match(/người/)) {
    res.unitFamily = 'count';
    res.canonicalUnit = 'person_count';
  } else if (lowerUnit.match(/chiếc|phương tiện|tàu|xe/)) {
    res.unitFamily = 'count';
    res.canonicalUnit = 'vehicle_count';
  } else if (lowerUnit.match(/tr\.gthl|gthl|tấn|teu|dwt/i)) {
    res.unitFamily = 'volume_or_output';
    if (lowerUnit.match(/tr\.gthl/)) {
      res.canonicalUnit = 'volume_or_output_tr_gthl';
    } else {
      res.canonicalUnit = 'volume_or_output';
    }
  }

  return res;
}

export function formatVietnameseNumber(
  value: number,
  options?: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
    compact?: boolean;
  }
): string {
  if (value === null || value === undefined || !isFinite(value)) return '';
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    notation: options?.compact ? 'compact' : 'standard',
  }).format(value);
}

export function getDisplayUnitFromCanonicalUnit(
  canonicalUnit?: string,
  fallbackUnit?: string
): string | undefined {
  if (!canonicalUnit || canonicalUnit === 'unknown') {
    return fallbackUnit;
  }
  
  switch (canonicalUnit) {
    case 'currency_vnd_billion': return 'tỷ đồng';
    case 'currency_vnd_million': return 'Tr. đồng';
    case 'currency_vnd': return 'đồng';
    case 'percentage': return '%';
    case 'income_vnd_per_person_month': return 'đồng/người/tháng';
    case 'person_count': return 'người';
    case 'vehicle_count': return 'phương tiện';
    case 'vessel_trip_count': return 'lượt tàu';
    case 'volume_or_output_tr_gthl': return 'Tr.GTHL';
    case 'volume_or_output': return 'sản lượng';
    default: return fallbackUnit;
  }
}

export function formatVietnameseValueWithUnit(
  value: number,
  unit?: string,
  options?: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
    compact?: boolean;
  }
): string {
  const formattedVal = formatVietnameseNumber(value, options);
  if (!unit) return formattedVal;
  if (unit === '%') return `${formattedVal}%`;
  return `${formattedVal} ${unit}`;
}

/**
 * Normalizes Vietnamese number formats to standard JS number (backward compatible).
 */
export function normalizeVietnameseNumber(raw: string): number | null {
  const parsed = parseVietnameseMeasure(raw);
  return parsed ? parsed.value : null;
}

/**
 * Checks if a raw table cell content should be treated as a numeric value for formatting.
 */
export function isTableNumericValue(rawValue: unknown): boolean {
  if (rawValue === null || rawValue === undefined) return false;
  const str = String(rawValue).trim();
  if (str === '' || str === '-') return false;
  
  // Exclude common identifiers like years (2024), quarters (Q1), or ID-like formats (2024-A)
  if (str.match(/^(?:Q|H|T|S|M|K)\d/i)) return false; // Q1, H2, T1, etc.
  if (str.match(/^\d{1,2}\/\d{4}$/)) return false; // 01/2024
  if (str.match(/^\d{4}-\w+$/)) return false; // 2024-A
  
  const parsed = parseVietnameseMeasure(str);
  if (!parsed || !isFinite(parsed.value)) return false;
  
  // If it's a simple 4-digit number like 2024, we only treat it as numeric if it has units or is part of a series
  // but here we just check if it's a valid measure. 
  // RuleAnalyzer will do more context-aware alignment.
  return true;
}

/**
 * Formats a table cell value according to Vietnamese academic standards.
 */
export function formatTableCellDisplayValue(rawValue: unknown): string {
  if (rawValue === null || rawValue === undefined) return '';
  const str = String(rawValue).trim();
  if (str === '' || str === '-') return str;

  // Handle identified numeric values
  if (isTableNumericValue(str)) {
    const parsed = parseVietnameseMeasure(str);
    if (parsed) {
      // If it has percentage, keep it
      if (parsed.unitText === '%') {
        return formatVietnameseValueWithUnit(parsed.value, '%');
      }
      // If it has other units, decide if we format or keep raw with unit
      // Usually in tables, units are in headers, so we often just need the number.
      // But if it was extracted as "12,5 tỷ đồng", we might want to keep it or just the number.
      // Rule: if raw string is just a number (with optional dot/comma), format it.
      // If it has complex text, we might leave it but format the number part if possible.
      
      const justNumberMatch = str.match(/^[+-]?[\d\s.,]+$/);
      if (justNumberMatch) {
         return formatVietnameseNumber(parsed.value);
      }
      
      // If it's "914691 tr. đồng", we format the number part
      const numberPart = str.match(/^([+-]?[\d\s.,]+)(.*)$/);
      if (numberPart) {
        const numValue = parsed.value;
        const unitPart = numberPart[2].trim();
        if (unitPart) {
          return `${formatVietnameseNumber(numValue)} ${unitPart}`;
        }
      }
      
      return formatVietnameseNumber(parsed.value);
    }
  }

  return str;
}

/**
 * Removes citation patterns like [1-4], [10, 11], [1-5, 7, 9].
 */
export function stripCitations(text: string): string {
  if (!text) return '';
  return text.replace(/\[[\d\s,;\-\u2013\u2014]+\]/g, '').trim();
}

/**
 * Validates if a figure (saved or preview) has its required data payload.
 */
export function hasRenderablePayload(figure: SavedFigure | PreviewFigure): boolean {
  return validateRenderableFigurePayload(figure).valid;
}

/**
 * Strict validation with descriptive errors.
 */
export function validateRenderableFigurePayload(figure: SavedFigure | PreviewFigure): { valid: boolean; error?: string } {
  if (!figure) return { valid: false, error: "Dữ liệu hình ảnh bị rỗng (null/undefined)." };
  
  if (figure.type === 'diagram') {
    if (!figure.diagram) {
      return { valid: false, error: "Sơ đồ chưa có dữ liệu cấu trúc (diagram payload)." };
    }
    const diagram = figure.diagram;
    if (!Array.isArray(diagram.nodes) || diagram.nodes.length === 0) {
      return { valid: false, error: "Sơ đồ phải có ít nhất 1 khối (nodes)." };
    }
    
    // Validate each node
    for (let i = 0; i < diagram.nodes.length; i++) {
      const node = diagram.nodes[i];
      if (!node.id || typeof node.id !== 'string' || node.id.trim() === '') {
        return { valid: false, error: `Khối thứ ${i + 1} thiếu định danh (id).` };
      }
      if (!node.label || typeof node.label !== 'string' || node.label.trim() === '') {
        return { valid: false, error: `Khối "${node.id}" có nhãn rỗng.` };
      }
      if (!isFinite(node.x) || !isFinite(node.y) || !isFinite(node.w) || !isFinite(node.h)) {
        return { valid: false, error: `Khối "${node.id}" có tọa độ hoặc kích thước không hợp lệ.` };
      }
      if (node.w <= 0 || node.h <= 0) {
        return { valid: false, error: `Khối "${node.id}" phải có chiều rộng/cao lớn hơn 0.` };
      }
    }
    
    // Validate connections
    if (diagram.connections) {
      const nodeIds = new Set(diagram.nodes.map(n => n.id));
      const seenConnections = new Set<string>();
      for (let i = 0; i < diagram.connections.length; i++) {
        const conn = diagram.connections[i];
        if (!conn.fromId || !conn.toId) {
          return { valid: false, error: `Liên kết thứ ${i + 1} bị thiếu node nguồn hoặc đích.` };
        }
        if (!nodeIds.has(conn.fromId)) {
          return { valid: false, error: `Liên kết nguồn "${conn.fromId}" không tồn tại trong danh sách khối.` };
        }
        if (!nodeIds.has(conn.toId)) {
          return { valid: false, error: `Liên kết đích "${conn.toId}" không tồn tại trong danh sách khối.` };
        }
        const connKey = `${conn.fromId}->${conn.toId}`;
        if (seenConnections.has(connKey)) {
          return { valid: false, error: `Liên kết trùng lặp giữa "${conn.fromId}" và "${conn.toId}".` };
        }
        seenConnections.add(connKey);
      }
    }
  } else if (figure.type === 'chart') {
    if (!figure.chart) {
      return { valid: false, error: "Biểu đồ chưa có dữ liệu số liệu (chart payload)." };
    }
    const chart = figure.chart;
    if (!chart.config || !['bar', 'line', 'pie', 'scatter', 'area'].includes(chart.config.type)) {
      return { valid: false, error: `Loại biểu đồ không hợp lệ hoặc không được hỗ trợ.` };
    }
    if (!Array.isArray(chart.data) || chart.data.length === 0) {
      return { valid: false, error: "Biểu đồ chưa có dữ liệu điểm (data points)." };
    }
    if ((chart.config.type === 'line' || chart.config.type === 'area') && chart.data.length < 2) {
      return { valid: false, error: "Không đủ chuỗi thời gian/dữ liệu để tạo biểu đồ đường (cần ít nhất 2 điểm)." };
    }
    for (let i = 0; i < chart.data.length; i++) {
      const pt = chart.data[i];
      if (pt.label === undefined || pt.label === null || String(pt.label).trim() === '') {
        return { valid: false, error: `Điểm dữ liệu thứ ${i + 1} có nhãn rỗng.` };
      }
      if (pt.value === undefined || pt.value === null || !isFinite(pt.value)) {
        return { valid: false, error: `Điểm dữ liệu "${pt.label}" có giá trị số không hợp lệ.` };
      }
    }
  } else if (figure.type === 'table') {
    if (!figure.table) {
      return { valid: false, error: "Bảng chưa có dữ liệu dòng/cột (table payload)." };
    }
    const table = figure.table;
    if (!Array.isArray(table.columns) || table.columns.length === 0) {
      return { valid: false, error: "Bảng phải có ít nhất 1 cột (columns)." };
    }
    if (!Array.isArray(table.rows) || table.rows.length === 0) {
      return { valid: false, error: "Bảng phải có ít nhất 1 dòng (rows)." };
    }
    for (let i = 0; i < table.columns.length; i++) {
      const col = table.columns[i];
      if (!col.key || col.key.trim() === '') {
        return { valid: false, error: `Cột thứ ${i + 1} thiếu thuộc tính key.` };
      }
      if (!col.header || col.header.trim() === '') {
        return { valid: false, error: `Cột "${col.key}" có tiêu đề rỗng.` };
      }
    }
  } else {
    return { valid: false, error: `Loại hình ảnh không hợp lệ: ${figure.type}` };
  }

  return { valid: true };
}

/**
 * Gets a human-friendly error message if data is missing.
 */
export function getFigurePayloadError(figure: SavedFigure | PreviewFigure): string | null {
  const validation = validateRenderableFigurePayload(figure);
  return validation.valid ? null : validation.error!;
}

/**
 * Safely builds a PreviewFigure from a candidate.
 */
export function buildPreviewFigureFromCandidate(candidate: VisualCandidate | RankedVisualCandidate): PreviewFigure {
  if (!isCandidatePreviewable(candidate)) throw new Error("Candidate is not previewable.");
  if (!candidate || !candidate.data) {
    throw new Error("Candidate data is missing.");
  }
  
  const renderable = adaptCandidateToRenderable(candidate);
  
  const figure: PreviewFigure = {
    sourceCandidateUid: renderable.sourceCandidateUid,
    title: renderable.title || "Xem trước đề xuất",
    type: renderable.type,
    diagram: renderable.diagram,
    chart: renderable.chart,
    table: renderable.table,
    isPreview: true
  };

  return figure;
}

/**
 * Safely builds a SavedFigure from a candidate, ensuring payload integrity.
 */
export function buildSavedFigureFromCandidate(
  candidate: VisualCandidate | RankedVisualCandidate, 
  theme: string
): SavedFigure {
  if (!isCandidateApplicable(candidate)) throw new Error("Candidate is not applicable.");
  if (!candidate || !candidate.data) {
    throw new Error("Không thể tạo hình từ đề xuất rỗng.");
  }

  const renderable = adaptCandidateToRenderable(candidate);
  const uid = renderable.sourceCandidateUid;
  const now = new Date().toISOString();

  // Validate theme, fallback if invalid
  const finalTheme = candidate.suggestedTheme || theme || "default";

  const figure: SavedFigure = {
    id: `fig_${getStringHash(uid + now)}`,
    title: renderable.title || "Hình mới",
    type: renderable.type,
    theme: finalTheme,
    createdAt: now,
    updatedAt: now,
    sourceCandidateUid: uid,
    diagram: renderable.diagram,
    chart: renderable.chart,
    table: renderable.table
  };

  // Enforce validation at build time
  const validation = validateRenderableFigurePayload(figure);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return figure;
}

export type ExportFormat = 'png' | 'svg' | 'pdf' | 'tikz';

/**
 * Checks if a specific export format is supported for a given figure type.
 */
export function getExportSupport(
  figure: SavedFigure | PreviewFigure | null,
  format: ExportFormat
): {
  supported: boolean;
  reason?: string;
} {
  if (!figure) return { supported: false, reason: "Chưa chọn hình để kiểm tra hỗ trợ." };
  
  const type = figure.type;

  switch (format) {
    case 'pdf':
      return { supported: false, reason: "Coming soon: Tính năng xuất PDF đang được phát triển." };
    
    case 'png':
      if (type === 'diagram') return { supported: true };
      if (type === 'chart') return { supported: true, reason: "Hỗ trợ trích xuất PNG từ biểu đồ." };
      return { supported: false, reason: "Bảng dữ liệu hiện chưa hỗ trợ xuất trực tiếp ra PNG." };
    
    case 'svg':
      if (type === 'chart') return { supported: true, reason: "Đã hỗ trợ xuất SVG học thuật cho biểu đồ." };
      if (type === 'diagram') return { supported: true, reason: "Đã hỗ trợ xuất SVG native cho sơ đồ. Cần kiểm tra trên viewer đích trước khi dùng xuất bản chính thức." };
      return { supported: false, reason: "Bảng dữ liệu SVG chưa bật vì chưa có native SVG renderer cho bảng." };
    
    case 'tikz':
      return { supported: false, reason: "Metadata-safe generator exists; still disabled pending compile/fidelity validation." };
    
    default:
      return { supported: false, reason: "Định dạng không xác định." };
  }
}
