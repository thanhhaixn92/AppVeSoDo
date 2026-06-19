import { describe, it, expect } from 'vitest';
import { escapeLatexText, toLatexIdentifier, generateFigureLatex } from '../src/lib/exportLatex';
import { SavedFigure } from '../src/types';

describe('LaTeX Export Utilities', () => {
  it('escapeLatexText escapes special characters', () => {
    const raw = "This & That, 100%, $5.00, #tag, {braces}, _, ^, ~, \\";
    const escaped = escapeLatexText(raw);
    expect(escaped).toBe("This \\& That, 100\\%, \\$5.00, \\#tag, \\{braces\\}, \\_, \\textasciicircum{}, \\textasciitilde{}, \\textbackslash{}");
  });

  it('escapeLatexText normalizes line breaks', () => {
    const raw = "Line 1\nLine 2\r\nLine 3\rLine 4";
    const escaped = escapeLatexText(raw);
    expect(escaped).toBe("Line 1 Line 2 Line 3 Line 4");
  });

  it('escapeLatexText preserves Vietnamese Unicode', () => {
    const raw = "Biểu đồ phân bổ doanh thu & lợi nhuận %";
    const escaped = escapeLatexText(raw);
    expect(escaped).toBe("Biểu đồ phân bổ doanh thu \\& lợi nhuận \\%");
  });

  it('toLatexIdentifier returns deterministic safe IDs', () => {
    expect(toLatexIdentifier("node-123")).toBe("node-123");
    expect(toLatexIdentifier("My Node 1")).toBe("My-Node-1");
    expect(toLatexIdentifier("a_b@c!d")).toBe("a-b-c-d");
    expect(toLatexIdentifier("", "fallback")).toBe("fallback");
  });

  describe('generateFigureLatex', () => {
    it('generates table with caption and source, without fallback captions', () => {
      const figure: SavedFigure = {
        id: 'f1', type: 'table', title: 'Test Table', theme: '', createdAt: '2023-01-01',
        table: {
          caption: 'Original Caption',
          source: 'Original Source',
          columns: [{ key: 'col1', header: 'H1', align: 'left' as any }, { key: 'col2', header: 'H2', align: 'center' as any }],
          rows: [{ col1: 'V1', col2: 'V2 &' }],
        }
      };
      
      const code = generateFigureLatex({
        figure,
        metadata: {
          captionText: 'Doanh thu thuần',
          numberedCaption: 'Bảng 1. Doanh thu thuần',
          sourceCitation: 'BC 2024',
          isPreview: false
        }
      });
      
      expect(code).toContain('\\begin{tabular}{lc}');
      expect(code).toContain('\\textbf{H1 & H2}');
      expect(code).toContain('V1 & V2 \\&');
      expect(code).toContain('\\caption{Doanh thu thuần}');
      expect(code).toContain('Nguồn: BC 2024');
      expect(code).not.toContain('Bảng 1.'); // Shouldn't double number
      expect(code).not.toContain('Danh sách so sánh số liệu học thuật'); // No fallback
    });

    it('preserves numeric zero and string zero in tables', () => {
      const figure: SavedFigure = {
        id: 'f2', type: 'table', title: 'Zero Test', theme: '', createdAt: '2023-01-01',
        table: {
          caption: '',
          source: '',
          columns: [
            { key: 'colNumZero', header: 'Num', align: 'center' as any },
            { key: 'colStrZero', header: 'Str', align: 'center' as any },
            { key: 'colNull', header: 'Null', align: 'center' as any },
            { key: 'colUndefined', header: 'Undef', align: 'center' as any },
            { key: 'colEmpty', header: 'Empty', align: 'center' as any }
          ],
          rows: [{
            colNumZero: 0 as any,
            colStrZero: "0",
            colNull: null as any,
            colUndefined: undefined as any,
            colEmpty: ""
          }],
        }
      };
      
      const code = generateFigureLatex({
        figure,
        metadata: { captionText: '', isPreview: true, sourceCitation: '' }
      });
      
      expect(code).toContain('0 & 0 &  &  &  \\\\');
    });

    it('generates chart using preview metadata', () => {
      const figure = {
        type: 'chart',
        chart: {
          config: { title: 'C1', xAxisLabel: 'X', yAxisLabel: 'Y' },
          data: [{ label: 'L 1', value: 10 }]
        }
      } as any;

      const code = generateFigureLatex({
        figure,
        metadata: { captionText: 'Tỉ lệ lạm phát', isPreview: true }
      });

      expect(code).toContain('\\caption{Tỉ lệ lạm phát}');
      expect(code).not.toContain('Nguồn:');
      expect(code).toContain('(L 1,10)');
    });

    it('generates diagram with normalized IDs and text escaping', () => {
      const figure = {
        type: 'diagram',
        diagram: {
          nodes: [{ id: 'n!1', label: 'Start & Go', w: 80, h: 40, x: 100, y: 100 }],
          connections: []
        }
      } as any;

      const code = generateFigureLatex({
        figure,
        metadata: { captionText: 'Quy trình', isPreview: true, sourceCitation: '' }
      });

      expect(code).toContain('\\node (n-1)');
      expect(code).toContain('Start \\& Go');
      expect(code).toContain('\\caption{Quy trình}');
      expect(code).not.toContain('Nguồn:');
    });
  });
});
