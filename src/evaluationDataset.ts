import { EvaluationCase } from './types';

export const EVALUATION_DATASET: EvaluationCase[] = [
  {
    id: "CASE_001",
    title: "Quy trình quản lý văn bản",
    domain: "quan_ly_nha_nuoc",
    inputText: "Quy trình xử lý văn bản đến bao gồm: Tiếp nhận, Phân loại, Trình lãnh đạo, Chuyển đơn vị xử lý và Lưu trữ.",
    expectedBlocks: [{ type: "process", textIncludes: ["Quy trình", "Tiếp nhận"] }],
    expectedEntities: [
      { label: "Tiếp nhận", entityType: "process_step" },
      { label: "Phân loại", entityType: "process_step" },
      { label: "Trình lãnh đạo", entityType: "process_step" },
      { label: "Lưu trữ", entityType: "process_step" }
    ],
    expectedRelations: [
      { fromLabel: "Tiếp nhận", toLabel: "Phân loại", relationType: "sequence" }
    ],
    expectedVisualTypes: ["flowchart", "roadmap"],
    expectedPrimaryVisualType: "flowchart"
  },
  {
    id: "CASE_002",
    title: "Ma trận quản lý BĐATHH",
    domain: "hang_hai",
    inputText: "Luận án tập trung vào 2 nhóm nội dung chính của quản lý nhà nước về bảo đảm an toàn hàng hải: Tổ chức và quản lý hệ thống BĐATHH; Quản lý cung cấp dịch vụ BĐATHH. Hai nhóm này được xem xét trên 3 bình diện: ban hành, thực hiện, giám sát.",
    expectedBlocks: [{ type: "matrix_hint", textIncludes: ["2 nhóm", "3 bình diện"] }],
    expectedEntities: [
      { label: "Tổ chức và quản lý hệ thống BĐATHH", entityType: "concept" },
      { label: "ban hành", entityType: "criterion" }
    ],
    expectedRelations: [],
    expectedVisualTypes: ["matrix", "policy_matrix", "framework"],
    expectedPrimaryVisualType: "policy_matrix"
  },
  {
    id: "CASE_003",
    title: "Timeline phát triển hệ thống",
    domain: "general",
    inputText: "Giai đoạn 2015-2020 hoàn thiện quy hoạch; 2021-2025 tăng cường đầu tư; tầm nhìn 2030 hiện đại hóa.",
    expectedBlocks: [{ type: "timeline", textIncludes: ["2015", "2030"] }],
    expectedEntities: [
      { label: "2015-2020", entityType: "time_point" },
      { label: "2030", entityType: "time_point" }
    ],
    expectedRelations: [],
    expectedVisualTypes: ["timeline", "roadmap"],
    expectedPrimaryVisualType: "timeline"
  },
  {
    id: "CASE_004",
    title: "Bảng so sánh phương pháp",
    domain: "general",
    inputText: "So sánh phương pháp A và B: Phương pháp A có ưu điểm nhanh nhưng chi phí cao. Phương pháp B chậm hơn nhưng tiết kiệm đáng kể.",
    expectedBlocks: [{ type: "comparison", textIncludes: ["So sánh", "ưu điểm"] }],
    expectedEntities: [
      { label: "Phương pháp A", entityType: "group" },
      { label: "Phương pháp B", entityType: "group" }
    ],
    expectedRelations: [],
    expectedVisualTypes: ["comparison_table", "summary_table"],
    expectedPrimaryVisualType: "comparison_table"
  },
  {
    id: "CASE_005",
    title: "Hiện trạng - Nguyên nhân - Giải pháp",
    domain: "quan_ly_nha_nuoc",
    inputText: "Hiện trạng: Hạ tầng lạc hậu. Nguyên nhân: Đầu tư dàn trải. Giải pháp: Tập trung nguồn lực trọng điểm.",
    expectedBlocks: [{ type: "paragraph", textIncludes: ["Hiện trạng", "Giải pháp"] }],
    expectedEntities: [
      { label: "Hạ tầng lạc hậu", entityType: "concept" },
      { label: "Đầu tư dàn trải", entityType: "concept" }
    ],
    expectedRelations: [
      { fromLabel: "Đầu tư dàn trải", toLabel: "Hạ tầng lạc hậu", relationType: "causes" }
    ],
    expectedVisualTypes: ["cause_effect", "summary_table"],
    expectedPrimaryVisualType: "summary_table"
  },
  {
    id: "CASE_006",
    title: "Chuỗi số liệu tăng trưởng",
    domain: "kinh_te",
    inputText: "Sản lượng năm 2018 đạt 100 tỷ; năm 2019 đạt 120 tỷ; năm 2020 vọt lên 150 tỷ.",
    expectedBlocks: [{ type: "number_series", textIncludes: ["năm", "tỷ"] }],
    expectedEntities: [
      { label: "2018", entityType: "time_point" },
      { label: "100 tỷ", entityType: "value" }
    ],
    expectedRelations: [],
    expectedVisualTypes: ["line_chart", "bar_chart"],
    expectedPrimaryVisualType: "line_chart"
  },
  {
    id: "CASE_007",
    title: "Phân cấp tổ chức",
    domain: "quan_ly_nha_nuoc",
    inputText: "Bộ Giao thông vận tải chỉ đạo Cục Hàng hải Việt Nam, Cục Hàng hải quản lý các Cảng vụ hàng hải địa phương.",
    expectedBlocks: [{ type: "paragraph", textIncludes: ["Bộ", "Cục"] }],
    expectedEntities: [
      { label: "Bộ Giao thông vận tải", entityType: "organization" },
      { label: "Cục Hàng hải Việt Nam", entityType: "organization" }
    ],
    expectedRelations: [
      { fromLabel: "Bộ Giao thông vận tải", toLabel: "Cục Hàng hải Việt Nam", relationType: "manages" }
    ],
    expectedVisualTypes: ["hierarchy", "framework"],
    expectedPrimaryVisualType: "hierarchy"
  },
  {
    id: "CASE_008",
    title: "Khung năng lực số",
    domain: "giao_duc",
    inputText: "Khung năng lực số bao gồm 3 trụ cột: Kiến thức, Kỹ năng, Thái độ. Mỗi trụ cột được chia thành các tiêu chí đánh giá cụ thể.",
    expectedBlocks: [{ type: "list", textIncludes: ["3 trụ cột"] }],
    expectedEntities: [
      { label: "Kiến thức", entityType: "criterion" },
      { label: "Kỹ năng", entityType: "criterion" }
    ],
    expectedRelations: [],
    expectedVisualTypes: ["framework", "capability_model"],
    expectedPrimaryVisualType: "capability_model"
  },
  {
    id: "CASE_009",
    title: "Tiến trình đổi mới sáng tạo",
    domain: "general",
    inputText: "Quy trình đổi mới: Ý tưởng -> Thử nghiệm -> Triển khai -> Thương mại hóa.",
    expectedBlocks: [{ type: "process", textIncludes: ["Ý tưởng", "Triển khai"] }],
    expectedEntities: [
      { label: "Thử nghiệm", entityType: "process_step" }
    ],
    expectedRelations: [],
    expectedVisualTypes: ["flowchart", "roadmap"],
    expectedPrimaryVisualType: "flowchart"
  },
  {
    id: "CASE_010",
    title: "Chỉ số hài lòng y tế",
    domain: "y_te",
    inputText: "Chỉ số hài lòng người bệnh đạt 85% năm 2021, 88% năm 2022 và mục tiêu 92% năm 2023.",
    expectedBlocks: [{ type: "number_series", textIncludes: ["hài lòng", "85%"] }],
    expectedEntities: [
      { label: "85%", entityType: "value" }
    ],
    expectedRelations: [],
    expectedVisualTypes: ["bar_chart", "line_chart"],
    expectedPrimaryVisualType: "bar_chart"
  },
  {
    id: "CASE_011",
    title: "Hệ thống báo hiệu hàng hải",
    domain: "hang_hai",
    inputText: "Hệ thống báo hiệu bao gồm: phao tiêu, tiêu dẫn, sơn dấu, đèn biển, AIS hàng hải.",
    expectedBlocks: [{ type: "list", textIncludes: ["phao tiêu", "AIS"] }],
    expectedEntities: [
      { label: "phao tiêu", entityType: "concept" },
      { label: "AIS hàng hải", entityType: "concept" }
    ],
    expectedRelations: [],
    expectedVisualTypes: ["taxonomy", "summary_table"],
    expectedPrimaryVisualType: "taxonomy"
  },
  {
    id: "CASE_012",
    title: "Tác động chính sách thuế",
    domain: "kinh_te",
    inputText: "Việc giảm thuế VAT kích thích tiêu dùng, từ đó thúc đẩy sản xuất và tăng trưởng GDP.",
    expectedBlocks: [{ type: "paragraph", textIncludes: ["giảm thuế", "tăng trưởng"] }],
    expectedEntities: [
      { label: "giảm thuế VAT", entityType: "policy_tool" },
      { label: "tăng trưởng GDP", entityType: "outcome" }
    ],
    expectedRelations: [
      { fromLabel: "giảm thuế VAT", toLabel: "tăng trưởng GDP", relationType: "influences" }
    ],
    expectedVisualTypes: ["input_process_output", "cause_effect"],
    expectedPrimaryVisualType: "input_process_output"
  },
  {
    id: "CASE_013",
    title: "Mô hình trưởng thành số",
    domain: "general",
    inputText: "5 mức độ trưởng thành: Sơ khai, Hình thành, Định hình, Tối ưu, Dẫn dắt.",
    expectedBlocks: [{ type: "list", textIncludes: ["trưởng thành", "Sơ khai"] }],
    expectedEntities: [
      { label: "Tối ưu", entityType: "concept" }
    ],
    expectedRelations: [],
    expectedVisualTypes: ["maturity_model", "hierarchy"],
    expectedPrimaryVisualType: "maturity_model"
  },
  {
    id: "CASE_014",
    title: "Cơ cấu doanh thu",
    domain: "kinh_te",
    inputText: "Doanh thu quý 4: Dịch vụ chiếm 60%, Sản phẩm chiếm 30%, Khác chiếm 10%.",
    expectedBlocks: [{ type: "number_series", textIncludes: ["chiếm", "%"] }],
    expectedEntities: [
      { label: "Dịch vụ", entityType: "group" },
      { label: "60%", entityType: "value" }
    ],
    expectedRelations: [],
    expectedVisualTypes: ["pie_chart", "bar_chart"],
    expectedPrimaryVisualType: "pie_chart"
  },
  {
    id: "CASE_015",
    title: "Khung pháp lý chuyển đổi số",
    domain: "quan_ly_nha_nuoc",
    inputText: "Chính phủ ban hành Nghị định về dữ liệu số; Bộ Thông tin Truyền thông hướng dẫn thực hiện tiêu chuẩn kỹ thuật.",
    expectedBlocks: [{ type: "paragraph", textIncludes: ["Nghị định", "tiêu chuẩn"] }],
    expectedEntities: [
      { label: "Chính phủ", entityType: "organization" },
      { label: "Nghị định về dữ liệu số", entityType: "concept" }
    ],
    expectedRelations: [
      { fromLabel: "Chính phủ", toLabel: "Nghị định về dữ liệu số", relationType: "regulates" }
    ],
    expectedVisualTypes: ["governance_framework", "framework"],
    expectedPrimaryVisualType: "governance_framework"
  },
  {
    id: "CASE_016",
    title: "Lộ trình đào tạo",
    domain: "giao_duc",
    inputText: "Năm 1: Kiến thức nền tảng. Năm 2: Kỹ năng chuyên sâu. Năm 3: Thực tập dự án. Năm 4: Đồ án tốt nghiệp.",
    expectedBlocks: [{ type: "timeline", textIncludes: ["Năm 1", "Năm 4"] }],
    expectedEntities: [
      { label: "Đồ án tốt nghiệp", entityType: "process_step" }
    ],
    expectedRelations: [],
    expectedVisualTypes: ["roadmap", "timeline"],
    expectedPrimaryVisualType: "roadmap"
  },
  {
    id: "CASE_017",
    title: "Phân tích SWOT",
    domain: "general",
    inputText: "Điểm mạnh: Thương hiệu tốt. Điểm yếu: Chi phí vận hành cao. Cơ hội: Thị trường mở rộng. Thách thức: Đối thủ cạnh tranh mạnh.",
    expectedBlocks: [{ type: "comparison", textIncludes: ["Điểm mạnh", "Thách thức"] }],
    expectedEntities: [
      { label: "Thương hiệu tốt", entityType: "concept" }
    ],
    expectedRelations: [],
    expectedVisualTypes: ["matrix", "summary_table"],
    expectedPrimaryVisualType: "matrix"
  },
  {
    id: "CASE_018",
    title: "Cung cấp dịch vụ hoa tiêu",
    domain: "hang_hai",
    inputText: "Cảng vụ hàng hải giám sát hoạt động của Công ty hoa tiêu để đảm bảo an toàn dẫn tàu.",
    expectedBlocks: [{ type: "paragraph", textIncludes: ["giám sát", "hoa tiêu"] }],
    expectedEntities: [
      { label: "Cảng vụ hàng hải", entityType: "organization" },
      { label: "Công ty hoa tiêu", entityType: "actor" }
    ],
    expectedRelations: [
      { fromLabel: "Cảng vụ hàng hải", toLabel: "Công ty hoa tiêu", relationType: "supervises" }
    ],
    expectedVisualTypes: ["governance_framework", "framework"],
    expectedPrimaryVisualType: "governance_framework"
  },
  {
    id: "CASE_019",
    title: "Biến số nghiên cứu",
    domain: "general",
    inputText: "Yếu tố tin tưởng và tính tiện dụng tác động trực tiếp đến ý định sử dụng ứng dụng di động.",
    expectedBlocks: [{ type: "paragraph", textIncludes: ["tác động", "ý định"] }],
    expectedEntities: [
      { label: "Yếu tố tin tưởng", entityType: "concept" },
      { label: "ý định sử dụng", entityType: "outcome" }
    ],
    expectedRelations: [
      { fromLabel: "Yếu tố tin tưởng", toLabel: "ý định sử dụng", relationType: "influences" }
    ],
    expectedVisualTypes: ["framework", "cause_effect"],
    expectedPrimaryVisualType: "framework"
  },
  {
    id: "CASE_020",
    title: "Tiêu chí xếp hạng cảng biển",
    domain: "hang_hai",
    inputText: "Xếp hạng cảng biển dựa trên: Sản lượng hàng hóa, Quy mô cầu bến, Khả năng tiếp nhận tàu lớn.",
    expectedBlocks: [{ type: "list", textIncludes: ["Xếp hạng", "Sản lượng"] }],
    expectedEntities: [
      { label: "Sản lượng hàng hóa", entityType: "criterion" }
    ],
    expectedRelations: [],
    expectedVisualTypes: ["criteria_table", "summary_table"],
    expectedPrimaryVisualType: "criteria_table"
  },
  // --- REAL-WORLD VIETNAMESE ACADEMIC CASES (PHASE AUDIT) ---
  {
    id: "CASE_VMS_01",
    title: "Khung 2x3 Quản lý BĐATHH",
    domain: "hang_hai",
    inputText: "Cấu trúc quản lý BĐATHH được phân theo 2 nhóm chủ thể: Nhóm quản lý nhà nước và Nhóm doanh nghiệp. Mỗi nhóm được soi chiếu qua 3 giai đoạn: Quy hoạch, Đầu tư và Vận hành bảo trì.",
    expectedBlocks: [{ type: "matrix_hint", textIncludes: ["2 nhóm", "3 giai đoạn"] }],
    expectedEntities: [{ label: "Nhóm quản lý nhà nước", entityType: "concept" }],
    expectedRelations: [],
    expectedVisualTypes: ["policy_matrix", "matrix"],
    expectedPrimaryVisualType: "policy_matrix"
  },
  {
    id: "CASE_VMS_02",
    title: "Hiện trạng - Nguyên nhân - Giải pháp (Maritime)",
    domain: "hang_hai",
    inputText: "Hiện trạng: Luồng hàng hải bồi lắng nhanh. Nguyên nhân: Tác động của phù sa sông kết hợp triều cường. Giải pháp: Duy trì nạo vét định kỳ và kè hướng dòng.",
    expectedBlocks: [{ type: "paragraph", textIncludes: ["Hiện trạng", "Giải pháp"] }],
    expectedEntities: [{ label: "bồi lắng", entityType: "concept" }],
    expectedRelations: [{ fromLabel: "phù sa", toLabel: "bồi lắng", relationType: "causes" }],
    expectedVisualTypes: ["summary_table", "flowchart"],
    expectedPrimaryVisualType: "summary_table"
  },
  {
    id: "CASE_VMS_03",
    title: "Lộ trình chiến lược 2025-2045",
    domain: "chinh_sach_cong",
    inputText: "Giai đoạn 2015-2025 tập trung hoàn thiện hạ tầng; giải pháp đến 2030 nâng cao năng lực khai thác; tầm nhìn đến 2045 đạt chuẩn cảng biển xanh thông minh.",
    expectedBlocks: [{ type: "timeline", textIncludes: ["2025", "2045"] }],
    expectedEntities: [{ label: "2045", entityType: "time_point" }],
    expectedRelations: [],
    expectedVisualTypes: ["roadmap", "timeline"],
    expectedPrimaryVisualType: "roadmap"
  },
  {
    id: "CASE_VMS_04",
    title: "Bảng số liệu 5 năm (Cảng biển)",
    domain: "cang_bien",
    inputText: "Sản lượng thông qua năm 2018 là 500 triệu tấn, 2019 là 550 triệu, 2020 là 560 triệu, 2021 là 600 triệu, 2022 đạt 650 triệu tấn.",
    expectedBlocks: [{ type: "number_series", textIncludes: ["Sản lượng", "2022"] }],
    expectedEntities: [{ label: "2018", entityType: "time_point" }],
    expectedRelations: [],
    expectedVisualTypes: ["line_chart", "bar_chart"],
    expectedPrimaryVisualType: "line_chart"
  },
  {
    id: "CASE_VMS_05",
    title: "So sánh 3 nhóm chính sách",
    domain: "chinh_sach_cong",
    inputText: "So sánh chính sách A (Cưỡng chế), B (Khuyến khích) và C (Phối hợp). Chính sách A hiệu quả tức thời nhưng tốn kém; B bền vững nhưng chậm; C cân bằng nhất.",
    expectedBlocks: [{ type: "comparison", textIncludes: ["So sánh", "Chính sách"] }],
    expectedEntities: [{ label: "Chính sách A", entityType: "group" }],
    expectedRelations: [],
    expectedVisualTypes: ["comparison_table", "summary_table"],
    expectedPrimaryVisualType: "comparison_table"
  },
  {
    id: "CASE_VMS_06",
    title: "Quy trình cung cấp dịch vụ công",
    domain: "quan_ly_nha_nuoc",
    inputText: "Quy trình: 1. Nộp hồ sơ; 2. Tiếp nhận & Thẩm định; 3. Lãnh đạo phê duyệt; 4. Trả kết quả.",
    expectedBlocks: [{ type: "process", textIncludes: ["Quy trình", "Hồ sơ"] }],
    expectedEntities: [{ label: "Nộp hồ sơ", entityType: "process_step" }],
    expectedRelations: [],
    expectedVisualTypes: ["flowchart", "roadmap"],
    expectedPrimaryVisualType: "flowchart"
  },
  {
    id: "CASE_VMS_07",
    title: "Hệ thống Chủ thể - Công cụ - Kết quả",
    domain: "framework",
    inputText: "Cơ quan nhà nước (Chủ thể) sử dụng các Công cụ điều tiết (Luật, Thuế) tác động lên Thị trường (Đối tượng) để đạt được Kết quả phát triển ổn định.",
    expectedBlocks: [{ type: "paragraph", textIncludes: ["Chủ thể", "Kết quả"] }],
    expectedEntities: [{ label: "Cơ quan nhà nước", entityType: "organization" }],
    expectedRelations: [{ fromLabel: "Công cụ", toLabel: "Thị trường", relationType: "governs" }],
    expectedVisualTypes: ["input_process_output", "framework"],
    expectedPrimaryVisualType: "input_process_output"
  },
  {
    id: "CASE_VMS_08",
    title: "Ma trận tiêu chí đánh giá Cảng xanh",
    domain: "cang_bien",
    inputText: "Tiêu chí đánh giá gồm: Chỉ số năng lượng, Chỉ số môi trường và Chỉ số xã hội. Các mức độ đạt được: Cơ bản, Chuyên sâu, Xuất sắc.",
    expectedBlocks: [{ type: "matrix_hint", textIncludes: ["Tiêu chí", "Mức độ"] }],
    expectedEntities: [{ label: "Chỉ số năng lượng", entityType: "criterion" }],
    expectedRelations: [],
    expectedVisualTypes: ["policy_matrix", "matrix"],
    expectedPrimaryVisualType: "policy_matrix"
  },
  {
    id: "CASE_VMS_09",
    title: "Phân tích mối quan hệ học thuật phức tạp",
    domain: "general",
    inputText: "Sự phát triển bền vững phụ thuộc vào 3 yếu tố: Hiệu quả kinh tế, Công bằng xã hội và Bảo vệ môi trường. Hiệu quả kinh tế thúc đẩy Công bằng xã hội.",
    expectedBlocks: [{ type: "paragraph", textIncludes: ["phụ thuộc", "thúc đẩy"] }],
    expectedEntities: [{ label: "Hiệu quả kinh tế", entityType: "concept" }],
    expectedRelations: [{ fromLabel: "Hiệu quả kinh tế", toLabel: "Công bằng xã hội", relationType: "influences" }],
    expectedVisualTypes: ["framework", "flowchart"],
    expectedPrimaryVisualType: "framework"
  },
  {
    id: "CASE_VMS_10",
    title: "Đoạn văn mơ hồ cần AI suy luận",
    domain: "general",
    inputText: "Để nâng cao năng lực cạnh tranh cảng biển, cần một lộ trình bài bản từ việc cải thiện luồng lạch đến hiện đại hóa cầu cảng và sau cùng là chuyển đổi số toàn diện con người.",
    expectedBlocks: [{ type: "process", textIncludes: ["lộ trình", "cải thiện"] }],
    expectedEntities: [{ label: "cải thiện luồng lạch", entityType: "process_step" }],
    expectedRelations: [],
    expectedVisualTypes: ["roadmap", "flowchart"],
    expectedPrimaryVisualType: "roadmap"
  },
  // --- END OF REAL-WORLD CASES ---
  // --- ADDING 70 MORE CASES ---
  ...Array.from({ length: 70 }).map((_, i) => {
    const id = i + 31;
    const packs = [
      { domain: "quan_ly_nha_nuoc", type: "policy_matrix", entities: ["Nghị định", "Thông tư"], rel: "governs" },
      { domain: "hang_hai", type: "flowchart", entities: ["Tàu đến", "Hoa tiêu lên tàu", "Cập cầu"], rel: "sequence" },
      { domain: "kinh_te", type: "line_chart", entities: ["GDP", "Lạm phát"], rel: "influences" },
      { domain: "logistics", type: "input_process_output", entities: ["Nguyên liệu", "Sản xuất", "Thành phẩm"], rel: "transforms" },
      { domain: "cang_bien", type: "bar_chart", entities: ["Sản lượng", "Công suất"], rel: "measured_by" },
      { domain: "chinh_sach_cong", type: "roadmap", entities: ["Giai đoạn 1", "Giai đoạn 2"], rel: "sequence" },
      { domain: "phat_trien_ben_vung", type: "framework", entities: ["Môi trường", "Xã hội", "Quản trị"], rel: "supports" },
      { domain: "chuyen_doi_so", type: "maturity_model", entities: ["Số hóa", "Chuyển đổi số"], rel: "transforms" },
      { domain: "quan_tri_cong", type: "capability_model", entities: ["Hiệu quả", "Minh bạch"], rel: "measured_by" }
    ];
    
    const pack = packs[id % packs.length];
    const domain = pack.domain;
    
    return {
      id: `CASE_${String(id).padStart(3, '0')}`,
      title: `${pack.domain.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Analysis Case ${id}`,
      domain,
      inputText: `Nội dung về ${pack.domain} tập trung vào ${pack.entities.join(', ')}. Quá trình này thể hiện mối quan hệ ${pack.rel} giữa các thành phần.`,
      expectedBlocks: [{ type: pack.type.includes('chart') ? "number_series" : "process", textIncludes: pack.entities.slice(0, 1) }],
      expectedEntities: pack.entities.map(e => ({ label: e, entityType: "concept" })),
      expectedRelations: [{ fromLabel: pack.entities[0], toLabel: pack.entities[1], relationType: pack.rel as any }],
      expectedVisualTypes: [pack.type, "summary_table"],
      expectedPrimaryVisualType: pack.type
    };
  })
];
