import { SavedFigure } from '../types';

export const INITIAL_SAVED_FIGURES: SavedFigure[] = [
  {
    id: 'f1',
    title: 'Sơ đồ khối Mô hình xử lý ngôn ngữ tự nhiên',
    type: 'diagram',
    theme: 'apa',
    createdAt: new Date().toLocaleDateString('vi-VN'),
    diagram: {
      caption: 'Hình 1. Quy trình huấn luyện gộp sử dụng mô hình học sâu BERT cải tiến lớp phân loại',
      nodes: [
        { id: 'N001', type: 'rect', label: 'Văn bản thô (Trích xuất PDF)', x: 60, y: 150, w: 180, h: 50, fillColor: '#f8fafc', strokeColor: '#1e293b' },
        { id: 'N002', type: 'diamond', label: 'Xử lý nhiễu & Chuẩn hóa?', x: 280, y: 135, w: 160, h: 80, fillColor: '#f1f5f9', strokeColor: '#1e293b' },
        { id: 'N003', type: 'circle', label: 'Tokenizer', x: 490, y: 150, w: 90, h: 50, fillColor: '#f1f5f9', strokeColor: '#1e293b' },
        { id: 'N004', type: 'cylinder', label: 'BERT Embedding', x: 630, y: 140, w: 110, h: 70, fillColor: '#e2e8f0', strokeColor: '#1e293b' },
        { id: 'N005', type: 'rect', label: 'Phân loại cảm biên (FC Layer)', x: 350, y: 280, w: 200, h: 50, fillColor: '#f8fafc', strokeColor: '#1e293b' }
      ],
      connections: [
        { id: 'L001', fromId: 'N001', toId: 'N002', style: 'solid', arrowEnd: true, label: 'Đầu vào' },
        { id: 'L002', fromId: 'N002', toId: 'N003', style: 'solid', arrowEnd: true, label: 'Đạt chuẩn' },
        { id: 'L003', fromId: 'N002', toId: 'N005', style: 'dashed', arrowEnd: true, label: 'Lỗi định dạng' },
        { id: 'L004', fromId: 'N003', toId: 'N004', style: 'solid', arrowEnd: true },
        { id: 'L005', fromId: 'N004', toId: 'N005', style: 'solid', arrowEnd: true }
      ]
    }
  },
  {
    id: 'f2',
    title: 'Biểu đồ Hiệu năng của thuật toán LSTM và GRU',
    type: 'chart',
    theme: 'ieee',
    createdAt: new Date().toLocaleDateString('vi-VN'),
    chart: {
      config: {
        type: 'line',
        title: 'Độ chính xác theo kích thước tệp huấn luyện',
        xAxisLabel: 'Kích thước mẫu (N nghìn hàng)',
        yAxisLabel: 'Độ chính xác F1-Score (%)',
        showGrid: true,
        isDoubleColumn: false,
        caption: 'FIGURE 2. Comparison of validation F1-scores across different training size batches.'
      },
      data: [
        { label: '10k', value: 72.4, error: 1.5 },
        { label: '30k', value: 79.8, error: 1.2 },
        { label: '50k', value: 84.5, error: 0.8 },
        { label: '70k', value: 89.1, error: 1.1 },
        { label: '100k', value: 94.6, error: 0.5 }
      ]
    }
  },
  {
    id: 'f3',
    title: 'Bảng đặc trưng thông số kỹ thuật phần cứng',
    type: 'table',
    theme: 'apa',
    createdAt: new Date().toLocaleDateString('vi-VN'),
    table: {
      caption: 'Bảng 1. Cấu hình máy chủ tính toán hiệu năng cao phục vụ thí nghiệm huấn luyện',
      columns: [
        { key: 'param', header: 'Thông số / Tài nguyên', align: 'left' },
        { key: 'baseline', header: 'Máy chủ Baseline', align: 'center' },
        { key: 'proposed', header: 'Cụm Cluster đề xuất', align: 'center' },
        { key: 'status', header: 'Tình trạng tối ưu', align: 'center' }
      ],
      rows: [
        { param: 'Vi xử lý (CPU)', baseline: 'Intel Xeon 8 Core', proposed: 'AMD EPYC 64 Core', status: 'Nhanh gấp 8x' },
        { param: 'Bộ nhớ trong (RAM)', baseline: '32 GB DDR4', proposed: '256 GB DDR5 ECC', status: 'Băng thông rộng' },
        { param: 'Bộ nhớ đồ họa (VRAM)', baseline: '1x RTX 3090 24GB', proposed: '4x A100 SXM4 80GB', status: 'Chuyên dụng AI' },
        { param: 'SSD NVMe Tốc độ cao', baseline: '1 TB Gen 3', proposed: '4 TB RAID-10 Gen 4', status: 'Đọc/Ghi 7000MB/s' }
      ]
    }
  }
];
