import { AIAnalysisInput, AIAnalysisOutput, AISectionSummary } from "./aiAnalysisContract";
import { VisualCandidate, DiagramNode, DiagramConnection, ChartDataPoint, TableModel, TableColumn } from "../types";

function extractProcessDiagram(text: string): VisualCandidate | null {
  const steps: string[] = text.match(/([0-9]+\.\s+.*?(?=\n[0-9]+\.|$))/gs) || [];
  if (steps.length < 2) return null;

  const nodes: DiagramNode[] = [];
  const connections: DiagramConnection[] = [];

  steps.forEach((step, index) => {
    const id = `node-${index + 1}`;
    nodes.push({
      id,
      label: step.substring(0, 50) + "...",
      type: "rect",
      w: 150,
      h: 60,
      x: 100,
      y: 100 + index * 100,
    });

    if (index > 0) {
      connections.push({
        id: `edge-${index}`,
        fromId: `node-${index}`,
        toId: id,
        label: "Next",
        style: "solid",
        arrowEnd: true
      });
    }
  });

  return {
    id: `ai-process-${Date.now()}`,
    sourceText: text,
    title: "AI Process Flow",
    visualType: "flowchart",
    confidence: 0.9,
    detectionMethod: "ai",
    source: "ai",
    finalConfidence: 0.9,
    rationale: "Detected numbered steps indicating a process.",
    extractedItems: steps,
    uiStatus: "needs_review",
    figureType: "diagram",
    sourceSectionHeading: "Quy trình",
    sourceExcerpt: steps[0].substring(0, 50),
    data: {
      type: "diagram",
      title: "Generated Process Flow",
      diagram: {
        nodes,
        connections,
        caption: "Ai Generated Diagram"
      },
    },
  };
}

function extractChart(text: string): VisualCandidate | null {
  const lines = text.split('\n');
  const data: ChartDataPoint[] = [];
  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length >= 2) {
      const numMatch = parts[1].match(/[0-9.,]+/);
      if (numMatch) {
         data.push({
           label: parts[0],
           value: parseFloat(numMatch[0].replace(/,/g, '.'))
         });
      }
    }
  }

  if (data.length < 2) return null;

  return {
    id: `ai-chart-${Date.now()}`,
    sourceText: text,
    title: "Biểu đồ AI gợi ý — cần dữ liệu",
    visualType: "bar_chart",
    confidence: 0.85,
    detectionMethod: "ai",
    source: "ai",
    finalConfidence: 0.85,
    rationale: "Detected labeled numeric data suitable for a chart.",
    extractedItems: data.map(d => d.label),
    uiStatus: "needs_review",
    figureType: "chart",
    sourceSectionHeading: "Thống kê",
    sourceExcerpt: data[0].label + "...",
    data: {
      type: "chart",
      title: "Biểu đồ AI gợi ý — cần dữ liệu",
      chart: {
        config: {
          type: "bar",
          title: "Biểu đồ AI gợi ý — cần dữ liệu",
          xAxisLabel: "Categories",
          yAxisLabel: "Values",
          showGrid: true,
          isDoubleColumn: false,
          caption: "Biểu đồ AI gợi ý — cần dữ liệu"
        },
        data
      },
    },
  };
}

function extractTable(text: string): VisualCandidate | null {
    const lines = text.split('\n');
    let rowsCount = 0;
    let maxCols = 0;
    const tableData: TableModel = {
        columns: [],
        rows: [],
        caption: "AI Summary Table"
    };
    
    let isFirstLine = true;
    for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 2) {
            rowsCount++;
            maxCols = Math.max(maxCols, parts.length);
            if (isFirstLine) {
                tableData.columns = parts.map((p, i) => ({
                    key: `col-${i}`,
                    header: p,
                    align: 'left' as const
                }));
                isFirstLine = false;
            } else {
                const rowData: Record<string, string> = {};
                parts.forEach((p, i) => {
                   rowData[`col-${i}`] = p; 
                });
                tableData.rows.push(rowData);
            }
        }
    }

    if (rowsCount >= 2 && maxCols >= 2) {
        return {
            id: `ai-table-${Date.now()}`,
            sourceText: text,
            title: "AI Summary Table",
            visualType: "table",
            confidence: 0.9,
            detectionMethod: "ai",
            source: "ai",
            finalConfidence: 0.9,
            rationale: "Detected tab-separated columns indicating tabular data.",
            extractedItems: [],
            uiStatus: "needs_review",
            figureType: "table",
            sourceSectionHeading: "Data Table",
            sourceExcerpt: "...",
            data: {
              type: "table",
              title: "Generated Summary Table",
              table: tableData,
            },
        };
    }
    return null;
}


export async function analyzeDocumentWithAIContract(
  input: AIAnalysisInput
): Promise<AIAnalysisOutput> {
  const text = input.rawDocumentText;
  const candidates: VisualCandidate[] = [];

  const diagramCand = extractProcessDiagram(text);
  if (diagramCand) candidates.push(diagramCand);

  const chartCand = extractChart(text);
  if (chartCand) candidates.push(chartCand);

  const tableCand = extractTable(text);
  if (tableCand) candidates.push(tableCand);


  if (candidates.length === 0 && text.trim().length > 0) {
      // Create a fallback candidate
      candidates.push({
        id: `ai-fallback-${Date.now()}`,
        sourceText: text,
        title: "Đề xuất cần ánh xạ dữ liệu",
        visualType: "flowchart", // Or something generic
        confidence: 0.5,
        detectionMethod: "ai",
        source: "ai",
        finalConfidence: 0.5,
        rationale: "AI phát hiện khả năng trực quan hóa, nhưng cần ánh xạ dữ liệu trước khi dùng.",
        extractedItems: [],
        uiStatus: "needs_mapping",
        figureType: "diagram",
        data: {
          type: "diagram",
          title: "Cần ánh xạ dữ liệu",
          diagram: { nodes: [], connections: [], caption: "" }
        }
      });
  }

  const sections: AISectionSummary[] = [
    {
      id: "sec-1",
      heading: "Tóm tắt tự động",
      summary: "Simulated summary of the text.",
      sourceExcerpt: text.substring(0, 100),
      semanticHints: ["diagram", "table", "chart"],
      confidence: 0.9,
    }
  ];

  return {
    documentSummary: "Extracted elements from the document.",
    sections,
    candidates,
    warnings: [],
  };
}
