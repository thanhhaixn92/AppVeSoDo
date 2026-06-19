export interface DocumentBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'table';
  text?: string;
  level?: number;
  tableData?: {
    headers: string[];
    rows: string[][];
  };
}

export function parseTextToBlocks(text: string): DocumentBlock[] {
  if (!text) return [];
  const lines = text.split('\n');
  const blocks: DocumentBlock[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (line === '') {
      i++;
      continue;
    }
    
    // 1. Identify Headings
    if (line.startsWith('#')) {
      const levelMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (levelMatch) {
        blocks.push({
          id: `block-${Math.random().toString(36).substring(2, 11)}`,
          type: 'heading',
          level: levelMatch[1].length,
          text: levelMatch[2].trim(),
        });
        i++;
        continue;
      }
    }
    
    // 2. Identify Tables
    if (line.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      
      if (tableLines.length >= 1) {
        const parseTableRow = (rowStr: string) => {
          const parts = rowStr.replace(/^\|/, '').replace(/\|$/, '').split('|');
          return parts.map(p => p.trim());
        };
        
        const rawHeader = tableLines[0];
        const headers = parseTableRow(rawHeader);
        
        let startRowIndex = 1;
        if (tableLines[1] && tableLines[1].includes('---')) {
          startRowIndex = 2;
        }
        
        const rows: string[][] = [];
        for (let r = startRowIndex; r < tableLines.length; r++) {
          const parsedColumns = parseTableRow(tableLines[r]);
          while (parsedColumns.length < headers.length) {
            parsedColumns.push('');
          }
          rows.push(parsedColumns.slice(0, headers.length));
        }
        
        blocks.push({
          id: `block-${Math.random().toString(36).substring(2, 11)}`,
          type: 'table',
          tableData: {
            headers,
            rows
          }
        });
        continue;
      }
    }
    
    // 3. Identify List Items
    if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s+/.test(line)) {
      const textContent = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
      blocks.push({
        id: `block-${Math.random().toString(36).substring(2, 11)}`,
        type: 'list',
        text: textContent
      });
      i++;
      continue;
    }
    
    // 4. Default to Paragraph
    blocks.push({
      id: `block-${Math.random().toString(36).substring(2, 11)}`,
      type: 'paragraph',
      text: line
    });
    i++;
  }
  
  return blocks;
}

export function blocksToText(blocks: DocumentBlock[]): string {
  return blocks.map(block => {
    switch (block.type) {
      case 'heading': {
        const prefix = '#'.repeat(block.level || 2);
        return `${prefix} ${block.text}`;
      }
      case 'table': {
        if (!block.tableData) return '';
        const { headers, rows } = block.tableData;
        const headerRow = `| ${headers.join(' | ')} |`;
        const spacerRow = `| ${headers.map(() => '---').join(' | ')} |`;
        const dataRows = rows.map(r => `| ${r.join(' | ')} |`).join('\n');
        return `${headerRow}\n${spacerRow}\n${dataRows}`;
      }
      case 'list': {
        return `- ${block.text}`;
      }
      case 'paragraph':
      default: {
        return block.text || '';
      }
    }
  }).join('\n\n');
}

export function parseHtmlToBlocks(html: string, plainTextFallback: string): DocumentBlock[] {
  const cleanHtml = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|td|th|tr|table)>/gi, '</$1>\n');

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanHtml, "text/html");
  const blocks: DocumentBlock[] = [];
  
  const extractTable = (tableEl: HTMLTableElement): DocumentBlock | null => {
    const rows = Array.from(tableEl.rows);
    if (rows.length === 0) return null;
    
    let headers: string[] = [];
    const plainRows: string[][] = [];
    
    const firstRowCells = Array.from(rows[0].cells);
    const hasHeaderTag = rows[0].querySelector('th') !== null;
    
    if (hasHeaderTag) {
      headers = firstRowCells.map(c => (c.innerText || c.textContent || '').trim() || 'Cột');
    } else {
      headers = firstRowCells.map((c, idx) => (c.innerText || c.textContent || '').trim() || `Cột ${idx + 1}`);
    }
    
    const startIdx = hasHeaderTag ? 1 : 0;
    
    // Check if first row was actually parsed as headers
    const rStart = (startIdx === 1 && rows.length > 1) ? 1 : 0;
    const finalHeaders = rStart === 0 ? firstRowCells.map((_, idx) => `Cột ${idx + 1}`) : headers;
    const dataStart = rStart === 0 ? 0 : 1;
    
    for (let r = dataStart; r < rows.length; r++) {
      const cells = Array.from(rows[r].cells).map(c => (c.innerText || c.textContent || '').replace(/\s+/g, ' ').trim());
      while (cells.length < finalHeaders.length) {
        cells.push('');
      }
      plainRows.push(cells.slice(0, finalHeaders.length));
    }
    
    return {
      id: `block-${Math.random().toString(36).substring(2, 11)}`,
      type: 'table',
      tableData: {
        headers: finalHeaders,
        rows: plainRows
      }
    };
  };

  const processNode = (node: Node) => {
    if (node.nodeName === "TABLE") {
      const tb = extractTable(node as HTMLTableElement);
      if (tb) blocks.push(tb);
    } else if (node.nodeName === "H1" || node.nodeName === "H2" || node.nodeName === "H3" || node.nodeName === "H4" || node.nodeName === "H5" || node.nodeName === "H6") {
      const level = parseInt(node.nodeName.substring(1)) || 2;
      const text = ((node as HTMLElement).innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
      if (text) {
        blocks.push({
          id: `block-${Math.random().toString(36).substring(2, 11)}`,
          type: 'heading',
          level,
          text
        });
      }
    } else if (node.nodeName === "P" || node.nodeName === "DIV") {
      if ((node as HTMLElement).querySelector('table')) {
        node.childNodes.forEach(processNode);
      } else {
        const text = ((node as HTMLElement).innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
        if (text) {
          blocks.push({
            id: `block-${Math.random().toString(36).substring(2, 11)}`,
            type: 'paragraph',
            text
          });
        }
      }
    } else if (node.nodeName === "LI") {
      const text = ((node as HTMLElement).innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
      if (text) {
        blocks.push({
          id: `block-${Math.random().toString(36).substring(2, 11)}`,
          type: 'list',
          text
        });
      }
    } else {
      if (node.childNodes.length > 0) {
        node.childNodes.forEach(processNode);
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        const text = node.textContent.trim();
        if (text) {
          blocks.push({
            id: `block-${Math.random().toString(36).substring(2, 11)}`,
            type: 'paragraph',
            text
          });
        }
      }
    }
  };

  doc.body.childNodes.forEach(processNode);
  
  if (blocks.length === 0 && plainTextFallback.trim()) {
    return parseTextToBlocks(plainTextFallback);
  }
  return blocks;
}

export interface DocumentSection {
  id: string;
  heading: string;
  normalizedHeading: string;
  romanNumeral?: string;
  rawText: string;
  bodyText: string;
  startLine: number;
  endLine: number;
  sourceRange?: { start: number; end: number };
  semanticHints: Array<'table' | 'chart' | 'diagram' | 'notes'>;
}

function computeSemanticHints(text: string): Array<'table' | 'chart' | 'diagram' | 'notes'> {
  const hints: Array<'table' | 'chart' | 'diagram' | 'notes'> = [];
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('bảng') || lowerText.includes('số liệu') || text.includes('---') || lowerText.includes('tỷ đồng') || lowerText.includes('vnd')) {
    hints.push('table');
  }
  if (lowerText.includes('biểu đồ') || lowerText.includes('dữ liệu biểu đồ') || lowerText.includes('xu hướng')) {
    hints.push('chart');
  }
  if (lowerText.includes('sơ đồ') || lowerText.includes('quy trình') || lowerText.includes('các bước trong sơ đồ') || lowerText.includes('các kết nối sơ đồ')) {
    hints.push('diagram');
  }
  if (lowerText.includes('ghi chú')) {
    hints.push('notes');
  }
  return hints;
}

export function parseDocumentSections(text: string): DocumentSection[] {
  if (!text.trim()) return [];

  const lines = text.split(/\r?\n/);
  const sections: DocumentSection[] = [];
  
  // Roman numeral regex matching exact line start like "I. " or "III."
  const romanHeadingRegex = /^(I{1,3}|IV|V|VI{1,3}|IX|X)\.\s+(.*)/i;
  
  let currentSection: Partial<DocumentSection> | null = null;
  let currentLines: string[] = [];
  let currentBodyLines: string[] = [];
  let currentStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(romanHeadingRegex);

    if (match) {
      // Push previous section if any
      if (currentSection) {
        currentSection.rawText = currentLines.join('\n');
        currentSection.bodyText = currentBodyLines.join('\n');
        currentSection.endLine = i - 1;
        currentSection.semanticHints = computeSemanticHints(currentSection.rawText);
        sections.push(currentSection as DocumentSection);
      }

      const romanNumeral = match[1].toUpperCase();
      const rawHeading = line.trim();
      const normalizedHeading = rawHeading.toLowerCase();

      // Ensure stable id by hashing romanNumeral + normalized heading
      const idStr = `${romanNumeral}-${normalizedHeading.replace(/[^a-z0-9]/g, '-')}`;

      currentSection = {
        id: `sec-${idStr}`,
        heading: rawHeading,
        normalizedHeading,
        romanNumeral,
        startLine: i,
        // Will be updated:
        rawText: '',
        bodyText: '',
        endLine: i,
        semanticHints: [],
      };
      currentLines = [line];
      currentBodyLines = [];
    } else {
      if (!currentSection) {
        // Fallback catch-all section for leading text before the first roman heading
        currentSection = {
          id: `sec-fallback`,
          heading: '',
          normalizedHeading: '',
          startLine: i,
        };
      }
      currentLines.push(line);
      if (currentSection.heading) {
         currentBodyLines.push(line);
      } else {
         currentBodyLines.push(line);
      }
    }
  }

  if (currentSection) {
    currentSection.rawText = currentLines.join('\n');
    currentSection.bodyText = currentBodyLines.join('\n');
    currentSection.endLine = lines.length - 1;
    currentSection.semanticHints = computeSemanticHints(currentSection.rawText);
    sections.push(currentSection as DocumentSection);
  }

  return sections;
}

