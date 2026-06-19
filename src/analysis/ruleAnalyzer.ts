import { 
  RuleAnalysisResult, 
  VisualIntentType, 
  VisualCandidate, 
  FigureKind,
  ChartModel,
  DiagramModel,
  TableModel,
  ChartDataPoint
} from '../types';
import { getStringHash } from '../academicArchitecture';
import { normalizeVietnameseNumber, stripCitations, parseVietnameseMeasure, isTableNumericValue } from '../lib/workflowUtils';
import { extractExplicitSourceCitation } from '../lib/figureCaptionMetadata';
import { parseDocumentSections, DocumentSection } from '../lib/documentParser';
import { extractNumericBullets } from './numericBulletDataset';

export interface ParsedTable {
  header: string[];
  rows: string[][];
  title: string;
}

/**
 * Extracts Markdown or loose text tables from text.
 */
export function extractTables(sourceText: string): ParsedTable[] {
  const markdownTables = extractMarkdownTables(sourceText);
  const looseTables = extractLooseTables(sourceText);
  
  // Deduplicate if needed, but for now we just combine
  return [...markdownTables, ...looseTables];
}

/**
 * Extracts Markdown tables from text.
 */
export function extractMarkdownTables(sourceText: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const lines = sourceText.split('\n');
  let currentTable: ParsedTable | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('|')) {
      let cells = line.split('|').map(c => stripCitations(c.replace(/\*\*/g, '').trim()));
      // If it starts or ends with |, remove the empty shells
      if (line.startsWith('|')) cells.shift();
      if (line.endsWith('|')) cells.pop();

      // Check if it is a separator line (e.g. |---|:---|---:|:---:| etc.)
      const isSeparator = cells.length > 0 && cells.every(c => c === '' || /^\s*:?-+:?\s*$/.test(c));
      if (isSeparator) {
        if (currentTable && currentTable.rows.length === 0) continue; // It was a header separator
        // Otherwise it might be middle of table, treat as break
        if (currentTable) {
          tables.push(currentTable);
          currentTable = null;
        }
        continue;
      }

      if (!currentTable) {
        // Look back for a semantic title
        let title = 'Bảng dữ liệu';
        for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
          const l = lines[j].trim();
          // Skip lines that are too short, have colons (contextual notes), or start with reserved words
          if (l && !l.includes('|') && l.length > 5) {
            const lowerL = l.toLowerCase();
            const isNote = lowerL.includes(':') || 
                          /^(tổng|trong đó|ghi chú|nhận xét|đơn vị|nguồn|lưu ý|theo|báo cáo)/i.test(lowerL);
            if (!isNote) {
              title = l.replace(/^###\s+|^\*\*\s*|^\d+\.\s*/, '').replace(/\*\*$/, '').trim();
              break;
            }
          }
        }
        currentTable = { header: cells, rows: [], title };
      } else {
        // Validation: if cells count is very different, might be a different structure
        if (Math.abs(cells.length - currentTable.header.length) > 2 && currentTable.rows.length > 0) {
           tables.push(currentTable);
           currentTable = { header: cells, rows: [], title: 'Bảng dữ liệu' };
        } else {
           currentTable.rows.push(cells);
        }
      }
    } else {
      if (currentTable) {
        if (currentTable.rows.length > 0) tables.push(currentTable);
        currentTable = null;
      }
    }
  }
  if (currentTable && currentTable.rows.length > 0) tables.push(currentTable);
  
  return tables;
}

/**
 * Extracts loose tables (tab or multi-space separated).
 */
export function extractLooseTables(sourceText: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const lines = sourceText.split('\n');
  let currentRows: string[][] = [];
  let lastColCount = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (currentRows.length >= 2) {
        tables.push(finalizeLooseTable(currentRows, lines, i - currentRows.length));
      }
      currentRows = [];
      lastColCount = -1;
      continue;
    }

    // Detect columns: split by tab OR 2+ spaces
    let cells = line.split(/\t|\s{3,}/).map(c => stripCitations(c.trim())).filter(c => c !== '');
    
    // If it didn't split well by 3 spaces, try 2 spaces if it looks like a table row (has numbers)
    if (cells.length < 2 && /\d/.test(line)) {
      cells = line.split(/\s{2,}/).map(c => stripCitations(c.trim())).filter(c => c !== '');
    }

    if (cells.length >= 2) {
      if (lastColCount === -1 || Math.abs(cells.length - lastColCount) <= 1) {
        currentRows.push(cells);
        lastColCount = cells.length;
      } else {
        // Column count changed significantly
        if (currentRows.length >= 2) {
          tables.push(finalizeLooseTable(currentRows, lines, i - currentRows.length));
        }
        currentRows = [cells];
        lastColCount = cells.length;
      }
    } else {
      if (currentRows.length >= 2) {
        tables.push(finalizeLooseTable(currentRows, lines, i - currentRows.length));
      }
      currentRows = [];
      lastColCount = -1;
    }
  }
  
  if (currentRows.length >= 2) {
    tables.push(finalizeLooseTable(currentRows, lines, lines.length - currentRows.length));
  }
  
  return tables;
}

function finalizeLooseTable(rows: string[][], allLines: string[], startIndex: number): ParsedTable {
  const header = rows[0];
  const dataRows = rows.slice(1);
  
  // Look back for a semantic title
  let title = 'Bảng số liệu';
  for (let j = startIndex - 1; j >= Math.max(0, startIndex - 10); j--) {
    const l = allLines[j].trim();
    if (l && l.length > 5) {
      const lowerL = l.toLowerCase();
      const isNote = lowerL.includes(':') || 
                    /^(tổng|trong đó|ghi chú|nhận xét|đơn vị|nguồn|lưu ý|theo|báo cáo)/i.test(lowerL);
      if (!isNote) {
        title = l.replace(/^###\s+|^\*\*\s*|^\d+\.\s*/, '').replace(/\*\*$/, '').trim();
        break;
      }
    }
  }
  
  return { header, rows: dataRows, title };
}

/**
 * RuleAnalyzer: Detects visual patterns using regex and heuristics.
 */
export async function runRuleAnalysis(text: string): Promise<RuleAnalysisResult> {
  const result: RuleAnalysisResult = {
    sourceTextHash: getStringHash(text),
    detectedIntents: [],
    extractedEntities: [],
    extractedMetrics: [],
    extractedRelations: [],
    recommendedCandidates: [],
    confidence: 0,
    warnings: []
  };

  const tables = extractTables(text);
  const lowerText = text.toLowerCase();

  // 1. Process Markdown Tables
  for (const table of tables) {
    if (table.header.length === 0 || table.rows.length === 0) continue;

    // Always create a table candidate
    const tableCand = createTableCandidateFromParsedTable(table);
    result.recommendedCandidates.push(tableCand);
    result.detectedIntents.push('summary');

    // Create chart candidates only if there are numeric columns and table has more than 1 column
    if (table.header.length > 1) {
      // Find columns that are numeric (column index >= 1)
      let colIdx = 1;
      let yearColumnsCount = 0;
      
      // Check if headers look like years
      for (let c = 1; c < table.header.length; c++) {
        if (/\b20\d{2}\b/.test(table.header[c])) {
          yearColumnsCount++;
        }
      }
      
      const isTimeSeriesAcrossColumns = yearColumnsCount >= 2;

      while (colIdx < table.header.length) {
        let numericCount = 0;
        let validRows = 0;
        
        table.rows.forEach(row => {
          const valStr = row[colIdx];
          if (valStr !== undefined && valStr !== null && valStr.trim() !== '') {
            validRows++;
            if (normalizeVietnameseNumber(valStr) !== null) {
              numericCount++;
            }
          }
        });

        // If at least 50% of non-empty cells in the column are numeric, generate a chart for it
        if (validRows > 0 && numericCount / validRows >= 0.5) {
          if (!isTimeSeriesAcrossColumns || colIdx === table.header.length - 1) {
            // Only generate chart for the last col if it's a time series across columns to avoid spam
            const chartCand = createChartCandidateFromTableCol(table, colIdx);
            result.recommendedCandidates.push(chartCand);
            result.detectedIntents.push('compare');

            if (chartCand.visualType === 'pie_chart') {
              const nextColIdx = colIdx + 1;
              if (nextColIdx < table.header.length && /(tỷ trọng|tỉ lệ|%)/i.test(table.header[nextColIdx].toLowerCase())) {
                 colIdx++;
              }
            }
          }
        }
        colIdx++;
      }
    }
  }

  // 2. Process bullet lists / key-value list for charts (like ROE/ROA, average income)
  const lines = text.split('\n');
  
  type ParsedMeasurePoint = {
    label: string;
    measure: import('../types').ParsedMeasure;
    lineIndex: number;
    rawLine: string;
  };

  type SemanticMeasureGroup = {
    groupId: string;
    heading: string;
    startLine: number;
    endLine: number;
    sourceText: string;
    points: ParsedMeasurePoint[];
  };

  const semanticGroups: SemanticMeasureGroup[] = [];
  let currentGroup: SemanticMeasureGroup | null = null;
  let currentHeading = 'Danh sách dữ liệu';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isHeading = /^#{1,6}\s+/.test(line);
    const endsWithColon = line.endsWith(':') && line.length < 60;
    const isEmpty = line === '';
    
    if (line.includes('|')) {
      if (currentGroup && currentGroup.points.length > 0) {
        currentGroup.endLine = i;
        semanticGroups.push(currentGroup);
        currentGroup = null;
      }
      continue;
    }

    if (isHeading || endsWithColon || isEmpty) {
      if (currentGroup && currentGroup.points.length > 0) {
        currentGroup.endLine = i - 1;
        semanticGroups.push(currentGroup);
        currentGroup = null;
      }
      if (isHeading) {
        currentHeading = line.replace(/^#{1,6}\s+/, '').trim();
      } else if (endsWithColon) {
        currentHeading = line.substring(0, line.length - 1).trim();
      }
      continue;
    }

    let extractedLabel = '';
    let extractedValStr = '';

    if (/^[-*+•]/.test(line) || line.includes(':')) {
      let replaced = line.replace(/^[-*+•]\s*/, '');
      if (replaced.includes(':')) {
        const parts = replaced.split(':');
        if (parts.length >= 2) {
          extractedLabel = stripCitations(parts[0].trim());
          extractedValStr = parts.slice(1).join(':').trim();
        }
      }
    }

    if (extractedLabel && extractedValStr) {
      const parsedMeasure = parseVietnameseMeasure(extractedValStr);
      if (parsedMeasure) {
        if (!currentGroup) {
          currentGroup = {
            groupId: `group_${i}_${getStringHash(currentHeading)}`,
            heading: currentHeading,
            startLine: i,
            endLine: i,
            sourceText: '',
            points: []
          };
        }
        currentGroup.points.push({
          label: extractedLabel,
          measure: parsedMeasure,
          lineIndex: i,
          rawLine: line
        });
      }
    }
  }

  if (currentGroup && currentGroup.points.length > 0) {
    currentGroup.endLine = lines.length - 1;
    semanticGroups.push(currentGroup);
  }

  // Evaluate Semantic Groups and Subgroups
  for (const group of semanticGroups) {
    const subgroups = new Map<string, ParsedMeasurePoint[]>();
    group.points.forEach(pt => {
      const key = `${pt.measure.unitFamily}__${pt.measure.canonicalUnit}`;
      if (!subgroups.has(key)) subgroups.set(key, []);
      subgroups.get(key)!.push(pt);
    });

    subgroups.forEach((pts, key) => {
      // Create chart only if we have at least 2 points in the same canonical group
      if (pts.length >= 2) {
        const family = pts[0].measure.unitFamily;
        const canonical = pts[0].measure.canonicalUnit;
        
        const chartDataPoints: ChartDataPoint[] = pts.map(p => ({
          label: p.label,
          value: p.measure.value,
          unit: p.measure.unitText,
          unitFamily: p.measure.unitFamily,
          canonicalUnit: p.measure.canonicalUnit,
          sourceGroupId: group.groupId,
          rawValue: p.measure.raw
        }));

        let conf = 0.8;
        if (pts.length >= 3 && family !== 'unknown' && canonical !== 'unknown') {
          conf = 0.9;
        } else if (family === 'unknown' || canonical === 'unknown') {
          conf = 0.6;
        }

        let yAxisLabel = pts[0].measure.unitText || 'Giá trị';
        if (family === 'percentage') yAxisLabel = '%';
        if (canonical === 'income_vnd_per_person_month') yAxisLabel = 'VNĐ/người/tháng';

        const title = group.heading !== 'Danh sách dữ liệu' ? `Biểu đồ: ${group.heading}` : 'Biểu đồ trích xuất từ văn bản';

        const chart: ChartModel = {
          config: {
            type: 'bar',
            title: title,
            xAxisLabel: 'Hạng mục',
            yAxisLabel: yAxisLabel,
            showGrid: true,
            isDoubleColumn: false,
            caption: `Biểu đồ so sánh dữ liệu ${group.heading !== 'Danh sách dữ liệu' ? '(' + group.heading + ')' : ''}`
          },
          data: chartDataPoints
        };

        const id = `rule_list_chart_${getStringHash(group.groupId + key)}`;
        result.recommendedCandidates.push({
          id,
          sourceText: lines.slice(group.startLine, group.endLine + 1).join('\n'),
          visualType: 'bar_chart',
          confidence: conf,
          detectionMethod: 'rule',
          source: 'rule',
          finalConfidence: conf,
          title: group.heading !== 'Danh sách dữ liệu' ? `So sánh: ${group.heading}` : 'Biểu đồ so sánh số liệu',
          rationale: `Tạo biểu đồ từ nhóm "${group.heading}" (cùng loại đơn vị).`,
          extractedItems: [],
          sourceGroupId: group.groupId,
          data: {
            type: 'chart',
            title: title,
            chart
          }
        });
        result.detectedIntents.push('compare');
      } else {
        // Did not meet the threshold of 2 points -> rejected
        const warning = `[Debug] Từ chối tạo biểu đồ cho nhóm "${group.heading}" (unit: ${key}) vì chỉ có ${pts.length} điểm dữ liệu (yêu cầu >= 2).`;
        if (process.env.NODE_ENV !== 'production') {
          result.warnings.push(warning);
        }
      }
    });
  }

  // 3. Detect Processes (Diagrams) - Section-aware
  const sections = parseDocumentSections(text);
  
  let bestDiagramSection: DocumentSection | null = null;
  let bestDiagramScore = -999;
  
  for (const sec of sections) {
    let score = 0;
    const secLower = sec.rawText.toLowerCase();
    const headingLower = sec.heading.toLowerCase();
    
    if (headingLower.includes('sơ đồ')) score += 10;
    if (headingLower.includes('quy trình')) score += 5;
    if (secLower.includes('các bước trong sơ đồ')) score += 10;
    if (secLower.includes('các kết nối sơ đồ')) score += 10;
    if (secLower.includes('->')) score += 5;
    if (secLower.includes('dạng node đề xuất')) score += 5;
    if (secLower.includes('nhãn kết nối')) score += 5;
    if (secLower.includes('mũi tên')) score += 5;
    if (secLower.includes('solid') || secLower.includes('dashed') || secLower.includes('dotted')) score += 5;
    if (/^\s*\d+\.\s+/m.test(sec.bodyText)) score += 5; // numbered steps
    
    if (headingLower.includes('bảng') || headingLower.includes('biểu đồ')) score -= 15;
    
    // financial guard section-local
    const currencyCount = (secLower.match(/tỷ đồng|triệu đồng|vnd|\d+,\d+%/g) || []).length;
    if (currencyCount > 3) score -= 10;
    const isTableRowHeavy = (secLower.match(/\|.*\|/g) || []).length > 2;
    if (isTableRowHeavy) score -= 10;
    
    if (score > bestDiagramScore) {
      bestDiagramScore = score;
      bestDiagramSection = sec;
    }
  }

  if (bestDiagramScore > 0 && bestDiagramSection) {
    result.detectedIntents.push('process');
    result.recommendedCandidates.push(createDiagramCandidateFromSection(
      bestDiagramSection, 'flowchart', bestDiagramSection.heading || 'Sơ đồ quy trình thực hiện', 0.88
    ));
  } else {
    // Fallback to naive logic
    const processKeywords = ["quy trình", "tiến trình", "bước", "giai đoạn", "tiếp theo", "sau đó", "phê duyệt", "xử lý", "biến đổi", "dẫn đến"];
    const financialKeywords = ["doanh thu", "lợi nhuận", "tổng cộng", "nợ", "tài chính", "roe", "roa", "vốn", "tỷ đồng", "triệu đồng"];
    
    const processSignals = processKeywords.filter(k => lowerText.includes(k));
    const hasFinancialTable = tables.length > 0 && tables.some(t => {
      const tableText = (t.title + ' ' + t.header.join(' ')).toLowerCase();
      return financialKeywords.some(fk => tableText.includes(fk));
    });
    
    const arrowSignals = (text.match(/->|=>|→/g) || []).length;
    
    if ((processSignals.length >= 2 || arrowSignals >= 1) && !hasFinancialTable) {
      result.detectedIntents.push('process');
      result.recommendedCandidates.push(createDiagramCandidateNaive(text, 'flowchart', 'Sơ đồ quy trình thực hiện', 0.88));
    }
  }

  // 3.5 Extract Numeric Bullet Dataset (M1.5 Light)
  const numericBulletDataset = extractNumericBullets(text);
  if (numericBulletDataset.rows.length > 0) {
    const rows = numericBulletDataset.rows;
    
    // Create Table Candidate
    const tableColumns = [
      { key: 'category', header: 'Hạng mục', align: 'left' as const },
      { key: 'value', header: 'Giá trị', align: 'right' as const },
      { key: 'unit', header: 'Đơn vị', align: 'left' as const }
    ];
    if (rows.some(r => r.area)) {
      tableColumns.unshift({ key: 'area', header: 'Khu vực', align: 'left' as const });
    }

    const tableRows = rows.map(r => {
      const record: Record<string, string> = {
        category: r.category,
        value: r.value.toString(),
        unit: r.unit
      };
      if (r.area) record.area = r.area;
      return record;
    });

    const tableId = `rule_table_numeric_bullets_${getStringHash(text.substring(0, 50))}`;
    result.recommendedCandidates.push({
      id: tableId,
      sourceText: text.substring(0, 500),
      visualType: 'table',
      confidence: 0.95,
      detectionMethod: 'rule',
      source: 'rule',
      finalConfidence: 0.95,
      title: 'Bảng dữ liệu trích xuất từ danh sách',
      rationale: 'Trích xuất bảng dữ liệu từ danh sách số liệu định dạng key-value hoặc bullet.',
      extractedItems: [],
      data: {
        type: 'table',
        title: 'Bảng dữ liệu trích xuất từ danh sách',
        table: {
          columns: tableColumns,
          rows: tableRows,
          caption: 'Dữ liệu chi tiết'
        }
      }
    });
    result.detectedIntents.push('summary');

    // Create Bar Chart Candidate if >= 2 rows, same unit, categorical
    if (rows.length >= 2 && numericBulletDataset.canonicalUnit) {
      const chartDataPoints: ChartDataPoint[] = rows.map(r => ({
        label: r.displayLabel,
        value: r.value,
        unit: r.unit
      }));

      const chartId = `rule_chart_numeric_bullets_${getStringHash(text.substring(0, 50))}`;
      result.recommendedCandidates.push({
        id: chartId,
        sourceText: text.substring(0, 500),
        visualType: 'bar_chart',
        confidence: 0.9,
        detectionMethod: 'rule',
        source: 'rule',
        finalConfidence: 0.9,
        title: 'Biểu đồ so sánh số liệu',
        rationale: 'Tạo biểu đồ cột từ danh sách số liệu cùng đơn vị.',
        extractedItems: [],
        data: {
          type: 'chart',
          title: 'Biểu đồ so sánh số liệu',
          chart: {
            config: {
              type: 'bar',
              title: 'Biểu đồ so sánh số liệu',
              xAxisLabel: 'Hạng mục',
              yAxisLabel: numericBulletDataset.canonicalUnit,
              showGrid: true,
              isDoubleColumn: false,
              caption: 'So sánh số liệu'
            },
            data: chartDataPoints
          }
        }
      });
      result.detectedIntents.push('compare');
    }
  }

  // If no candidates are generated and there is no structured data, we return warnings instead of a fake candidate
  if (result.recommendedCandidates.length === 0) {
    result.warnings.push("Không tìm thấy cấu trúc bảng dữ liệu, số liệu so sánh, hoặc quy trình phù hợp để tạo hình ảnh.");
  }

  // 4. Extract explicit source citation
  const explicitSource = extractExplicitSourceCitation(text);
  if (explicitSource) {
    result.recommendedCandidates.forEach(cand => {
      if (cand.data.type === 'table' && cand.data.table) {
        cand.data.table.source = explicitSource;
      } else if (cand.data.type === 'chart' && cand.data.chart) {
        cand.data.chart.config.source = explicitSource;
      } else if (cand.data.type === 'diagram' && cand.data.diagram) {
        cand.data.diagram.source = explicitSource;
      }
    });
  }

  result.confidence = result.recommendedCandidates.length > 0 
    ? Math.max(...result.recommendedCandidates.map(c => c.confidence))
    : 0;

  return result;
}

function createTableCandidateFromParsedTable(table: ParsedTable): VisualCandidate {
  const columns = table.header.map((h, i) => {
    // Collect all non-empty values for this column to infer alignment
    const values = table.rows.map(row => row[i] || '').filter(v => v.trim() !== '');
    
    return {
      key: `col${i}`,
      header: h || `Cột ${i + 1}`,
      align: inferTableColumnAlign(h, values)
    };
  });

  const rows = table.rows.map(row => {
    const r: Record<string, string> = {};
    table.header.forEach((h, i) => {
      r[`col${i}`] = row[i] || '';
    });
    return r;
  });

  // Extract time range
  let minYear = Infinity;
  let maxYear = -Infinity;
  table.rows.forEach(row => {
    const label = row[0] || '';
    const yearMatch = label.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      const y = parseInt(yearMatch[1]);
      if (y < minYear) minYear = y;
      if (y > maxYear) maxYear = y;
    }
  });
  const timeRange = minYear !== Infinity && maxYear !== -Infinity && minYear !== maxYear ? `${minYear}–${maxYear}` : '';
  
  let cleanSourceTitle = table.title.replace(/^Báo cáo trích xuất$/i, 'Bảng dữ liệu').trim();
  if (cleanSourceTitle.toLowerCase() === 'bảng dữ liệu' && timeRange) {
    cleanSourceTitle = `Bảng dữ liệu giai đoạn ${timeRange}`;
  }
  
  // If we have a real title, use it. If it's just "Bảng dữ liệu", we might keep it simple.
  const hasGenericTitle = /^bảng (dữ liệu|số liệu)$/i.test(cleanSourceTitle);
  const semanticTitle = hasGenericTitle ? cleanSourceTitle : `Bảng dữ liệu - ${cleanSourceTitle}`;
  
  let captionLabel = cleanSourceTitle;
  if (hasGenericTitle) captionLabel = `số liệu trích xuất`;
  else {
    // If title already starts with "Bảng", don't double it
    if (captionLabel.toLowerCase().startsWith('bảng ')) {
       captionLabel = captionLabel.substring(5).trim();
    }
  }
  
  const caption = `${captionLabel.charAt(0).toUpperCase() + captionLabel.slice(1)}`;

  const tableModel: TableModel = {
    columns,
    rows,
    caption: caption
  };

  const id = `rule_table_${getStringHash(table.title + JSON.stringify(rows))}`;

  return {
    id,
    sourceText: table.title,
    visualType: 'table',
    confidence: 0.95,
    detectionMethod: 'rule',
    source: 'rule',
    finalConfidence: 0.95,
    title: semanticTitle,
    rationale: `Trích xuất toàn bộ dữ liệu bảng ${timeRange ? `theo thời gian (${timeRange})` : ''}`,
    extractedItems: [],
    data: {
      type: 'table',
      title: semanticTitle,
      table: tableModel
    }
  };
}

function createChartCandidateFromTableCol(table: ParsedTable, colIdx: number): VisualCandidate {
  // labels from col 0, values from colIdx
  let minYear = Infinity;
  let maxYear = -Infinity;
  let isTimeAxis = false;

  const chartData = table.rows
    .map(row => {
      const label = row[0] || 'Không xác định';
      const val = normalizeVietnameseNumber(row[colIdx]) || 0;

      const yearMatch = label.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        isTimeAxis = true;
        const y = parseInt(yearMatch[1]);
        if (y < minYear) minYear = y;
        if (y > maxYear) maxYear = y;
      }
      return { label, value: val };
    })
    .filter(d => d.label !== 'TỔNG CỘNG'); // exclude total summaries from chart points if possible

  const metricName = table.header[colIdx] || 'Giá trị';
  const metricLower = metricName.toLowerCase();
  let chartType: 'bar' | 'line' | 'area' | 'pie' | 'scatter' = 'bar';

  if (isTimeAxis) {
     if (/(tỷ lệ|phần trăm|%|rate|ratio|roe|roa|tăng trưởng|xu hướng)/i.test(metricLower)) {
       chartType = 'line';
     } else if (/(diện tích|lưu lượng|khối lượng|cộng dồn|tích lũy)/i.test(metricLower)) {
       chartType = 'area';
     } else if (/(sự cố|vụ|cảnh báo|lỗi|incident|risk)/i.test(metricLower)) {
       chartType = 'bar';
     } else {
       chartType = 'line'; // Default line for time series
     }
  } else if (/(cơ cấu|tỷ trọng|thành phần|tỉ trọng|kinh phí)/i.test(metricLower) || /(cơ cấu|tỷ trọng)/i.test(table.header[0].toLowerCase())) {
     chartType = 'pie';
  } else if (/(tương quan|quan hệ|biến thiên|scatter|phụ thuộc)/i.test(metricLower)) {
     chartType = 'scatter';
  }

  const timeRange = minYear !== Infinity && maxYear !== -Infinity && minYear <= maxYear ? `${minYear}–${maxYear}` : '';
  const timeSuffix = timeRange ? ` ${timeRange}` : (isTimeAxis ? ' theo năm' : '');
  
  const typeLabel = chartType === 'line' ? 'đường' : chartType === 'area' ? 'miền' : chartType === 'pie' ? 'cơ cấu' : 'cột';
  
  // Use table title if it is semantic, otherwise fall back to metric name
  const hasGenericTitle = /^bảng (dữ liệu|số liệu)$/i.test(table.title);
  let baseTitle = hasGenericTitle ? metricName : table.title;
  
  // Clean up if baseTitle already has "Biểu đồ" or "Bảng"
  baseTitle = baseTitle.replace(/^(biểu đồ|bảng)\s+-\s+/i, '').replace(/^(biểu đồ|bảng)\s+/i, '');

  const semanticTitle = `Biểu đồ ${typeLabel} - ${baseTitle}${timeSuffix}`;
  
  let actionLabel = 'So sánh';
  if (chartType === 'line' || chartType === 'area') actionLabel = 'Xu hướng';
  else if (chartType === 'pie') actionLabel = 'Cơ cấu';

  // If baseTitle already contains the actionLabel word (e.g. "Cơ cấu kinh phí"), don't repeat it in caption if it's Pie
  let captionTitle = baseTitle;
  if (chartType === 'pie' && captionTitle.toLowerCase().includes('cơ cấu')) {
     actionLabel = ''; 
  }

  const caption = `${actionLabel}${actionLabel ? ' ' : ''}${captionTitle}${timeSuffix}`;

  // If Pie Chart, check if there's a percentage column adjacent
  if (chartType === 'pie') {
    const nextColIdx = colIdx + 1;
    if (nextColIdx < table.header.length && /(tỷ trọng|tỉ lệ|%)/i.test(table.header[nextColIdx].toLowerCase())) {
      chartData.forEach((d: ChartDataPoint, i) => {
        const pct = normalizeVietnameseNumber(table.rows[i][nextColIdx]);
        if (pct !== null) d.percent = pct;
      });
    }
  }

  const chart: ChartModel = {
    config: {
      type: chartType as any,
      title: semanticTitle,
      xAxisLabel: table.header[0] || 'Hạng mục',
      yAxisLabel: metricName,
      showGrid: true,
      isDoubleColumn: false,
      caption: caption,
      showLegend: chartType === 'pie',
      showLabels: chartType === 'pie',
      legendPosition: 'bottom',
      labelMode: chartType === 'pie' ? 'name_percent' : 'value'
    },
    data: chartData
  };

  const id = `rule_chart_col_${colIdx}_${getStringHash(table.title)}`;

  return {
    id,
    sourceText: table.title,
    visualType: chartType === 'line' ? 'line_chart' : chartType === 'area' ? 'area_chart' : chartType === 'pie' ? 'pie_chart' : chartType === 'scatter' ? 'scatter_chart' : 'bar_chart',
    confidence: 0.9,
    detectionMethod: 'rule',
    source: 'rule',
    finalConfidence: 0.9,
    title: semanticTitle,
    rationale: `Phân tích ${metricName.toLowerCase()}${timeSuffix}`,
    extractedItems: [],
    data: {
      type: 'chart',
      title: semanticTitle,
      chart
    }
  };
}

// Helper factories for Rule-based candidates
function createChartCandidate(text: string, subType: string, title: string, conf: number): VisualCandidate {
  // Simple data extraction attempt
  const numberRegex = /\d+(?:[.,]\d+)?/g;
  const metrics = text.match(numberRegex) || [];
  
  // Try to find context for labels
  const data = metrics.slice(0, 5).map((m, i) => {
    const val = parseFloat(m.replace(',', '.'));
    const pos = text.indexOf(m);
    const context = text.substring(Math.max(0, pos - 20), pos).trim();
    const lastWordMatch = context.match(/(\w+)\s*$/);
    const label = lastWordMatch ? lastWordMatch[1] : `Dữ liệu ${i + 1}`;
    
    return {
      label: label,
      value: val
    };
  });

  const chart: ChartModel = {
    config: {
      type: subType as any,
      title: title,
      xAxisLabel: "Đại lượng",
      yAxisLabel: "Giá trị",
      showGrid: true,
      isDoubleColumn: false,
      caption: `Biểu đồ ${subType}: ${title} (Trích xuất từ nguồn)`
    },
    data: data.slice(0, 5)
  };

  const id = `rule_chart_${subType}_${getStringHash(text.substring(0, 50) + subType)}`;

  return {
    id,
    sourceText: text.substring(0, 500),
    visualType: subType === 'line' ? 'line_chart' : 'bar_chart',
    confidence: conf,
    detectionMethod: 'rule',
    source: 'rule',
    finalConfidence: conf,
    title: title,
    rationale: `Phát hiện dữ liệu số và tín hiệu ${subType === 'line' ? 'thời gian' : 'so sánh'} trong văn bản.`,
    extractedItems: [],
    data: {
      type: 'chart',
      title: title,
      chart: chart
    }
  };
}

import { ShapeType } from '../types';

function createDiagramCandidateFromSection(section: DocumentSection, subType: string, title: string, conf: number): VisualCandidate {
  let nodes: any[] = [];
  let connections: any[] = [];

  const text = section.rawText;
  const lines = text.split('\n');

  // Detect explicit source citation
  let sourceText = text;
  let explicitSource = extractExplicitSourceCitation(text);
  
  // Try to parse bounded blocks: "Các bước trong sơ đồ:" to "Các kết nối sơ đồ cần kiểm thử:"
  const stepsStartIdx = lines.findIndex(l => l.toLowerCase().includes('các bước trong sơ đồ'));
  const connectionsStartIdx = lines.findIndex(l => l.toLowerCase().includes('các kết nối sơ đồ'));
  const sourceIdx = lines.findIndex(l => l.toLowerCase().startsWith('nguồn:'));
  
  let stepsEndIdx = lines.length;
  if (connectionsStartIdx > stepsStartIdx) stepsEndIdx = connectionsStartIdx;
  else if (sourceIdx > stepsStartIdx) stepsEndIdx = sourceIdx;

  if (stepsStartIdx >= 0) {
    const stepLines = lines.slice(stepsStartIdx + 1, stepsEndIdx);
    let currentNode: any = null;
    
    for (const line of stepLines) {
      const matchNumber = line.match(/^\s*\d+\.\s+(.*)/);
      if (matchNumber) {
        if (currentNode) {
           nodes.push(currentNode);
        }
        const label = matchNumber[1].trim();
        currentNode = {
          id: `n${nodes.length + 1}`,
          type: 'rect' as ShapeType,
          label: label,
          _baseTitle: label.toLowerCase(), // for edge resolution
          x: 100 + (nodes.length * 150),
          y: 100,
          w: 120,
          h: 50
        };
      } else if (currentNode && line.trim().startsWith('*')) {
         const lower = line.toLowerCase();
         if (lower.includes('dạng node đề xuất:')) {
           const shapeMatch = lower.match(/dạng node đề xuất:\s*(diamond|cylinder|actor|text|rect|circle)/);
           if (shapeMatch) currentNode.type = shapeMatch[1] as ShapeType;
         } else if (lower.includes('label dài để test wrap:')) {
           const labelMatch = line.match(/label dài để test wrap:\s*(.*)/i);
           if (labelMatch) currentNode.label = labelMatch[1].trim();
         }
      }
    }
    if (currentNode) {
      nodes.push(currentNode);
    }
  } else {
    // Numbered steps fallback
    const numberedSteps = lines.filter(l => /^\s*\d+\.\s+/.test(l));
    if (numberedSteps.length > 1) {
       nodes = numberedSteps.map((s, i) => {
         const stripped = s.replace(/^\s*\d+\.\s+/, '').trim();
         return {
           id: `n${i+1}`,
           type: 'rect' as ShapeType,
           label: stripped.substring(0, 50),
           _baseTitle: stripped.toLowerCase(),
           x: 100 + (i * 150),
           y: 100,
           w: 120,
           h: 50
         };
       });
    }
  }

  // Connections
  if (connectionsStartIdx >= 0 && nodes.length > 0) {
     const connEndIdx = sourceIdx > connectionsStartIdx ? sourceIdx : lines.length;
     const connLines = lines.slice(connectionsStartIdx + 1, connEndIdx);
     
     for (const line of connLines) {
       if (line.trim().startsWith('*') && line.includes('->')) {
         const match = line.match(/\*\s*(.*?)\s*->\s*(.*?):(.*)/);
         if (match) {
           const fromStr = match[1].trim().toLowerCase();
           const toStr = match[2].trim().toLowerCase();
           const meta = match[3].toLowerCase();
           
           const fromNode = nodes.find(n => n._baseTitle.includes(fromStr) || fromStr.includes(n._baseTitle) || n.label.toLowerCase().includes(fromStr));
           const toNode = nodes.find(n => n._baseTitle.includes(toStr) || toStr.includes(n._baseTitle) || n.label.toLowerCase().includes(toStr));
           
           if (fromNode && toNode) {
              let style = 'solid';
              if (meta.includes('dashed')) style = 'dashed';
              else if (meta.includes('dotted')) style = 'dotted';
              
              let arrowEnd = true;
              if (meta.includes('không có mũi tên')) arrowEnd = false;
              
              let connLabel = undefined;
              const labelMatch = line.match(/nhãn kết nối:\s*([^,]+)/i);
              if (labelMatch) {
                connLabel = labelMatch[1].trim();
              }
              
              connections.push({
                id: `c${connections.length + 1}`,
                fromId: fromNode.id,
                toId: toNode.id,
                style,
                arrowEnd,
                label: connLabel
              });
           }
         }
       }
     }
  }
  
  if (connections.length === 0 && nodes.length > 1) {
    // Fallback sequential
    connections = nodes.slice(0, -1).map((n, i) => ({
      id: `c${i+1}`,
      fromId: n.id,
      toId: nodes[i+1].id,
      style: 'solid' as const,
      arrowEnd: true
    }));
  }

  // Cleanup baseTitle
  nodes.forEach(n => delete n._baseTitle);

  const diagram: DiagramModel = {
    nodes,
    connections,
    caption: `Sơ đồ ${subType}: ${title}`,
    source: explicitSource
  };

  const id = `rule_diag_${subType}_${getStringHash(text.substring(0, 50) + subType)}`;

  return {
    id,
    sourceSectionId: section.id,
    sourceSectionHeading: section.heading,
    sourceExcerpt: section.rawText.substring(0, 200),
    sourceLineRange: { startLine: section.startLine, endLine: section.endLine },
    sourceText: section.rawText,
    visualType: subType,
    confidence: conf,
    detectionMethod: 'rule',
    source: 'rule',
    finalConfidence: conf,
    title: title,
    rationale: `Phát hiện các từ khóa quy trình và trích xuất từ section ${section.heading || 'diagram'}.`,
    extractedItems: [],
    data: {
      type: 'diagram',
      title: title,
      diagram: diagram
    }
  };
}

function createDiagramCandidateNaive(text: string, subType: string, title: string, conf: number): VisualCandidate {
  // Attempt to extract process steps
  const steps = text.split(/[.;]|\bvà\b/).filter(s => s.length > 10 && s.length < 100).slice(0, 5);
  
  const nodes = steps.map((s, i) => ({
    id: `n${i+1}`,
    type: 'rect' as const,
    label: s.trim().substring(0, 40),
    x: 100 + (i * 150),
    y: 100,
    w: 120,
    h: 50
  }));

  const connections = nodes.slice(0, -1).map((n, i) => ({
    id: `c${i+1}`,
    fromId: n.id,
    toId: nodes[i+1].id,
    style: 'solid' as const,
    arrowEnd: true
  }));

  const diagram: DiagramModel = {
    nodes,
    connections,
    caption: `Sơ đồ ${subType}: ${title} (Phân tích cấu trúc)`
  };

  const id = `rule_diag_${subType}_${getStringHash(text.substring(0, 50) + subType)}`;

  return {
    id,
    sourceText: text.substring(0, 500),
    visualType: subType,
    confidence: conf,
    detectionMethod: 'rule',
    source: 'rule',
    finalConfidence: conf,
    title: title,
    rationale: `Phát hiện các từ khóa quy trình/quan hệ và cấu trúc trình tự.`,
    extractedItems: [],
    data: {
      type: 'diagram',
      title: title,
      diagram: diagram
    }
  };
}

function createTableCandidate(text: string, title: string, conf: number): VisualCandidate {
  // Simple extraction: look for numbers or key-value pairs
  const lines = text.split('\n').filter(l => l.includes(':') || l.match(/\d/));
  
  const rows = lines.slice(0, 5).map(l => {
    const parts = l.split(':');
    return {
      col1: parts[0]?.trim() || 'Hạng mục',
      col2: parts[1]?.trim() || 'Dữ liệu',
      col3: '-'
    };
  });

  const tableModel: TableModel = {
    columns: [
      { key: 'col1', header: 'Tiêu chí', align: 'left' },
      { key: 'col2', header: 'Giá trị', align: 'right' },
      { key: 'col3', header: 'Ghi chú', align: 'left' }
    ],
    rows: rows.length > 0 ? rows : [],
    caption: `Bảng: ${title} (Trích xuất cấu trúc)`
  };

  const id = `rule_table_${getStringHash(text.substring(0, 50))}`;

  return {
    id,
    sourceText: text.substring(0, 500),
    visualType: 'table',
    confidence: conf,
    detectionMethod: 'rule',
    source: 'rule',
    finalConfidence: conf,
    title: title,
    rationale: `Phát hiện dữ liệu có tính chất liệt kê hoặc đối chiếu đa chiều.`,
    extractedItems: [],
    data: {
      type: 'table',
      title: title,
      table: tableModel
    }
  };
}

/**
 * Infers the best alignment for a table column based on header and sample values.
 */
function inferTableColumnAlign(header: string, values: string[]): 'left' | 'center' | 'right' {
  const hLower = header.toLowerCase();
  
  // 1. Explicit unit headers -> center
  if (hLower.match(/^(đvt|đơn vị tính|unit|đơn vị)$/)) return 'center';
  
  // 2. Year/Period/ID headers that are often short -> center
  if (hLower.match(/^(quý|kỳ|mã|ký hiệu|năm)$/) || hLower.match(/^20\d{2}$/)) {
    // Check if values are mostly numeric measures, if so align right
    let numericMeasureCount = 0;
    values.forEach(v => {
      if (isTableNumericValue(v)) numericMeasureCount++;
    });
    if (values.length > 0 && numericMeasureCount / values.length >= 0.8) return 'right';
    return 'center';
  }
  
  // 3. Check values for numeric content
  if (values.length === 0) return 'left';
  
  let numericCount = 0;
  values.forEach(v => {
    if (isTableNumericValue(v)) numericCount++;
  });
  
  // If > 70% are numeric measures, align right
  if (numericCount / values.length >= 0.7) return 'right';
  
  // 4. Default to left
  return 'left';
}
