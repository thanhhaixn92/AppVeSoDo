/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedFigure, PreviewFigure, DiagramNode, DiagramConnection, ShapeType, LineStyle, AcademicTheme, ChartDataPoint, TableColumn } from './types';
import { getStringHash } from './academicArchitecture';

export interface ClarificationOption {
  label: string;
  command: string;
}

export interface ProcessorResult {
  handled: boolean;
  updatedFigure?: SavedFigure | PreviewFigure;
  newTheme?: AcademicTheme;
  description: string;
  clarification?: {
    question: string;
    options: ClarificationOption[];
  };
  triggerAction?: 'export_svg' | 'copy_latex' | 'super_optimize' | 'undo' | 'redo' | 'set_api_key' | 'reset_demo';
}

// Map Vietnamese color words to hex codes
export const VIETNAMESE_COLORS: Record<string, string> = {
  'đỏ': '#dc2626',
  'xanh lam': '#2563eb',
  'xanh nước biển': '#2563eb',
  'xanh': '#2563eb',
  'xanh lá': '#16a34a',
  'xanh lá cây': '#16a34a',
  'vàng': '#ca8a04',
  'tím': '#7c3aed',
  'cam': '#ea580c',
  'trắng': '#ffffff',
  'đen': '#0f172a',
  'xám': '#6b7280',
};

export function processCommand(commandText: string, currentFigure: SavedFigure | PreviewFigure, selectedId?: string | null): ProcessorResult {
  if (!currentFigure || !currentFigure.type) {
    return {
      handled: true,
      description: 'Lỗi: Vui lòng chọn hoặc tạo hình vẽ trước khi thực hiện hiệu chỉnh.'
    };
  }

  const normalizedText = commandText.normalize('NFC');
  const cmd = normalizedText.trim().toLowerCase();

  const isDiagCommand = /(?:node|bước|khối|kết nối|mũi tên|nối|nhân bản)/i.test(cmd);
  const isChartCommand = /(?:điểm|mẫu|data|đối tượng|giá trị|biểu đồ)/i.test(cmd) && !/(?:quy trình|tiến trình)/i.test(cmd);
  const isTableCommand = /(?:cột|hàng|dòng|record|bảng)/i.test(cmd);

  if (isDiagCommand && currentFigure.type !== 'diagram') {
    return {
      handled: true,
      description: `Lỗi: Lệnh liên quan đến sơ đồ (diagram) không thể áp dụng cho hình vẽ loại "${currentFigure.type}".`
    };
  }

  if (isChartCommand && currentFigure.type !== 'chart') {
    return {
      handled: true,
      description: `Lỗi: Lệnh liên quan đến biểu đồ (chart) không thể áp dụng cho hình vẽ loại "${currentFigure.type}".`
    };
  }

  if (isTableCommand && currentFigure.type !== 'table') {
    return {
      handled: true,
      description: `Lỗi: Lệnh liên quan đến bảng (table) không thể áp dụng cho hình vẽ loại "${currentFigure.type}".`
    };
  }

  const NATURAL_SIZE_DELTA: Record<string, number> = {
    "một tí": 4,
    "1 tí": 4,
    "hơi": 6,
    "một chút": 8,
    "chút": 8,
    "rõ hơn": 12,
    "nhiều hơn": 20,
    "rất nhiều": 32
  };

  // Find delta
  let delta = 8;
  for (const [key, val] of Object.entries(NATURAL_SIZE_DELTA)) {
    if (cmd.includes(key)) {
      delta = val;
      break;
    }
  }

  // Identify target object ID in diagram commands
  let targetNodeId: string | null = null;
  let targetConnId: string | null = null;

  // Try to extract from the command string first
  const nodeMatch = cmd.match(/(?:n00\d|n\d+|t00\d|t\d+|g00\d|g\d+)/i);
  if (nodeMatch) {
    const extractedId = nodeMatch[0].toUpperCase();
    if (extractedId.startsWith('N') && extractedId.length <= 4) {
      targetNodeId = extractedId;
    } else if (extractedId.startsWith('T') && extractedId.length <= 4) {
      targetNodeId = extractedId;
    } else {
      const num = parseInt(extractedId.replace(/[^\d]/g, ''));
      if (!isNaN(num)) targetNodeId = `N00${num}`;
    }
  }

  const connMatch = cmd.match(/(?:l00\d|l\d+|c\w+)/i);
  if (connMatch) {
    const extractedId = connMatch[0].toUpperCase();
    if (extractedId.startsWith('L') && extractedId.length <= 4) {
      targetConnId = extractedId;
    } else {
      const num = parseInt(extractedId.replace(/[^\d]/g, ''));
      if (!isNaN(num)) targetConnId = `L00${num}`;
    }
  }

  // Fallback to selectedId if no ID was mentioned in text
  if (!targetNodeId && !targetConnId && selectedId) {
    if (selectedId.toUpperCase().startsWith('N') || selectedId.toUpperCase().startsWith('T')) {
      targetNodeId = selectedId;
    } else if (selectedId.toUpperCase().startsWith('L') || selectedId.toUpperCase().startsWith('C')) {
      targetConnId = selectedId;
    }
  }

  // Identify if any of the command categories are requested
  const isSizeCommand = /(?:to hơn|to lên|lớn hơn|tăng kích thước|to thêm|nhỏ lại|nhỏ đi|bé lại|giảm kích thước|chiều rộng|chiều cao|rộng hơn|hẹp hơn|thấp lại|cao hơn)/i.test(cmd);
  const isPosCommand = /(?:dịch lên|di chuyển lên|dịch xuống|di chuyển xuống|sang trái|qua trái|dịch sang trái|sang phải|qua phải|dịch sang phải|căn giữa|căn đều|lên trên|xuống dưới)/i.test(cmd);
  const isFontCommand = /(?:chữ|size chữ|in đậm|bôi đậm|chữ thường|bỏ in đậm|rút gọn)/i.test(cmd);
  const isColorCommand = /(?:màu khác|màu tối ưu|đen trắng|bản màu|trang trọng|nổi bật|giảm màu)/i.test(cmd);
  const isShapeCommand = /(?:đổi dạng|bo góc|hình tròn|hình chữ nhật|capsule|hình nhộng|vuông hơn|giảm bo góc)/i.test(cmd);
  const isLineCommand = /(?:nét đứt|nét liền|độ dày|độ dầy|đường nối|line)/i.test(cmd);

  // If a general property edit is issued but no target is bound
  if (!targetNodeId && !targetConnId && (isSizeCommand || isPosCommand || isFontCommand || isColorCommand || isShapeCommand || isLineCommand)) {
    return {
      handled: true,
      description: 'Vui lòng chọn một thành phần trên sơ đồ trước khi chỉnh.'
    };
  }

  // PROCESS DIAGRAM EDITS LOCAL
  if (currentFigure.diagram) {
    const diag = currentFigure.diagram;

    // A. NODE LOCAL EDITS
    if (targetNodeId) {
      const nodeIndex = diag.nodes.findIndex(n => n.id.toUpperCase() === targetNodeId?.toUpperCase());
      if (nodeIndex !== -1) {
        const node = diag.nodes[nodeIndex];
        const updatedNodes = [...diag.nodes];
        let description = '';

        if (/(?:to hơn một chút|to hơn|to lên|lớn hơn|tăng kích thước|to thêm)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, w: node.w + delta * 2, h: node.h + delta };
          description = `Đã tăng kích thước khối **${node.id} (${node.label})** thêm +${delta}px.`;
        } else if (/(?:nhỏ lại một tí|nhỏ lại|nhỏ đi|bé lại|giảm kích thước)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, w: Math.max(40, node.w - delta * 2), h: Math.max(20, node.h - delta) };
          description = `Đã thu gọn kích thước khối **${node.id} (${node.label})** bớt -${delta}px.`;
        } else if (/(?:rộng hơn|chiều rộng)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, w: node.w + delta * 2 };
          description = `Đã mở rộng bề rộng khối **${node.id} (${node.label})** lên ${node.w + delta * 2}px.`;
        } else if (/(?:hẹp hơn|thấp lại|ngắn|hẹp)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, w: Math.max(40, node.w - delta * 2) };
          description = `Đã bóp hẹp bề ngang khối **${node.id} (${node.label})**.`;
        } else if (/(?:cao hơn|chiều cao)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, h: node.h + delta };
          description = `Đã tăng chiều cao khối **${node.id} (${node.label})** lên ${node.h + delta}px.`;
        } else if (/(?:thấp lại|giảm chiều cao|dẹt)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, h: Math.max(20, node.h - delta) };
          description = `Đã giảm độ cao khối **${node.id} (${node.label})**.`;
        } else if (/(?:dịch lên một tí|dịch lên|lên trên)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, y: Math.max(0, node.y - delta) };
          description = `Đã dịch chuyển khối **${node.id}** lên trên ${delta}px.`;
        } else if (/(?:dịch xuống một chút|dịch xuống)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, y: node.y + delta };
          description = `Đã dịch chuyển khối **${node.id}** xuống dưới ${delta}px.`;
        } else if (/(?:sang trái chút|sang trái|qua trái)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, x: Math.max(0, node.x - delta) };
          description = `Đã dịch chuyển khối **${node.id}** sang trái ${delta}px.`;
        } else if (/(?:sang phải chút|sang phải|qua phải)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, x: node.x + delta };
          description = `Đã dịch chuyển khối **${node.id}** sang phải ${delta}px.`;
        } else if (/căn giữa/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, x: 400 - node.w / 2 };
          description = `Đã căn giữa trục dọc khối **${node.id}** trên bản canvas.`;
        } else if (/căn đều/i.test(cmd)) {
          if (diag.nodes.length > 2) {
            const sorted = [...diag.nodes].sort((a,b) => a.x - b.x);
            const startX = sorted[0].x;
            const endX = sorted[sorted.length - 1].x;
            const step = (endX - startX) / (sorted.length - 1);
            diag.nodes.forEach((n, idx) => {
              const matchedNode = updatedNodes.find(un => un.id === n.id);
              if (matchedNode) {
                const sortedIdx = sorted.findIndex(s => s.id === n.id);
                matchedNode.x = Math.round(startX + sortedIdx * step);
              }
            });
            description = `Đã căn gióng tuyến đều theo tuyến hoành trục các khối sơ đồ.`;
          }
        } else if (/(?:tăng chữ lên chút|tăng chữ|chữ to)/i.test(cmd)) {
          const fs = (node.fontSize || 11) + 2;
          updatedNodes[nodeIndex] = { ...node, fontSize: fs };
          description = `Đã tăng cỡ chữ hiển thị thành **${fs}pt**.`;
        } else if (/(?:giảm chữ lại|giảm chữ|chữ nhỏ)/i.test(cmd)) {
          const fs = Math.max(8, (node.fontSize || 11) - 2);
          updatedNodes[nodeIndex] = { ...node, fontSize: fs };
          description = `Đã thu gọn cỡ chữ hiển thị thành **${fs}pt**.`;
        } else if (/(?:in đậm|bôi đậm)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, fontWeight: 'bold' };
          description = `Đã set thuộc tính **In Đậm** cho văn bản khối ${node.id}.`;
        } else if (/(?:bỏ in đậm|chữ thường)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, fontWeight: 'normal' };
          description = `Đã hoàn trả định dạng chữ thường cho văn bản khối ${node.id}.`;
        } else if (/(?:căn giữa chữ)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, textAlign: 'center' };
          description = `Đã căn lề giữa cho văn bản của khối ${node.id}.`;
        } else if (/(?:chữ hơi nhỏ|chữ khó đọc)/i.test(cmd)) {
          const fs = (node.fontSize || 11) + 2;
          updatedNodes[nodeIndex] = { ...node, fontSize: fs, fontWeight: 'bold' };
          description = `Đã cải thiện chiều hiển thị: Tăng cỡ chữ lên **${fs}pt** và bôi đậm để tăng tính khoa học dễ đọc.`;
        } else if (/(?:rút gọn chữ|rút gọn)/i.test(cmd)) {
          const shortL = node.label.length > 12 ? node.label.slice(0, 12) + '...' : node.label;
          updatedNodes[nodeIndex] = { ...node, label: shortL };
          description = `Đã tóm lược hóa rút văn bản label khối thành: "${shortL}".`;
        } else if (/(?:đổi màu tối ưu|làm màu trang trọng hơn|trang trọng)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, fillColor: '#f8fafc', strokeColor: '#334155' };
          description = `Áp dụng tone màu chuyên nghiệp (Slate và Indigo) hành công cho khối **${node.id}**.`;
        } else if (/(?:đổi sang đen trắng|đen trắng)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, fillColor: '#ffffff', strokeColor: '#000000' };
          description = `Đã tối ưu hóa màu sắc đen trắng học thuật cho khối **${node.id}**.`;
        } else if (/(?:đổi sang bản màu|bản màu)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, fillColor: '#f0f9ff', strokeColor: '#1d4ed8' };
          description = `Đã đổi sang phiên bản phối sắc màu xanh dương trang nhã cho khối **${node.id}**.`;
        } else if (/(?:đổi màu khác|màu khác)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, fillColor: '#f0fdf4', strokeColor: '#16a34a' };
          description = `Đã đổi màu nền sang tông xanh lục sáng dịu mát mắt cho khối **${node.id}**.`;
        } else if (/(?:làm nổi bật hơn|nổi bật)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, fillColor: '#fee2e2', strokeColor: '#dc2626' };
          description = `Đã làm nổi bật khối **${node.id}** bằng gam màu tương phản cao (Coral Highlight).`;
        } else if (/(?:giảm màu)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, fillColor: '#fafafa', strokeColor: '#64748b' };
          description = `Đã hạ tông màu trung tính giản dị cho khối ${node.id}.`;
        } else if (/(?:đổi dạng khác|đổi dạng|đổi hình)/i.test(cmd)) {
          const shapeChain: ShapeType[] = ['rect', 'circle', 'diamond', 'cylinder'];
          const idx = shapeChain.indexOf(node.type);
          const nextS = shapeChain[(idx + 1) % shapeChain.length];
          updatedNodes[nodeIndex] = { ...node, type: nextS };
          description = `Đã chuyển đổi loại hình dạng khối thành ${nextS.toUpperCase()}.`;
        } else if (/(?:bo góc nhẹ)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, rx: 6, borderRadius: 6, type: 'rect' };
          description = `Đã bo góc nhẹ mượt mà cho khối **${node.id}**.`;
        } else if (/(?:đổi sang capsule|capsule|hình nhộng|hình viên thuốc|bo góc)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, type: 'rect', rx: 20, borderRadius: 20 };
          description = `Đã cấu hình khối **${node.id}** sang hình bo tròn sâu (Capsule) chuẩn báo cáo.`;
        } else if (/(?:vuông hơn|giảm bo góc|đổi sang hình chữ nhật)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, type: 'rect', rx: 0, borderRadius: 0 };
          description = `Đã chuyển sang dạng hình chữ nhật vuông góc chuẩn APA cho khối **${node.id}**.`;
        } else if (/(?:đổi sang hình tròn)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, type: 'circle' };
          description = `Đã chuyển khối **${node.id}** sang hình tròn tối giản.`;
        } else if (/(?:đổi sang hình thoi)/i.test(cmd)) {
          updatedNodes[nodeIndex] = { ...node, type: 'diamond' };
          description = `Đã đề xuất chuyển đổi khối **${node.id}** sang dạng hình thoi biểu diễn logic rẽ nhánh.`;
        }

        if (description) {
          return {
            handled: true,
            updatedFigure: {
              ...currentFigure,
              diagram: {
                ...diag,
                nodes: updatedNodes
              }
            },
            description
          };
        }
      }
    }

    // B. CONNECTION/LINE LOCAL EDITS
    if (targetConnId) {
      const connIndex = diag.connections.findIndex(c => c.id.toUpperCase() === targetConnId?.toUpperCase());
      if (connIndex !== -1) {
        const conn = diag.connections[connIndex];
        const updatedConnections = [...diag.connections];
        let description = '';

        if (/(?:đổi nét đứt|nét đứt|gạch đứt)/i.test(cmd)) {
          updatedConnections[connIndex] = { ...conn, style: 'dashed' };
          description = `Đã đổi đường liên kết vector **${conn.id}** sang nét gạch đứt (Dashed).`;
        } else if (/(?:đổi nét liền|nét liền|nét thẳng)/i.test(cmd)) {
          updatedConnections[connIndex] = { ...conn, style: 'solid' };
          description = `Đã đổi đường liên kết vector **${conn.id}** sang nét nguyên liền (Solid).`;
        } else if (/(?:dotted|nét chấm)/i.test(cmd)) {
          updatedConnections[connIndex] = { ...conn, style: 'dotted' };
          description = `Đã đổi đường liên kết vector **${conn.id}** sang nét chấm tròn (Dotted).`;
        } else if (/(?:tăng độ dày đường nối|độ dày|to ra|dày hơn)/i.test(cmd)) {
          const sw = (conn.strokeWidth || 1.5) + 1.5;
          updatedConnections[connIndex] = { ...conn, strokeWidth: sw };
          description = `Đã tăng độ rộng của nét vẽ đường nối **${conn.id}** lên ${sw}pt.`;
        } else if (/(?:giảm độ dày line|mỏng hơn|giảm độ dày)/i.test(cmd)) {
          const sw = Math.max(1, (conn.strokeWidth || 1.5) - 0.75);
          updatedConnections[connIndex] = { ...conn, strokeWidth: sw };
          description = `Đã giảm độ rộng của nét vẽ đường nối **${conn.id}** thành ${sw}pt.`;
        } else if (/(?:bỏ mũi tên|không mũi tên|không có mũi tên)/i.test(cmd)) {
          updatedConnections[connIndex] = { ...conn, arrowEnd: false };
          description = `Đã loại bỏ ký hiệu mũi tên ở điểm cuối đường nối **${conn.id}**.`;
        } else if (/(?:thêm mũi tên|có mũi tên|mũi tên)/i.test(cmd)) {
          updatedConnections[connIndex] = { ...conn, arrowEnd: true };
          description = `Đã kích hoạt thêm ký hiệu đầu mũi tên định hướng cho đường nối **${conn.id}**.`;
        } else if (/(?:tránh che chữ|tránh che)/i.test(cmd)) {
          updatedConnections[connIndex] = { ...conn, style: 'dashed' };
          description = `Đã tự động định vị lại cấu trúc tọa độ đường kết nối **${conn.id}** để tránh che khuất nhãn chữ.`;
        }

        if (description) {
          return {
            handled: true,
            updatedFigure: {
              ...currentFigure,
              diagram: {
                ...diag,
                connections: updatedConnections
              }
            },
            description
          };
        }
      }
    }
  }

  // 0. RESET DATA COMMAND
  if (/(?:khôi phục|reset|cài lại)\s+(?:dữ liệu|demo|mẫu)/i.test(cmd)) {
    return {
      handled: true,
      triggerAction: 'reset_demo',
      description: 'Hệ thống đang tiến hành xóa toàn bộ bản lưu tạm thời và khôi phục lại các ví dụ mẫu ban đầu...'
    };
  }
  
  // 1. Theme Selection Regex
  // Matches: chuyển sang APA, dùng theme Nature, đổi Nature, áp dụng đen trắng
  const themeMatch = cmd.match(/(?:chuyển|dùng|đổi|áp dụng)\s+(?:sang\s+|theme\s+)?(apa|ieee|nature|đen trắng|grayscale)/i);
  if (themeMatch) {
    const rawTheme = themeMatch[1].toLowerCase();
    let themeKey: AcademicTheme = 'apa';
    let themeLabel = 'APA 7th';
    if (rawTheme === 'ieee') {
      themeKey = 'ieee';
      themeLabel = 'IEEE';
    } else if (rawTheme === 'nature') {
      themeKey = 'nature';
      themeLabel = 'Nature';
    } else if (rawTheme === 'đen trắng' || rawTheme === 'grayscale') {
      themeKey = 'black_white';
      themeLabel = 'Đen trắng / Grayscale';
    }
    return {
      handled: true,
      newTheme: themeKey,
      description: `Đã cập nhật giao diện quy chuẩn về mẫu: **${themeLabel}**.`
    };
  }

  // 2. Action Triggers: Super Optimize
  if (/(?:căn chỉnh|tối ưu|auto-fix|sắp xếp lại|làm gọn)/i.test(cmd)) {
    return {
      handled: true,
      triggerAction: 'super_optimize',
      description: 'Đang chạy thuật toán tự động căn chỉnh khoảng cách, tọa độ và đồng nhất font chữ quy chuẩn Grid học thuật...'
    };
  }

  // 3. Action Triggers: Export / LaTeX
  if (/(?:xuất|tải)\s+svg/i.test(cmd)) {
    return {
      handled: true,
      triggerAction: 'export_svg',
      description: 'Bản vẽ SVG đang được thiết kế dạng vector độ phân giải cao và lưu về thiết bị...'
    };
  }
  if (/(?:copy|sao chép)\s+latex/i.test(cmd)) {
    return {
      handled: true,
      triggerAction: 'copy_latex',
      description: 'Mã nguồn LaTeX định dạng TikZ/Tabular chuẩn học thuật đã được sao chép vào khay nhớ tạm của bạn!'
    };
  }
  if (/(?:chỉnh|đổi|cài)\s+api(?:\s+key)?/i.test(cmd)) {
    return {
      handled: true,
      triggerAction: 'set_api_key',
      description: 'Đã mở hộp thoại cấu hình Gemini API Key. Vui lòng nhập khóa của bạn.'
    };
  }

  // 4. Create New Figure commands
  // Matches: tạo sơ đồ, tạo biểu đồ line, tạo bảng
  const createMatch = cmd.match(/tạo\s+(sơ đồ|biểu đồ|bảng)(?:\s+(\w+))?/i);
  if (createMatch) {
    const typeStr = createMatch[1].toLowerCase();
    const subType = createMatch[2]?.toLowerCase() || '';
    
    let targetType: 'diagram' | 'chart' | 'table' = 'diagram';
    if (typeStr === 'biểu đồ' || subType === 'chart') {
      targetType = 'chart';
    } else if (typeStr === 'bảng' || subType === 'table') {
      targetType = 'table';
    }

    // Creating empty model
    const newFig: PreviewFigure = {
      sourceCandidateUid: 'new_' + Date.now(),
      title: 'Bản vẽ mới ' + (targetType === 'diagram' ? 'Sơ đồ' : targetType === 'chart' ? 'Biểu đồ' : 'Bảng so sánh'),
      type: targetType,
      isPreview: true
    };

    if (targetType === 'diagram') {
      newFig.diagram = {
        caption: 'Hình: Sơ đồ trình bày học thuật',
        nodes: [
          { id: 'N001', type: 'rect', label: '', x: 150, y: 150, w: 120, h: 50, fillColor: '#f8fafc' },
          { id: 'N002', type: 'rect', label: '', x: 380, y: 150, w: 120, h: 50, fillColor: '#f8fafc' }
        ],
        connections: [
          { id: 'L001', fromId: 'N001', toId: 'N002', label: '', style: 'solid', arrowEnd: true }
        ]
      };
    } else if (targetType === 'chart') {
      newFig.chart = {
        config: {
          type: (subType as any) || 'bar',
          title: 'Biểu đồ thống kê mới',
          xAxisLabel: '',
          yAxisLabel: '',
          showGrid: true,
          isDoubleColumn: false,
          caption: 'Hình: Phân tích dữ liệu nghiên cứu'
        },
        data: []
      };
    } else if (targetType === 'table') {
      newFig.table = {
        caption: 'Bảng: Thống kê thông số',
        columns: [
          { key: 'col1', header: 'Hạng mục', align: 'left' },
          { key: 'col2', header: 'Giá trị', align: 'center' }
        ],
        rows: []
      };
    }

    return {
      handled: true,
      updatedFigure: newFig,
      description: `Đã tạo hình vẽ mới tinh: **${newFig.title} (${newFig.type})**!`
    };
  }

  // --- DIAGRAM COMMANDS CONTEXT ---
  if (currentFigure.type === 'diagram' && currentFigure.diagram) {
    const diag = currentFigure.diagram;

    // Direct trigger for Ambiguity checks (Part 8)
    // Matches "thêm node" or "thêm bước" completely bare without name
    if (cmd === 'thêm node' || cmd === 'thêm bước' || cmd === 'thêm khối') {
      return {
        handled: true,
        description: 'Vui lòng bổ sung tên cụ thể của node đó.',
        clarification: {
          question: 'Chiều hướng và vị trí bạn muốn thêm node mới vào đâu?',
          options: [
            { label: 'Thêm Bước Xếp Hạng sau block cuối', command: 'thêm node Bước Xếp Hạng sau n2' },
            { label: 'Thêm Khung Kiểm Tra ở giữa', command: 'thêm node Kiểm Tra sau n1' },
            { label: 'Thêm Nút Đánh Giá độc lập', command: 'thêm node Đánh Giá' }
          ]
        }
      };
    }

    // A. Add Node
    // Matches: thêm node [tên] sau [tên/id node]
    // Matches: thêm bước [tên] trước [tên/id node]
    // Matches: thêm khối [tên]
    const addNodeMatch = normalizedText.match(/thêm\s+(?:node|bước|khối)\s+(.+?)(?:\s+(sau|trước)\s+(n\w+|[^\s]+))?$/i);
    if (addNodeMatch) {
      const nodeLabel = addNodeMatch[1].trim();
      if (nodeLabel === '') {
        return {
          handled: true,
          description: 'Lỗi: Tên node thêm mới không được để trống.'
        };
      }
      if (nodeLabel.length > 100) {
        return {
          handled: true,
          description: 'Lỗi: Nhãn của khối quá dài (tối đa 100 ký tự).'
        };
      }
      
      const relativeRelation = addNodeMatch[2] ? addNodeMatch[2].toLowerCase() : null;
      const relativeTargetText = addNodeMatch[3] ? addNodeMatch[3].trim() : null;

      // Determine shape node type based on label keywords
      let computedShape: ShapeType = 'rect';
      const labelLower = nodeLabel.toLowerCase();
      if (/(kiểm tra|quyết định|nếu|if|cond|đúng sai)/.test(labelLower)) {
        computedShape = 'diamond';
      } else if (/(lưu trữ|cơ sở dữ liệu|database|db|kho|cylinder)/.test(labelLower)) {
        computedShape = 'cylinder';
      } else if (/(kết thúc|bắt đầu|start|end|stop|tròn|circle)/.test(labelLower)) {
        computedShape = 'circle';
      } else if (/(văn bản|chữ|label|caption|text)/.test(labelLower)) {
        computedShape = 'text';
      }

      // Generate coordinates
      let newX = 150;
      let newY = 150;
      let targetNode: DiagramNode | undefined;

      if (relativeRelation && relativeTargetText) {
        // Try searching by ID first, then by Label
        targetNode = diag.nodes.find(n => n.id.toLowerCase() === relativeTargetText.toLowerCase() || 
                                           n.label.toLowerCase().includes(relativeTargetText.toLowerCase()));
      }

      if (targetNode) {
        if (relativeRelation === 'sau') {
          newX = targetNode.x + 180;
          newY = targetNode.y;
        } else { // truoc
          newX = Math.max(50, targetNode.x - 180);
          newY = targetNode.y;
        }
      } else {
        // Default to placing after the last node
        if (diag.nodes.length > 0) {
          const sortedNodes = [...diag.nodes].sort((a, b) => b.x - a.x);
          const lastNode = sortedNodes[0];
          newX = lastNode.x + 180;
          newY = lastNode.y;
        }
      }

      // Grid boundaries wrapping (Width is max 800)
      if (newX > 710) {
        newX = 100;
        // Find maximum Y in that column or simply shift down
        const maxY = diag.nodes.reduce((acc, n) => Math.max(acc, n.y), 150);
        newY = maxY + 100;
      }

      const newId = 'N' + getStringHash(nodeLabel + diag.nodes.length + Date.now().toString()).toUpperCase().substring(0, 5);
      const createdNode: DiagramNode = {
        id: newId,
        type: computedShape,
        label: nodeLabel,
        x: newX,
        y: newY,
        w: computedShape === 'diamond' ? 100 : computedShape === 'circle' ? 70 : 130,
        h: computedShape === 'diamond' ? 80 : computedShape === 'circle' ? 70 : 50,
        fillColor: '#f8fafc'
      };

      const updatedNodes = [...diag.nodes, createdNode];
      const updatedConnections = [...diag.connections];

      let connectionDesc = '';
      // If we placed relative to another node, or we placed sequentially after the current last node, auto-create connection!
      const parentNode = targetNode || (diag.nodes.length > 0 ? [...diag.nodes].sort((a,b) => b.x - a.x)[0] : null);
      if (parentNode) {
        const newConnId = 'L' + getStringHash(parentNode.id + newId).toUpperCase().substring(0, 5);
        updatedConnections.push({
          id: newConnId,
          fromId: parentNode.id,
          toId: newId,
          style: 'solid',
          arrowEnd: true
        });
        connectionDesc = ` và tự động liên kết mũi tên từ **[${parentNode.label}]** sang **[${nodeLabel}]**`;
      }

      return {
        handled: true,
        updatedFigure: {
          ...currentFigure,
          diagram: {
            ...diag,
            nodes: updatedNodes,
            connections: updatedConnections
          }
        },
        description: `Thành công: Đã thêm bước **"${nodeLabel}"** (${computedShape})${connectionDesc}.`
      };
    }

    // B. Delete Node / Connections
    // Matches: xóa node [tên/id]
    // Matches: xóa kết nối [A] đến [B]
    const deleteMatch = normalizedText.match(/xóa\s+(?:node|bước|kết nối|mũi tên|khối)\s+([^\s]+.*?)$/i);
    if (deleteMatch) {
      const targetStr = deleteMatch[1].trim().toLowerCase();
      
      // Find the node
      const matchingNode = diag.nodes.find(n => n.id.toLowerCase() === targetStr || n.label.toLowerCase().includes(targetStr));
      if (matchingNode) {
        const filteredNodes = diag.nodes.filter(n => n.id !== matchingNode.id);
        const filteredConns = diag.connections.filter(c => c.fromId !== matchingNode.id && c.toId !== matchingNode.id);
        return {
          handled: true,
          updatedFigure: {
            ...currentFigure,
            diagram: {
              ...diag,
              nodes: filteredNodes,
              connections: filteredConns
            }
          },
          description: `Đã loại bỏ khối **"${matchingNode.label}"** và xóa bỏ toàn bộ các mũi tên kết nối liên đới.`
        };
      }

      // If they meant connection (e.g., "xóa kết nối n1" or similar)
      const matchingConn = diag.connections.find(c => c.id.toLowerCase() === targetStr);
      if (matchingConn) {
        const filteredConns = diag.connections.filter(c => c.id !== matchingConn.id);
        return {
          handled: true,
          updatedFigure: {
            ...currentFigure,
            diagram: {
              ...diag,
              connections: filteredConns
            }
          },
          description: `Đã xóa bỏ liên kết mũi tên giữa hai khối.`
        };
      }
    }

    // C. Re-label Node
    // Matches: đổi tên [A] thành [B], đổi nhãn, đổi label
    const relabelMatch = normalizedText.match(/đổi\s+(?:tên|nhãn|label)\s+(.+?)\s+thành\s+(.+?)$/i);
    if (relabelMatch) {
      const targetName = relabelMatch[1].trim().toLowerCase();
      const newName = relabelMatch[2].trim();

      const matchNodeIdx = diag.nodes.findIndex(n => n.id.toLowerCase() === targetName || n.label.toLowerCase().includes(targetName));
      if (matchNodeIdx !== -1) {
        const oldLabel = diag.nodes[matchNodeIdx].label;
        const newNodes = [...diag.nodes];
        newNodes[matchNodeIdx] = {
          ...newNodes[matchNodeIdx],
          label: newName
        };

        return {
          handled: true,
          updatedFigure: {
            ...currentFigure,
            diagram: {
              ...diag,
              nodes: newNodes
            }
          },
          description: `Đã đổi chuẩn nhãn từ **"${oldLabel}"** thành **"${newName}"**.`
        };
      }
    }

    // D. Connect Nodes
    // Matches: nối [A] với [B], thêm mũi tên từ [A] đến [B]
    const connectMatch = normalizedText.match(/(?:nối|kết nối)\s+(.+?)\s+(?:với|và|đến)\s+(.+?)$/i) ||
                         normalizedText.match(/thêm\s+mũi\s+tên\s+từ\s+(.+?)\s+đến\s+(.+?)$/i);
    if (connectMatch) {
      const srcText = connectMatch[1].trim().toLowerCase();
      const destText = connectMatch[2].trim().toLowerCase();

      const fromNode = diag.nodes.find(n => n.id.toLowerCase() === srcText || n.label.toLowerCase().includes(srcText));
      const toNode = diag.nodes.find(n => n.id.toLowerCase() === destText || n.label.toLowerCase().includes(destText));

      if (fromNode && toNode) {
        const lineStyle: LineStyle = (cmd.includes('đứt') || cmd.includes('dashed')) ? 'dashed' : 
                                      (cmd.includes('chấm') || cmd.includes('dotted')) ? 'dotted' : 'solid';
        
        const newConnId = 'L' + getStringHash(fromNode.id + toNode.id + diag.connections.length).toUpperCase().substring(0, 3);
        const newConn: DiagramConnection = {
          id: newConnId,
          fromId: fromNode.id,
          toId: toNode.id,
          style: lineStyle,
          arrowEnd: true
        };

        return {
          handled: true,
          updatedFigure: {
            ...currentFigure,
            diagram: {
              ...diag,
              connections: [...diag.connections, newConn]
            }
          },
          description: `Đã thiết lập liên kết chất lượng cao: **[${fromNode.label}]** → **[${toNode.label}]** (${lineStyle}).`
        };
      }
    }

    // E. Colorizing blocks
    // Matches: đổi màu [đối tượng] thành [màu]
    const colorMatch = normalizedText.match(/đổi\s+màu\s+(.+?)\s+(?:sang|thành)\s+(.+?)$/i);
    if (colorMatch) {
      const targetKey = colorMatch[1].trim().toLowerCase();
      const colorInput = colorMatch[2].trim().toLowerCase();

      const hexColor = VIETNAMESE_COLORS[colorInput] || (colorInput.startsWith('#') ? colorInput : null);
      if (hexColor) {
        let changedCount = 0;
        const newNodes = diag.nodes.map((node, idx) => {
          let matches = false;
          if (targetKey === 'tất cả' || targetKey === 'hết') {
            matches = true;
          } else if (targetKey === 'node đầu' || targetKey === 'khối đầu') {
            matches = idx === 0;
          } else if (targetKey === 'node cuối' || targetKey === 'khối cuối') {
            matches = idx === diag.nodes.length - 1;
          } else if (node.id.toLowerCase() === targetKey || node.label.toLowerCase().includes(targetKey)) {
            matches = true;
          }

          if (matches) {
            changedCount++;
            return {
              ...node,
              fillColor: hexColor
            };
          }
          return node;
        });

        if (changedCount > 0) {
          return {
            handled: true,
            updatedFigure: {
              ...currentFigure,
              diagram: {
                ...diag,
                nodes: newNodes
              }
            },
            description: `Đã nhuộm màu thiết kế nền cho **${changedCount} khối** tương thích thành **${colorInput}** (${hexColor}).`
          };
        }
      }
    }

    // F. Duplicate Node
    const duplicateMatch = normalizedText.match(/nhân bản\s+(?:node|bước|khối)?\s*(.+?)$/i);
    if (duplicateMatch) {
      const targetId = duplicateMatch[1].trim().toLowerCase();
      const sourceNode = diag.nodes.find(n => n.id.toLowerCase() === targetId || n.label.toLowerCase().includes(targetId));
      if (sourceNode) {
        const newId = 'N' + getStringHash(sourceNode.id + 'copy' + diag.nodes.length).toUpperCase().substring(0, 3);
        const newNode = { ...sourceNode, id: newId, x: sourceNode.x + 40, y: sourceNode.y + 40 };
        return { 
          handled: true, 
          updatedFigure: { ...currentFigure, diagram: { ...diag, nodes: [...diag.nodes, newNode] } }, 
          description: `Đã nhân bản khối "${sourceNode.label}".` 
        };
      }
    }
  }

  // --- CHART COMMANDS CONTEXT ---
  if (currentFigure.type === 'chart' && currentFigure.chart) {
    const chart = currentFigure.chart;

    // A. Chart Title / Caption
    const titleMatch = normalizedText.match(/đổi\s+tiêu\s+đề\s+thành\s+(.+?)$/i);
    if (titleMatch) {
      const newTitle = titleMatch[1].trim();
      return {
        handled: true,
        updatedFigure: {
          ...currentFigure,
          chart: {
            ...chart,
            config: {
              ...chart.config,
              title: newTitle
            }
          }
        },
        description: `Đã cập nhật tiêu đề biểu đồ thành: **"${newTitle}"**.`
      };
    }

    // B. Add Data Point
    // Matches: thêm điểm Mẫu D 95
    const addPtMatch = normalizedText.match(/thêm\s+(?:điểm|mẫu|data|đối tượng)\s+([^\s]+.*?)\s+([0-9\.\-]+)$/i);
    if (addPtMatch) {
      const ptLabel = addPtMatch[1].trim();
      const ptVal = parseFloat(addPtMatch[2]);

      if (!isNaN(ptVal)) {
        const newData: ChartDataPoint = { label: ptLabel, value: ptVal };
        return {
          handled: true,
          updatedFigure: {
            ...currentFigure,
            chart: {
              ...chart,
              data: [...chart.data, newData]
            }
          },
          description: `Đã nạp điểm dữ liệu học thuật mới: **${ptLabel}** với giá trị **${ptVal}**.`
        };
      }
    }

    // C. Change Data Point Value
    // Matches: đổi giá trị [A] thành [B]
    const editPtMatch = normalizedText.match(/đổi\s+giá\s+trị\s+(.+?)\s+thành\s+([0-9\.\-]+)$/i);
    if (editPtMatch) {
      const ptLabel = editPtMatch[1].trim().toLowerCase();
      const ptVal = parseFloat(editPtMatch[2]);

      if (!isNaN(ptVal)) {
        const index = chart.data.findIndex(d => d.label.toLowerCase().includes(ptLabel));
        if (index !== -1) {
          const oldVal = chart.data[index].value;
          const updatedData = [...chart.data];
          updatedData[index] = { ...updatedData[index], value: ptVal };

          return {
            handled: true,
            updatedFigure: {
              ...currentFigure,
              chart: {
                ...chart,
                data: updatedData
              }
            },
            description: `Đã hiệu chỉnh trị số **${chart.data[index].label}** từ **${oldVal}** lên **${ptVal}**.`
          };
        }
      }
    }

    // D. Delete Data Point
    // Matches: xóa điểm [A]
    const delPtMatch = normalizedText.match(/xóa\s+(?:điểm|mẫu|data)\s+(.+?)$/i);
    if (delPtMatch) {
      const ptLabel = delPtMatch[1].trim().toLowerCase();
      const updatedData = chart.data.filter(d => !d.label.toLowerCase().includes(ptLabel));

      if (updatedData.length < chart.data.length) {
        return {
          handled: true,
          updatedFigure: {
            ...currentFigure,
            chart: {
              ...chart,
              data: updatedData
            }
          },
          description: `Đã loại khỏi biểu đồ mốc dữ liệu: **"${ptLabel}"**.`
        };
      }
    }

    // E. Change chart type
    // Matches: đổi loại biểu đồ sang line/bar/pie/scatter, đổi biểu đồ thành line/bar/pie/scatter
    const typeMatch = normalizedText.match(/đổi\s+(?:loại\s+)?biểu\s+đồ\s+(?:sang|thành)\s+(line|bar|pie|scatter)/i);
    if (typeMatch) {
      const targetType = typeMatch[1].toLowerCase() as 'line' | 'bar' | 'pie' | 'scatter';
      return {
        handled: true,
        updatedFigure: {
          ...currentFigure,
          chart: {
            ...chart,
            config: {
              ...chart.config,
              type: targetType
            }
          }
        },
        description: `Đã đổi định dạng biểu đồ sang mẫu đồ thị: **${targetType.toUpperCase()}**.`
      };
    }
  }

  // --- TABLE COMMANDS CONTEXT ---
  if (currentFigure.type === 'table' && currentFigure.table) {
    const table = currentFigure.table;

    // A. Add Column
    // Matches: thêm cột Độ chính xác (F1)
    const addColMatch = normalizedText.match(/thêm\s+cột\s+(.+?)$/i);
    if (addColMatch) {
      const colHeader = addColMatch[1].trim();
      const colKey = 'col_' + getStringHash(colHeader + table.columns.length);
      const newCol: TableColumn = {
        key: colKey,
        header: colHeader,
        align: 'center'
      };

      // Fill empty cells for this column in all rows
      const updatedRows = table.rows.map(r => ({ ...r, [colKey]: '-' }));

      return {
        handled: true,
        updatedFigure: {
          ...currentFigure,
          table: {
            ...table,
            columns: [...table.columns, newCol],
            rows: updatedRows
          }
        },
        description: `Đã thêm cột học thuật mới **"${colHeader}"** vào bảng thông số.`
      };
    }

    // B. Add Empty Row
    // Matches: thêm hàng, thêm dòng
    if (/thêm\s+(?:hàng|dòng|record)$/i.test(cmd)) {
      const emptyRow: Record<string, string> = {};
      table.columns.forEach((col, i) => {
        emptyRow[col.key] = i === 0 ? `Bản ghi ${table.rows.length + 1}` : '-';
      });

      return {
        handled: true,
        updatedFigure: {
          ...currentFigure,
          table: {
            ...table,
            rows: [...table.rows, emptyRow]
          }
        },
        description: 'Đã bổ sung thêm một dòng dữ liệu kiểm chuẩn trống ở chân bảng.'
      };
    }

    // C. Delete Column
    // Matches: xóa cột [tên]
    const delColMatch = normalizedText.match(/xóa\s+cột\s+(.+?)$/i);
    if (delColMatch) {
      const colHeader = delColMatch[1].trim().toLowerCase();
      const colIndex = table.columns.findIndex(c => c.header.toLowerCase().includes(colHeader) || c.key.toLowerCase() === colHeader);
      
      if (colIndex !== -1) {
        const colKey = table.columns[colIndex].key;
        const colName = table.columns[colIndex].header;
        const filteredCols = table.columns.filter((_, i) => i !== colIndex);
        
        // Clean key from rows
        const updatedRows = table.rows.map(r => {
          const cloned = { ...r };
          delete cloned[colKey];
          return cloned;
        });

        return {
          handled: true,
          updatedFigure: {
            ...currentFigure,
            table: {
              ...table,
              columns: filteredCols,
              rows: updatedRows
            }
          },
          description: `Đã phân rã và gỡ bỏ cột **"${colName}"** khỏi cấu trúc.`
        };
      }
    }

    // D. Delete Row
    // Matches: xóa hàng 2, xóa dòng 1
    const delRowMatch = normalizedText.match(/xóa\s+(?:hàng|dòng)\s+([0-9]+)$/i);
    if (delRowMatch) {
      const rowIdx = parseInt(delRowMatch[1]) - 1; // Translate natural 1-based index to 0-based
      if (rowIdx >= 0 && rowIdx < table.rows.length) {
        const filteredRows = table.rows.filter((_, i) => i !== rowIdx);
        return {
          handled: true,
          updatedFigure: {
            ...currentFigure,
            table: {
              ...table,
              rows: filteredRows
            }
          },
          description: `Đã loại bỏ hoàn toàn dòng số **${rowIdx + 1}** bên trong bảng.`
        };
      }
    }
  }

  // Not matched by any local rules - return handled false to invoke AI pipeline
  return {
    handled: false,
    description: 'Chuyển tiếp yêu cầu xử lý sang hệ máy học Gemini...'
  };
}
