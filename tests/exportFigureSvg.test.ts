import { describe, it, expect, beforeAll } from 'vitest';
import { buildAcademicExportSvg, buildPngExportSvgWithFooter } from '../src/lib/exportFigureSvg';

describe('SVG Export Composition Utilities', () => {
  const mockSvgElement = {
    viewBox: { baseVal: { width: 400, height: 300 } },
    ownerDocument: {
      createElementNS: () => ({ setAttribute: () => {} })
    }
  } as unknown as SVGSVGElement;

  // Mock XMLSerializer for testing Node environment
  beforeAll(() => {
    (global as any).XMLSerializer = class XMLSerializer {
      serializeToString() {
        return '<svg id="mock"><rect width="100" /></svg>';
      }
    };
  });

  it('buildAcademicExportSvg returns valid root <svg>', () => {
    const result = buildAcademicExportSvg({
      svgElement: mockSvgElement,
      metadata: { captionText: 'Clean', isPreview: true }
    });
    expect(result).toMatch(/^<svg.*xmlns="http:\/\/www.w3.org\/2000\/svg">/);
    expect(result).toContain('</svg>');
  });

  it('buildAcademicExportSvg includes saved numbered caption', () => {
    const result = buildAcademicExportSvg({
      svgElement: mockSvgElement,
      metadata: { captionText: 'Clean', numberedCaption: 'Biểu đồ 1. Clean caption', isPreview: false }
    });
    expect(result).toContain('Biểu đồ 1. Clean caption');
  });

  it('buildAcademicExportSvg includes source only when present', () => {
    let result = buildAcademicExportSvg({
      svgElement: mockSvgElement,
      metadata: { captionText: 'Clean', sourceCitation: 'Nguồn: BC 2024', isPreview: false }
    });
    expect(result).toContain('Nguồn: BC 2024');

    result = buildAcademicExportSvg({
      svgElement: mockSvgElement,
      metadata: { captionText: 'Clean', isPreview: true }
    });
    expect(result).not.toContain('Nguồn:');
  });

  it('buildAcademicExportSvg XML-escapes special characters', () => {
    const result = buildAcademicExportSvg({
      svgElement: mockSvgElement,
      metadata: { captionText: 'Tỉ lệ < 5% & > 2%', isPreview: true, sourceCitation: 'Nguồn: A & B "Trích"' }
    });
    expect(result).toContain('Tỉ lệ &lt; 5% &amp; &gt; 2%');
    expect(result).toContain('Nguồn: A &amp; B &quot;Trích&quot;');
  });

  it('buildAcademicExportSvg increases height/viewBox for footer', () => {
    const result = buildAcademicExportSvg({
      svgElement: mockSvgElement,
      metadata: { captionText: 'Line 1\nLine 2\nLine 3', isPreview: true }
    });
    const parsed = result.match(/height="(\d+)"/);
    expect(parsed).not.toBeNull();
    const height = parseInt(parsed![1], 10);
    expect(height).toBeGreaterThan(300); // Original is 300
  });

  it('buildAcademicExportSvg preserves core SVG content', () => {
    const result = buildAcademicExportSvg({
      svgElement: mockSvgElement,
      metadata: { captionText: 'Clean', isPreview: true }
    });
    expect(result).toContain('<svg id="mock"><rect width="100" /></svg>');
  });

  it('buildPngExportSvgWithFooter remains compatible', () => {
    const result1 = buildPngExportSvgWithFooter({
      svgElement: mockSvgElement,
      metadata: { captionText: 'Title', isPreview: true },
    });
    const result2 = buildAcademicExportSvg({
      svgElement: mockSvgElement,
      metadata: { captionText: 'Title', isPreview: true },
      options: { maxLineLength: 100 }
    });
    expect(result1).toEqual(result2);
  });
});

import { splitSvgTextIntoLines, sanitizeSvgId } from '../src/components/FigureRenderer';
import { getExportSupport } from '../src/lib/workflowUtils';

describe('FigureRenderer SVG helpers', () => {
  it('splitSvgTextIntoLines splits correctly according to max limits', () => {
    const text = "A very long text that should be split into multiple lines";
    const lines = splitSvgTextIntoLines(text, { maxWidth: 100, maxLines: 3, fontSize: 10, avgCharWidthFactor: 0.6 });
    // 100 / (10 * 0.6) = 16 chars per line max.
    // "A very long text" = 16 chars.
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0].length).toBeLessThanOrEqual(16);
  });

  it('splitSvgTextIntoLines normalizes explicit newlines', () => {
    const text = "Line 1\nLine 2\r\nLine 3";
    const lines = splitSvgTextIntoLines(text, { maxWidth: 1000, maxLines: 10, fontSize: 10 });
    expect(lines.length).toBe(3);
    expect(lines[0]).toBe("Line 1");
  });

  it('sanitizeSvgId creates deterministic safe ids', () => {
    expect(sanitizeSvgId('my bad id @#$')).toBe('my-bad-id----');
    expect(sanitizeSvgId('good-id-123')).toBe('good-id-123');
  });

  describe('getExportSupport', () => {
    it('enables diagram SVG', () => {
      expect(getExportSupport({ type: 'diagram' } as any, 'svg').supported).toBe(true);
    });
    it('keeps chart SVG enabled', () => {
      expect(getExportSupport({ type: 'chart' } as any, 'svg').supported).toBe(true);
    });
    it('keeps table SVG disabled', () => {
      expect(getExportSupport({ type: 'table' } as any, 'svg').supported).toBe(false);
    });
    it('keeps TikZ disabled', () => {
      expect(getExportSupport({ type: 'chart' } as any, 'tikz').supported).toBe(false);
      expect(getExportSupport({ type: 'diagram' } as any, 'tikz').supported).toBe(false);
    });
  });
});

