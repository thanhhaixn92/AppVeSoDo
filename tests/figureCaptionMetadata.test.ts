import { describe, it, expect, beforeAll } from 'vitest';
import { 
  getFigureCaptionKind, 
  getFigureCaptionLabel, 
  stripLegacyCaptionPrefix, 
  extractExplicitSourceCitation, 
  buildFigureNumberingMap,
  formatNumberedCaption,
  resolveFigureExportMetadata,
  escapeHtmlText,
  buildPdfAcademicFooterHtml
} from '../src/lib/figureCaptionMetadata';
import { buildPngExportSvgWithFooter, escapeXml } from '../src/lib/exportFigureSvg';
import { SavedFigure } from '../src/types';

describe('Figure Caption Metadata Utilities', () => {

  it('stripLegacyCaptionPrefix removes different forms of hardcoded numbering', () => {
    expect(stripLegacyCaptionPrefix('Biểu đồ 1. So sánh doanh thu')).toBe('So sánh doanh thu');
    expect(stripLegacyCaptionPrefix('Bảng 1. Kế hoạch 2026–2030')).toBe('Kế hoạch 2026–2030');
    expect(stripLegacyCaptionPrefix('Hình 2: Quy trình xử lý')).toBe('Quy trình xử lý');
    expect(stripLegacyCaptionPrefix('Bảng: Dữ liệu mẫu')).toBe('Dữ liệu mẫu');
    expect(stripLegacyCaptionPrefix('Biểu đồ: Xu hướng năm 2030')).toBe('Xu hướng năm 2030');
    expect(stripLegacyCaptionPrefix('Biểu đồ   2   :   Something')).toBe('Something');
    
    // Should not strip natural occurrences inside text
    expect(stripLegacyCaptionPrefix('Trong bảng 1 có dữ liệu')).toBe('Trong bảng 1 có dữ liệu');
  });

  it('extractExplicitSourceCitation extracts line starting with Nguồn:', () => {
    expect(extractExplicitSourceCitation('Nội dung\r\nNguồn: Bộ dữ liệu giả lập\r\nFooter info')).toBe('Bộ dữ liệu giả lập');
    expect(extractExplicitSourceCitation('Nguồn:   ')).toBe(undefined);
    expect(extractExplicitSourceCitation('Dữ liệu này có nguồn từ ABC')).toBe(undefined);
    expect(extractExplicitSourceCitation('')).toBe(undefined);
  });

  it('getFigureCaptionKind maps types correctly', () => {
    expect(getFigureCaptionKind({ type: 'table' })).toBe('table');
    expect(getFigureCaptionKind('chart')).toBe('chart');
    expect(getFigureCaptionKind({ figureType: 'diagram' })).toBe('diagram');
  });

  it('getFigureCaptionLabel maps kind correctly', () => {
    expect(getFigureCaptionLabel('table')).toBe('Bảng');
    expect(getFigureCaptionLabel('chart')).toBe('Biểu đồ');
    expect(getFigureCaptionLabel('diagram')).toBe('Hình');
  });

  it('buildFigureNumberingMap numbers figures sequentially per kind', () => {
    const list: Partial<SavedFigure>[] = [
      { id: 'f1', type: 'chart' },
      { id: 'f2', type: 'chart' },
      { id: 'f3', type: 'table' },
      { id: 'f4', type: 'diagram' },
      { id: 'f5', type: 'table' },
    ];
    const map = buildFigureNumberingMap(list as SavedFigure[]);
    expect(map['f1'].ordinal).toBe(1);
    expect(map['f1'].label).toBe('Biểu đồ');
    
    expect(map['f2'].ordinal).toBe(2);
    expect(map['f2'].label).toBe('Biểu đồ');
    
    expect(map['f3'].ordinal).toBe(1);
    expect(map['f3'].label).toBe('Bảng');
    
    expect(map['f4'].ordinal).toBe(1);
    expect(map['f4'].label).toBe('Hình');
    
    expect(map['f5'].ordinal).toBe(2);
    expect(map['f5'].label).toBe('Bảng');
  });

  it('formatNumberedCaption builds final string correctly', () => {
    expect(formatNumberedCaption('Biểu đồ', 2, 'Biểu đồ 1. Doanh thu')).toBe('Biểu đồ 2. Doanh thu');
    expect(formatNumberedCaption('Bảng', 1, 'Kế hoạch')).toBe('Bảng 1. Kế hoạch');
  });

  it('resolveFigureExportMetadata resolves metadata for saved figure', () => {
    const tableFigure = {
      type: 'table',
      table: { caption: 'Bảng 1. Doanh thu', source: 'BC 2024' }
    };
    const res = resolveFigureExportMetadata({
      figure: tableFigure,
      numberingEntry: { label: 'Bảng', ordinal: 2 },
      isPreview: false
    });
    expect(res.captionText).toBe('Doanh thu');
    expect(res.numberedCaption).toBe('Bảng 2. Doanh thu');
    expect(res.sourceCitation).toBe('BC 2024');
    expect(res.isPreview).toBe(false);
  });

  it('resolveFigureExportMetadata resolves metadata for preview figure', () => {
    const chartFigure = {
      type: 'chart',
      chart: { config: { caption: 'So sánh' } }
    };
    const res = resolveFigureExportMetadata({
      figure: chartFigure,
      isPreview: true
    });
    expect(res.captionText).toBe('So sánh');
    expect(res.numberedCaption).toBe(undefined);
    expect(res.sourceCitation).toBe(undefined);
    expect(res.isPreview).toBe(true);
  });
  it('escapeHtmlText escapes dangerous characters', () => {
    expect(escapeHtmlText('<b>Doanh thu & lợi nhuận</b>')).toBe('&lt;b&gt;Doanh thu &amp; lợi nhuận&lt;/b&gt;');
  });

  it('buildPdfAcademicFooterHtml includes numbered caption and source correctly', () => {
    const html = buildPdfAcademicFooterHtml({
      captionText: 'Doanh thu',
      numberedCaption: 'Biểu đồ 1. Doanh thu',
      sourceCitation: 'BC 2024',
      isPreview: false
    });
    expect(html).toContain('Biểu đồ 1. Doanh thu');
    expect(html).toContain('Nguồn: BC 2024');
  });

  it('buildPdfAcademicFooterHtml omits source when missing', () => {
    const html = buildPdfAcademicFooterHtml({
      captionText: 'Doanh thu',
      numberedCaption: 'Biểu đồ 1. Doanh thu',
      isPreview: false
    });
    expect(html).toContain('Biểu đồ 1. Doanh thu');
    expect(html).not.toContain('Nguồn:');
  });

  it('buildPdfAcademicFooterHtml uses unnumbered caption for preview', () => {
    const html = buildPdfAcademicFooterHtml({
      captionText: 'Doanh thu',
      numberedCaption: 'Biểu đồ 1. Doanh thu',
      isPreview: true
    });
    expect(html).toContain('Doanh thu');
    expect(html).not.toContain('Biểu đồ 1.');
  });
});

describe('Export Composition Utilities', () => {
  it('escapeXml escapes dangerous characters', () => {
    expect(escapeXml('<script>alert("hi") & \'bye\'</script>')).toBe('&lt;script&gt;alert(&quot;hi&quot;) &amp; &apos;bye&apos;&lt;/script&gt;');
  });

  const mockSvgElement = {
    viewBox: { baseVal: { width: 400, height: 300 } },
    ownerDocument: {
      createElementNS: () => ({ setAttribute: () => {} })
    }
  } as unknown as SVGSVGElement;

  // Mock XMLSerializer for testing Node environment
  beforeAll(() => {
    global.XMLSerializer = class XMLSerializer {
      serializeToString() {
        return '<svg id="mock"><rect width="100" /></svg>';
      }
    } as any;
  });

  it('buildPngExportSvgWithFooter increases height and includes text', () => {
    const result = buildPngExportSvgWithFooter({
      svgElement: mockSvgElement,
      metadata: { captionText: 'Clean caption', numberedCaption: 'Biểu đồ 1. Clean caption', sourceCitation: 'BC 2024', isPreview: false },
      title: 'Biểu đồ'
    });
    // Check height expansion
    expect(result).toContain('<svg width="400" height="432"');
    // Check included texts
    expect(result).toContain('Biểu đồ 1. Clean caption');
    expect(result).toContain('BC 2024');
    expect(result).toContain('Nguồn: BC 2024');
  });

  it('buildPngExportSvgWithFooter omits source when missing', () => {
    const result = buildPngExportSvgWithFooter({
      svgElement: mockSvgElement,
      metadata: { captionText: 'Clean', isPreview: true },
    });
    expect(result).not.toContain('Nguồn:');
  });

  it('buildPngExportSvgWithFooter escapes XML characters', () => {
    const result = buildPngExportSvgWithFooter({
      svgElement: mockSvgElement,
      metadata: { captionText: 'Caption < 5', isPreview: true, sourceCitation: 'A & B' },
    });
    expect(result).toContain('Caption &lt; 5');
    expect(result).toContain('A &amp; B');
  });
});
