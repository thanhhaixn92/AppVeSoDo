import { describe, it, expect } from 'vitest';
import { analyzeDocumentWithAIContract } from '../src/analysis/aiAnalysisAdapter';

describe('AI Analysis Contract', () => {
  it('should return AIAnalysisOutput and extract a process diagram', async () => {
    const rawDocumentText = `
1. Chuẩn bị hồ sơ
2. Nộp qua phòng đào tạo
3. Chờ xét duyệt
    `;

    const result = await analyzeDocumentWithAIContract({
      rawDocumentText,
      locale: 'vi'
    });

    expect(result.documentSummary).toBeDefined();
    expect(result.sections.length).toBeGreaterThan(0);
    expect(result.candidates.length).toBeGreaterThan(0);

    const diagramCand = result.candidates.find(c => c.visualType === 'flowchart');
    expect(diagramCand).toBeDefined();
    if (diagramCand && diagramCand.data.diagram) {
      expect(diagramCand.uiStatus).toBe('needs_review');
      expect(diagramCand.data.diagram.nodes.length).toBeGreaterThanOrEqual(2);
      expect(diagramCand.data.diagram.connections.length).toBeGreaterThanOrEqual(1);
      expect(diagramCand.sourceSectionHeading).toBeDefined();
      expect(diagramCand.sourceExcerpt).toBeDefined();
      expect(diagramCand.rationale).toBeDefined();
      expect(diagramCand.confidence).toBeDefined();
    }
  });

  it('should create a fallback candidate if no structured data is found', async () => {
    const rawDocumentText = `Chỉ là một đoạn văn bản bình thường không có quy trình nào cả.`;

    const result = await analyzeDocumentWithAIContract({
      rawDocumentText,
      locale: 'vi'
    });

    expect(result.candidates.length).toBe(1);
    const fallback = result.candidates[0];
    expect(fallback.uiStatus).toBe('needs_mapping');
    expect(fallback.detectionMethod).toBe('ai');
  });

  it('should extract table data', async () => {
    const rawDocumentText = `
Name\tAge\tCity
John\t30\tNew York
Jane\t25\tLondon
    `;

    const result = await analyzeDocumentWithAIContract({
      rawDocumentText,
      locale: 'vi'
    });

    const tableCand = result.candidates.find(c => c.visualType === 'table');
    expect(tableCand).toBeDefined();
    if (tableCand && tableCand.data.table) {
      expect(tableCand.uiStatus).toBe('needs_review');
      expect(tableCand.data.table.columns.length).toBe(3);
      expect(tableCand.data.table.rows.length).toBe(2);
    }
  });
});
