import { describe, it, expect } from 'vitest';
import { parseDocumentSections } from '../src/lib/documentParser';
import { runRuleAnalysis } from '../src/analysis/ruleAnalyzer';

const regressionInputText = `
I. BẢNG DOANH THU NĂM 2026
Đây là bảng doanh thu:
| STT | Dịch vụ | Doanh thu (Tỷ đồng) |
|---|---|---|
| 1 | Môi giới | 850 |
| 2 | Tư vấn | 420 |

II. BIỂU ĐỒ TĂNG TRƯỞNG
* Môi giới: 850
* Tư vấn: 420

III. SƠ ĐỒ QUY TRÌNH ĐIỀU PHỐI HOA TIÊU
Các bước trong sơ đồ cần hiển thị:
1. Tiếp nhận yêu cầu điều động từ đại lý tàu
* Dạng node đề xuất: actor
2. Kiểm tra điều kiện an toàn hàng hải
3. Lên phương án phân công Hoa tiêu
* Label dài để test wrap: Lên phương án phân công điều động Hoa tiêu (dự kiến cập bến T2)
4. Phê duyệt và chốt phương án
* Dạng node đề xuất: diamond
5. Bàn giao cho Cảng vụ
6. Hoa tiêu lên tàu thực hiện dẫn luồng
* Dạng node đề xuất: cylinder

Các kết nối sơ đồ cần kiểm thử:
* Tiếp nhận yêu cầu điều động từ đại lý tàu -> Kiểm tra điều kiện an toàn hàng hải: dashed, có mũi tên, nhãn kết nối: Phê duyệt ban đầu
* Kiểm tra điều kiện an toàn hàng hải -> Lên phương án phân công Hoa tiêu: solid, có mũi tên
* Lên phương án phân công Hoa tiêu -> Phê duyệt và chốt phương án: solid, có mũi tên
* Phê duyệt và chốt phương án -> Bàn giao cho Cảng vụ: dotted, không có mũi tên, nhãn kết nối: Đồng bộ HTTT
* Bàn giao cho Cảng vụ -> Hoa tiêu lên tàu thực hiện dẫn luồng: solid, có mũi tên

Nguồn: Quy chế hoạt động Công ty Hoa tiêu Hàng hải (Q2/2026)
`;

describe('Section Parser & Section Aware Diagram Selection', () => {
  it('identifies I/II/III/IV Roman headings and semantic hints', () => {
    const sections = parseDocumentSections(regressionInputText);
    expect(sections.length).toBeGreaterThan(0);
    
    const sec1 = sections.find(s => s.romanNumeral === 'I');
    expect(sec1).toBeDefined();
    expect(sec1!.semanticHints).toContain('table');
    
    const sec3 = sections.find(s => s.romanNumeral === 'III');
    expect(sec3).toBeDefined();
    expect(sec3!.heading).toContain('SƠ ĐỒ');
    expect(sec3!.semanticHints).toContain('diagram');
  });

  it('selects section III for diagram and avoids currency nodes', async () => {
    const result = await runRuleAnalysis(regressionInputText);
    
    const diagram = result.recommendedCandidates.find(c => c.visualType === 'flowchart');
    expect(diagram).toBeDefined();
    
    // Test candidate provenance
    expect(diagram!.sourceSectionHeading).toContain('SƠ ĐỒ QUY TRÌNH ĐIỀU PHỐI HOA TIÊU');
    expect(diagram!.source).toBe('rule');
    
    // It should extract source citation from section III
    expect(diagram!.data.diagram?.source).toContain('Quy chế hoạt động');
    
    const nodes = diagram!.data.diagram?.nodes || [];
    expect(nodes.length).toBe(6);
    
    // Shouldn't contain 000 đồng or anything from section I
    const hasCurrency = nodes.some(n => n.label.includes('850'));
    expect(hasCurrency).toBe(false);
    
    // Tests node type hints
    expect(nodes[0].type).toBe('actor');
    expect(nodes[3].type).toBe('diamond');
    expect(nodes[5].type).toBe('cylinder');
    
    // Tests long label override
    expect(nodes[2].label).toContain('Lên phương án phân công điều động Hoa tiêu');
    
    const conns = diagram!.data.diagram?.connections || [];
    expect(conns.length).toBe(5);
    
    // Tests dashed + edge label
    expect(conns[0].style).toBe('dashed');
    expect(conns[0].label).toBe('Phê duyệt ban đầu');
    
    // Tests dotted + arrowEnd false (không có mũi tên)
    const dottedConn = conns.find(c => c.style === 'dotted');
    expect(dottedConn).toBeDefined();
    expect(dottedConn!.arrowEnd).toBe(false);
    expect(dottedConn!.label).toBe('Đồng bộ HTTT');
  });
});
