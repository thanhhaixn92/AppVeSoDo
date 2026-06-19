import { VisualCandidate, RankedVisualCandidate } from '../types';

export function getCandidateUserTitle(cand: VisualCandidate | RankedVisualCandidate, sourceText?: string): string {
  let fallback = cand.title || "Cách trình bày khác";

  // Clean up technical artifacts in fallback title
  if (fallback.includes("SUMMARY_TABLE")) fallback = fallback.replace(/SUMMARY_TABLE/g, "Bảng tóm tắt");
  if (fallback.includes("LINE_CHART")) fallback = fallback.replace(/LINE_CHART/g, "Biểu đồ xu hướng");
  if (fallback.includes("COLUMN_CHART")) fallback = fallback.replace(/COLUMN_CHART/g, "Biểu đồ cột");
  if (fallback.includes("BAR_CHART")) fallback = fallback.replace(/BAR_CHART/g, "Biểu đồ cột ngang");
  if (fallback.includes("FLOW_DIAGRAM")) fallback = fallback.replace(/FLOW_DIAGRAM/g, "Sơ đồ luồng");
  if (fallback.includes("DIAGRAM")) fallback = fallback.replace(/DIAGRAM/g, "Sơ đồ");
  if (fallback.includes("ĐỀ XUẤT AI:")) fallback = fallback.replace(/ĐỀ XUẤT AI:/g, "").trim();

  // Guard against year 2030 hallucination
  if (fallback.includes("2030") && sourceText && !sourceText.includes("2030")) {
     fallback = fallback.replace(/\s?-?\s?2030\s?/g, " ");
     // if the title becomes too short or empty
     if (fallback.trim().length <= 5) {
        if (cand.data?.type === 'chart') fallback = "Biểu đồ dữ liệu";
        else if (cand.data?.type === 'table') fallback = "Bảng dữ liệu";
        else fallback = "Sơ đồ trực quan";
     }
  }

  return fallback.trim();
}

export function getCandidateDescriptionAndReason(cand: VisualCandidate | RankedVisualCandidate) {
  const type = cand.data?.type;
  if (type === "chart") {
    const cType = cand.data?.chart?.config?.type;
    if (cType === "line" || cType === "area") {
      return {
        description: "Theo dõi xu hướng thay đổi theo thời gian.",
        reason: "Phù hợp khi dữ liệu có các mốc thời gian liên tục."
      };
    } else if (cType === "pie") {
      return {
        description: "Xem tỷ trọng các thành phần.",
        reason: "Phù hợp khi cần so sánh tỷ lệ phần trăm."
      };
    } else {
      return {
        description: "So sánh giá trị giữa các nhóm hoặc mốc dữ liệu.",
        reason: "Trình bày trực quan, dễ so sánh số liệu rời rạc."
      };
    }
  } else if (type === "table") {
    return {
      description: "Hiển thị số liệu chi tiết, đầy đủ nhất.",
      reason: "Giúp người đọc dễ dàng tra cứu con số chính xác."
    };
  } else if (type === "diagram") {
    return {
      description: "Mô tả quy trình, cấu trúc hoặc mối quan hệ.",
      reason: "Giúp đơn giản hóa các ý tưởng phức tạp, nhiều bước."
    };
  }

  return {
    description: "Một cách trình bày trực quan cho dữ liệu hiện tại.",
    reason: "Được tạo từ nội dung bạn đã cung cấp."
  };
}
