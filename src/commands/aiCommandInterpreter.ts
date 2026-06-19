import { AICommandResult, SavedFigure, PreviewFigure, EditOperation } from '../types';

export async function interpretCommandByAI(command: string, currentFigure: SavedFigure | PreviewFigure, apiKey: string): Promise<AICommandResult> {
  const figureId = (currentFigure as SavedFigure).id || `preview_${(currentFigure as PreviewFigure).sourceCandidateUid}`;
  
  const result: AICommandResult = {
    intent: 'ai_edit',
    confidence: 0,
    targetFigureId: figureId,
    targetType: currentFigure.type,
    operations: [],
    warnings: [],
    errors: [],
    source: 'ai',
    requiresReview: true
  };

  if (!apiKey) {
    result.errors.push('Yêu cầu cung cấp khóa AI Key để thực hiện lệnh nâng cao.');
    return result;
  }

  try {
    const prevFigContext = {
      id: figureId,
      type: currentFigure.type,
      theme: (currentFigure as SavedFigure).theme || 'classic_academic_bw',
      title: currentFigure.title,
      chart: currentFigure.chart,
      diagram: currentFigure.diagram,
      table: currentFigure.table
    };

    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-key': apiKey
      },
      body: JSON.stringify({
        prompt: command,
        editMode: true,
        currentContext: prevFigContext
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      if (response.status === 401 || errJson.key_required) {
        result.errors.push('Khóa API Key không hợp lệ hoặc đã hết hạn.');
        return result;
      }
      result.errors.push(errJson.error || `HTTP ${response.status}`);
      return result;
    }

    const json = await response.json();
    if (json.ok === false || json.success === false || (!json.ok && !json.success)) {
      result.errors.push(json.message || json.error || 'Lỗi xử lý từ AI Engine.');
      return result;
    }

    const generated = json.data;
    if (!generated) {
      result.errors.push('Lỗi xử lý từ AI Engine: Không có dữ liệu trả về.');
      return result;
    }

    // Reject if AI tries to change figure ID or return invalid schema
    if (!generated.type || (generated.type !== 'chart' && generated.type !== 'diagram' && generated.type !== 'table')) {
      result.errors.push('AI trả về định dạng biểu đồ/sơ đồ không được hỗ trợ.');
      return result;
    }

    const updatedFigure: SavedFigure = {
      ...(currentFigure as SavedFigure),
      title: generated.chart?.config?.title || generated.diagram?.caption || generated.table?.caption || currentFigure.title,
      type: generated.type,
      chart: generated.type === 'chart' ? generated.chart : undefined,
      diagram: generated.type === 'diagram' ? generated.diagram : undefined,
      table: generated.type === 'table' ? generated.table : undefined,
    };

    // Prevent AI from breaking diagram structure
    if (updatedFigure.type === 'diagram' && updatedFigure.diagram) {
      if (!Array.isArray(updatedFigure.diagram.nodes)) updatedFigure.diagram.nodes = [];
      if (!Array.isArray(updatedFigure.diagram.connections)) updatedFigure.diagram.connections = [];
    }

    const op: EditOperation = {
      type: 'update_figure',
      targetFigureId: figureId,
      targetType: currentFigure.type,
      summary: generated.explanation || 'AI đề xuất chỉnh sửa',
      beforeSnapshot: currentFigure as SavedFigure,
      afterSnapshot: updatedFigure,
      validationStatus: 'pending',
      warnings: [],
      errors: []
    };

    result.confidence = 0.8; // High enough to consider, but Reconciler will decide.
    result.operations = [op];
    
    if (json.fallbackUsed) {
      result.warnings.push('AI đang phản hồi chậm, sử dụng cấu hình dự phòng.');
    }

    return result;

  } catch (error: any) {
    result.errors.push(`Lỗi kết nối AI: ${error.message}`);
    return result;
  }
}
