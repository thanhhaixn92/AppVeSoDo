/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GEMINI_PRIMARY_MODEL = process.env.GEMINI_PRIMARY_MODEL || 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash-lite';

// Initialize Express
const app = express();

// Security Baselines: Set basic security headers (Helmet behavior natively)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '10mb' }));

const PORT = Number(process.env.PORT || 3000);

// Simple In-memory Rate Limiter to protect Gemini API route against resource exhaustion/abuse
const ipLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15; // 15 requests per minute

const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown-ip').split(',')[0].trim();
  const now = Date.now();
  const userLimit = ipLimits.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    ipLimits.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Quá nhiều yêu cầu thử lại. Hãy đợi 1 phút trước khi tiếp tục gửi yêu cầu AI!'
    });
  }

  userLimit.count += 1;
  next();
};

// Dynamic Gemini client resolution to support both environment secrets and client-supplied console keys
function getAi(headers?: Record<string, any>): GoogleGenAI {
  const clientKey = headers ? headers['x-gemini-key'] : undefined;
  const apiKey = clientKey || process.env.GEMINI_API_KEY || process.env.GEMINI_PRIMARY || process.env.GEMINI_FALLBACK;
  if (!apiKey) {
    throw new Error('CRITICAL_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * callGeminiWithFallback: Executes AI request with automatic recovery to fallback model
 */
async function callGeminiWithFallback(
  req: express.Request,
  payload: {
    systemInstruction: string;
    prompt: string;
    schema: any;
    temperature?: number;
  }
) {
  let ai;
  try {
    ai = getAi(req.headers);
  } catch (err: any) {
    throw err; // Key missing is unrecoverable here
  }

  const { systemInstruction, prompt, schema, temperature = 0.1 } = payload;
  
  const attempt = async (modelName: string) => {
    return await ai.models.generateContent({
      model: modelName,
      contents: [{ text: prompt }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature,
      }
    });
  };

  try {
    const result = await attempt(GEMINI_PRIMARY_MODEL);
    return {
      ok: true,
      modelUsed: GEMINI_PRIMARY_MODEL,
      fallbackUsed: false,
      text: result.text
    };
  } catch (error: any) {
    const isQuotaError = (err: any) => {
      const msg = String(err.message || '').toLowerCase();
      const status = err.status || 0;
      return (
        status === 429 ||
        msg.includes('resource_exhausted') ||
        msg.includes('quota') ||
        msg.includes('rate limit')
      );
    };

    const isRecoverableByFallback = (err: any) => {
      const msg = String(err.message || '').toLowerCase();
      const status = err.status || 0;
      return (
        status === 503 || 
        status === 500 ||
        status === 502 ||
        status === 504 ||
        msg.includes('unavailable') ||
        msg.includes('timeout') ||
        msg.includes('overloaded')
      );
    };

    if (isQuotaError(error)) {
      console.warn(`Gemini primary quota exceeded: model=${GEMINI_PRIMARY_MODEL} error=${error.message}`);
      return {
        ok: false,
        errorCode: 'AI_QUOTA_EXCEEDED',
        message: 'AI_RESOURCES_EXHAUSTED: Đã hết lượt dùng AI. Quota bị giới hạn.',
        primaryModel: GEMINI_PRIMARY_MODEL,
        retryAfterSeconds: 60
      };
    }

    if (isRecoverableByFallback(error)) {
      if (!GEMINI_FALLBACK_MODEL || GEMINI_PRIMARY_MODEL === GEMINI_FALLBACK_MODEL) {
        console.warn(`Gemini primary failed but fallback skipped (same model or empty): model=${GEMINI_PRIMARY_MODEL} error=${error.message}`);
        console.log(`FALLBACK_SKIPPED_SAME_MODEL`);
        return {
          ok: false,
          errorCode: 'AI_HTTP_ERROR',
          message: 'Lỗi kết nối API hoặc phản hồi không hợp lệ.',
          primaryModel: GEMINI_PRIMARY_MODEL
        };
      }
      console.warn(`Gemini primary failed: model=${GEMINI_PRIMARY_MODEL} error=${error.message}`);
      console.log(`Retrying with fallback model: ${GEMINI_FALLBACK_MODEL}`);
      try {
        const result = await attempt(GEMINI_FALLBACK_MODEL);
        return {
          ok: true,
          modelUsed: GEMINI_FALLBACK_MODEL,
          fallbackUsed: true,
          fallbackReason: error.message,
          text: result.text
        };
      } catch (fallbackError: any) {
        console.error(`Gemini fallback failed: model=${GEMINI_FALLBACK_MODEL} error=${fallbackError.message}`);
        return {
          ok: false,
          errorCode: 'AI_TEMPORARILY_UNAVAILABLE',
          message: 'AI đang quá tải hoặc hết quota. Ứng dụng sẽ tiếp tục dùng phân tích bằng luật.',
          primaryModel: GEMINI_PRIMARY_MODEL,
          fallbackModel: GEMINI_FALLBACK_MODEL,
          retryAfterSeconds: 60
        };
      }
    }

    // Not recoverable or other error
    throw error;
  }
}

// Define JSON Schema for Gemini Academic Visual Generation
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      enum: ['chart', 'diagram', 'table'],
      description: 'Phân loại công cụ trực quan phù hợp nhất cho mô tả: chart (biểu đồ dữ liệu), diagram (sơ đồ quy trình/luồng), table (bảng thông số).',
    },
    chart: {
      type: Type.OBJECT,
      properties: {
        config: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['line', 'bar', 'pie', 'scatter'] },
            title: { type: Type.STRING, description: 'Tiêu đề biểu đồ' },
            xAxisLabel: { type: Type.STRING, description: 'Nhãn trục X' },
            yAxisLabel: { type: Type.STRING, description: 'Nhãn trục Y' },
            showGrid: { type: Type.BOOLEAN },
            isDoubleColumn: { type: Type.BOOLEAN },
            caption: { type: Type.STRING, description: 'Chú thích biểu đồ, ví dụ: "Hình 1: Đánh giá hiệu năng..."' },
          },
          required: ['type', 'title', 'caption'],
        },
        data: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING, description: 'Tên danh mục hoặc mốc thời gian/trị số' },
              value: { type: Type.NUMBER, description: 'Dữ liệu đo đạc' },
              error: { type: Type.NUMBER, description: 'Sai số học thuật (tùy chọn)' },
            },
            required: ['label', 'value'],
          }
        }
      }
    },
    diagram: {
      type: Type.OBJECT,
      properties: {
        caption: { type: Type.STRING, description: 'Chú thích sơ đồ học thuật, ví dụ: "Hình 2: Sơ đồ khối hệ thống..."' },
        nodes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: 'ID duy nhất, ví dụ: n1, n2, n3...' },
              type: { type: Type.STRING, enum: ['rect', 'circle', 'cylinder', 'diamond', 'actor', 'text'] },
              label: { type: Type.STRING, description: 'Nội dung chữ hiển thị trong khối' },
              x: { type: Type.NUMBER, description: 'Tọa độ X tương đối (khoảng 50 đến 800)' },
              y: { type: Type.NUMBER, description: 'Tọa độ Y tương đối (khoảng 50 đến 500)' },
              w: { type: Type.NUMBER, description: 'Chiều rộng khối (thường 100-180)' },
              h: { type: Type.NUMBER, description: 'Chiều cao khối (thường 40-100)' },
              fillColor: { type: Type.STRING, description: 'Màu nền gợi ý' },
              strokeColor: { type: Type.STRING, description: 'Màu viền gợi ý' },
            },
            required: ['id', 'type', 'label', 'x', 'y', 'w', 'h'],
          }
        },
        connections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: 'ID liên kết, ví dụ: c1, c2...' },
              fromId: { type: Type.STRING, description: 'ID của nút xuất phát' },
              toId: { type: Type.STRING, description: 'ID của nút đích' },
              label: { type: Type.STRING, description: 'Nhãn trên mũi tên (ví dụ: "Có", "Không")' },
              style: { type: Type.STRING, enum: ['solid', 'dashed', 'dotted'] },
              arrowEnd: { type: Type.BOOLEAN, description: 'Có mũi tên ở cuối không' },
            },
            required: ['id', 'fromId', 'toId', 'style', 'arrowEnd'],
          }
        }
      }
    },
    table: {
      type: Type.OBJECT,
      properties: {
        caption: { type: Type.STRING, description: 'Chú thích bảng biểu học thuật, ví dụ: "Bảng 1: So sánh đặc trưng..."' },
        columns: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              key: { type: Type.STRING, description: 'Mã cột để khớp với dữ liệu hàng' },
              header: { type: Type.STRING, description: 'Tiêu đề hiển thị cột' },
              align: { type: Type.STRING, enum: ['left', 'center', 'right'] },
            },
            required: ['key', 'header', 'align']
          }
        },
        rows: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            description: 'Các hàng dữ liệu, chứa các cặp key-value tương ứng với key của các cột',
          }
        }
      }
    },
    explanation: {
      type: Type.STRING,
      description: 'Giải thích học thuật ngắn gọn lý do chọn loại trình bày trực quan và cách xây dựng này.',
    }
  },
  required: ['type', 'explanation']
};

const extractionSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      visualType: { type: Type.STRING, enum: ['flowchart', 'hierarchy', 'matrix', 'policy_matrix', 'roadmap', 'line_chart', 'bar_chart', 'pie_chart', 'summary_table', 'framework', 'cycle', 'input_process_output'] },
      reason: { type: Type.STRING },
      confidence: { type: Type.NUMBER },
      entities: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            entityType: { type: Type.STRING }
          }
        }
      }
    },
    required: ['visualType', 'reason', 'confidence']
  }
};

function normalizeAiResponse(result: any): any {
  if (!result || typeof result !== 'object') {
    throw new Error('Đầu ra của AI không đúng cấu trúc dạng đối tượng.');
  }

  const supportedTypes = ['chart', 'diagram', 'table'];
  if (!supportedTypes.includes(result.type)) {
    result.type = 'diagram'; // Fallback
  }

  result.explanation = result.explanation || 'Đã kiến tạo thành công hình học thuật.';

  if (result.type === 'chart') {
    if (!result.chart || typeof result.chart !== 'object') {
      result.chart = {};
    }
    if (!result.chart.config || typeof result.chart.config !== 'object') {
      result.chart.config = {};
    }
    const cfg = result.chart.config;
    cfg.type = ['line', 'bar', 'pie', 'scatter'].includes(cfg.type) ? cfg.type : 'bar';
    cfg.title = cfg.title || 'Biểu đồ nghiên cứu thống kê';
    cfg.caption = cfg.caption || 'Biểu đồ trực quan hóa dữ liệu thống kê';
    cfg.xAxisLabel = cfg.xAxisLabel || 'Trục hoành';
    cfg.yAxisLabel = cfg.yAxisLabel || 'Trục tung';
    cfg.showGrid = typeof cfg.showGrid === 'boolean' ? cfg.showGrid : true;
    cfg.isDoubleColumn = typeof cfg.isDoubleColumn === 'boolean' ? cfg.isDoubleColumn : false;

    if (!Array.isArray(result.chart.data)) {
      result.chart.data = [];
    }
    result.chart.data = result.chart.data.map((d: any) => ({
      label: String(d?.label || ''),
      value: typeof d?.value === 'number' ? d.value : 0,
      error: typeof d?.error === 'number' ? d.error : undefined,
    }));
  }

  if (result.type === 'diagram') {
    if (!result.diagram || typeof result.diagram !== 'object') {
      result.diagram = {};
    }
    result.diagram.caption = result.diagram.caption || 'Sơ đồ tiến trình nghiên cứu';
    if (!Array.isArray(result.diagram.nodes)) {
      result.diagram.nodes = [];
    }
    if (!Array.isArray(result.diagram.connections)) {
      result.diagram.connections = [];
    }

    const nodeIds = new Set<string>();
    result.diagram.nodes = result.diagram.nodes.map((n: any, idx: number) => {
      const id = String(n?.id || `n_${idx + 1}`);
      nodeIds.add(id);
      return {
        id,
        type: ['rect', 'circle', 'cylinder', 'diamond', 'actor', 'text'].includes(n?.type) ? n.type : 'rect',
        label: String(n?.label || ''),
        x: typeof n?.x === 'number' ? n.x : 100 + idx * 80,
        y: typeof n?.y === 'number' ? n.y : 150,
        w: typeof n?.w === 'number' ? n.w : 150,
        h: typeof n?.h === 'number' ? n.h : 50,
        fillColor: n?.fillColor ? String(n.fillColor) : undefined,
        strokeColor: n?.strokeColor ? String(n.strokeColor) : undefined,
        outlineStyle: ['solid', 'dashed', 'none'].includes(n?.outlineStyle) ? n.outlineStyle : undefined,
      };
    });

    result.diagram.connections = result.diagram.connections.map((c: any, idx: number) => {
      const fromId = String(c?.fromId || '');
      const toId = String(c?.toId || '');
      return {
        id: String(c?.id || `c_${idx + 1}`),
        fromId,
        toId,
        label: c?.label ? String(c.label) : undefined,
        style: ['solid', 'dashed', 'dotted'].includes(c?.style) ? c.style : 'solid',
        arrowEnd: typeof c?.arrowEnd === 'boolean' ? c.arrowEnd : true,
      };
    }).filter((c: any) => nodeIds.has(c.fromId) && nodeIds.has(c.toId));
  }

  if (result.type === 'table') {
    if (!result.table || typeof result.table !== 'object') {
      result.table = {};
    }
    result.table.caption = result.table.caption || 'Bảng so sánh thông số nghiên cứu';
    if (!Array.isArray(result.table.columns)) {
      result.table.columns = [];
    }
    if (!Array.isArray(result.table.rows)) {
      result.table.rows = [];
    }

    result.table.columns = result.table.columns.map((col: any, idx: number) => ({
      key: String(col?.key || `col_${idx + 1}`),
      header: String(col?.header || ''),
      align: ['left', 'center', 'right'].includes(col?.align) ? col.align : 'center',
    }));

    result.table.rows = result.table.rows.map((row: any) => {
      const cleanRow: Record<string, any> = {};
      result.table.columns.forEach((col: any) => {
        cleanRow[col.key] = row && row[col.key] !== undefined ? String(row[col.key]) : '';
      });
      return cleanRow;
    });
  }

  
  return result;
}
function validateAiResponse(result: any): void {
  if (!result || typeof result !== 'object') {
    throw new Error('AI response malformed');
  }
  const allowedTypes = ['chart', 'diagram', 'table'];
  if (!allowedTypes.includes(result.type)) {
    throw new Error('Invalid figure type');
  }
  // Chart validation
  if (result.type === 'chart') {
    if (!result.chart) {
      throw new Error('Missing chart data');
    }
    const cfg = result.chart.config || {};
    if (!cfg.type || !['line', 'bar', 'pie', 'scatter'].includes(cfg.type)) {
      throw new Error('Invalid chart config type');
    }
    if (!cfg.title || typeof cfg.title !== 'string') {
      throw new Error('Chart title missing');
    }
    if (!cfg.caption || typeof cfg.caption !== 'string') {
      throw new Error('Chart caption missing');
    }
    if (!Array.isArray(result.chart.data)) {
      throw new Error('Chart data must be an array');
    }
    result.chart.data.forEach((d: any) => {
      if (typeof d.label !== 'string') {
        throw new Error('Chart data label invalid');
      }
      if (typeof d.value !== 'number' || !Number.isFinite(d.value)) {
        throw new Error('Chart data value invalid');
      }
      if (d.error !== undefined && (typeof d.error !== 'number' || !Number.isFinite(d.error))) {
        throw new Error('Chart data error invalid');
      }
    });
  }
  // Diagram validation
  if (result.type === 'diagram') {
    if (!result.diagram) {
      throw new Error('Missing diagram data');
    }
    if (!Array.isArray(result.diagram.nodes)) {
      throw new Error('Diagram nodes must be an array');
    }
    const nodeIds = new Set<string>();
    result.diagram.nodes.forEach((n: any) => {
      if (!n.id || typeof n.id !== 'string') {
        throw new Error('Diagram node id missing');
      }
      if (nodeIds.has(n.id)) {
        throw new Error('Duplicate diagram node id');
      }
      nodeIds.add(n.id);
      if (!['rect', 'circle', 'cylinder', 'diamond', 'actor', 'text'].includes(n.type)) {
        throw new Error('Invalid diagram node type');
      }
      if (typeof n.label !== 'string') {
        throw new Error('Diagram node label missing');
      }
      if (typeof n.x !== 'number' || typeof n.y !== 'number' || typeof n.w !== 'number' || typeof n.h !== 'number') {
        throw new Error('Diagram node dimensions invalid');
      }
    });
    if (!Array.isArray(result.diagram.connections)) {
      throw new Error('Diagram connections must be an array');
    }
    result.diagram.connections.forEach((c: any) => {
      if (!c.id || typeof c.id !== 'string') {
        throw new Error('Diagram connection id missing');
      }
      if (!c.fromId || !c.toId) {
        throw new Error('Diagram connection endpoints missing');
      }
      if (!nodeIds.has(c.fromId) || !nodeIds.has(c.toId)) {
        throw new Error('Diagram connection references unknown node');
      }
      if (!['solid', 'dashed', 'dotted'].includes(c.style)) {
        throw new Error('Invalid diagram connection style');
      }
      if (typeof c.arrowEnd !== 'boolean') {
        throw new Error('Diagram connection arrowEnd invalid');
      }
    });
  }
  // Table validation
  if (result.type === 'table') {
    if (!result.table) {
      throw new Error('Missing table data');
    }
    if (!Array.isArray(result.table.columns) || !Array.isArray(result.table.rows)) {
      throw new Error('Table columns and rows must be arrays');
    }
    result.table.columns.forEach((col: any) => {
      if (!col.key || !col.header || !col.align) {
        throw new Error('Table column missing fields');
      }
      if (!['left', 'center', 'right'].includes(col.align)) {
        throw new Error('Invalid column alignment');
      }
    });
  }
}

// API Endpoint for extracting multiple Visual Intent Candidates from text
app.post('/api/gemini/extract-candidates', rateLimiter, async (req, res) => {
  try {
    const { text, blocks, pipeline_version } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Thiếu nội dung văn bản đầu vào.' });
    }

    // Security Baseline: Limit text length to avoid resource exhaustion
    if (text.length > 30000) {
      return res.status(400).json({ error: 'Nội dung văn bản quá dài (tối đa 30,000 ký tự).' });
    }

    const systemPrompt = `Bạn là chuyên gia phân tách ý tưởng trực quan học thuật (Academic Visual Intent Extractor).
Nhiệm vụ: Cung cấp ít nhất 2-3 phương án trực quan hóa (Visual Intents) khác nhau cho văn bản được cung cấp.
Văn bản đầu vào là các đoạn trích từ luận văn, báo cáo khoa học hoặc đề án.

Ứng viên phải tuân thủ các visualType học thuật:
- flowchart, roadmap: Cho quy trình, tiến trình.
- policy_matrix: Cho sự đối chiếu chính sách, ma trận.
- summary_table: Cho việc hệ thống hóa thông số.
- line_chart, bar_chart: Cho xu hướng, so sánh số lượng.
- framework, maturity_model: Cho cấu trúc lý thuyết vĩ mô.

Mỗi ứng viên cần có độ tự tin (confidence 0-1) và giải thích lý do (reason) tại sao mẫu đó lại phù hợp.
Nếu có thể, hãy liệt kê các thực thể (entities) cốt lõi cần xuất hiện trong hình.
Trả về một mảng JSON các đối tượng.`;

    const aiResult = await callGeminiWithFallback(req, {
      systemInstruction: systemPrompt,
      prompt: `Input Text: "${text}"\nPipeline: ${pipeline_version}`,
      schema: extractionSchema,
      temperature: 0.1
    });

    if (!aiResult.ok) {
      if (aiResult.errorCode === 'AI_QUOTA_EXCEEDED') {
        // Return 200 for quota errors to prevent proxy intercept
        return res.status(200).json(aiResult);
      }
      return res.status(503).json(aiResult);
    }

    const textOutput = aiResult.text;
    if (!textOutput) throw new Error('AI Error');
    const candidates = JSON.parse(textOutput);
    res.json({
      ok: true,
      modelUsed: aiResult.modelUsed,
      fallbackUsed: aiResult.fallbackUsed,
      candidates: candidates.slice(0, 4)
    });
  } catch (error: any) {
    if (error.message === 'CRITICAL_KEY_MISSING') {
      return res.status(401).json({ error: 'Keys missing or invalid.', key_required: true });
    }
    console.error('Extraction Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API Endpoint for generating Academic Figures via Gemini
app.post('/api/gemini/generate', rateLimiter, async (req, res) => {
  try {
    const { prompt, currentContext, editMode } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Yêu cầu nhập mô tả ý tưởng vẽ hợp lệ.' });
    }

    let ai;
    try {
      ai = getAi(req.headers);
    } catch (keyErr: any) {
      if (keyErr.message === 'CRITICAL_KEY_MISSING') {
        return res.status(401).json({
          key_required: true,
          error: 'Thiếu API Key thiết lập hoặc đã hết hạn. Hãy nhập một Gemini API Key để tiếp tục sử dụng AI!'
        });
      }
      throw keyErr;
    }
    
    let systemPrompt = `Bạn là một trợ lý AI chuyên thiết kế hình ảnh, biểu đồ, sơ đồ khối và bảng cho các luận án thạc sĩ, tiến sĩ và đề án nghiên cứu khoa học.
Nhiệm vụ của bạn là lắng nghe mô tả ý tưởng của nhà nghiên cứu và chuyển đổi nó thành cấu trúc dữ liệu JSON chính xác để tự động dựng hình.

HÃY LỰA CHỌN giữa 3 loại công cụ:
1. "chart": Dùng khi mô tả chứa số liệu thống kê, biểu đồ biến thiên (Line, Bar, Pie, Scatter).
2. "diagram": Dùng khi mô tả quy trình, lưu đồ, sơ đồ kiến trúc hệ thống, sơ đồ khối thuật toán hoặc mindmap phân rã. Gợi ý tọa độ x, y hợp lý, không chồng chéo lên nhau. Nút nên cách nhau ít nhất 150px.
3. "table": Dùng khi mô tả sự so sánh đặc trưng, so sánh tham số, hoặc tổng hợp thông tin văn bản dạng bảng.

CHÚ Ý QUY CHUẨN KHOA HỌC:
- Đặt caption tinh tế, trang trọng chuẩn văn phong học thuật (ví dụ: "Hình 1: Tiến trình thuật toán...", "Bảng 2: So sánh độ chính xác...").
- Khi vẽ SƠ ĐỒ (diagram), hãy sử dụng chính xác các quan hệ thực thể (Academic Semantic Relations): governs, drives, transforms, supports, measured_by, depends_on, sequencing cho các mũi tên kết nối.
- Tự động sắp xếp tọa độ X từ trái qua phải (hoặc từ trên xuống dưới) và tính toán khoảng cách phù hợp để mũi tên kết nối trông mạch lạc.
Tất cả các câu trả lời phải tuân thủ nghiêm ngặt theo JSON Schema.`;

    if (editMode) {
      systemPrompt += `

ĐẶC BIỆT - CHẾ ĐỘ CHỈNH SỬA (EDIT MODE):
Nhà nghiên cứu muốn bạn CHỈNH SỬA hình học thuật hiện tại dựa trên một yêu cầu bổ sung hoặc thay đổi cụ thể.
Bạn đã được cung cấp cấu trúc chi tiết của hình vẽ hiện tại trong phần 'Bối cảnh hiện tại' ('currentContext'). 
Nhiệm vụ của bạn:
1. Đọc và hiểu sâu sắc hình vẽ hiện tại (bao gồm loại hình vẽ, tiêu đề, caption, các cột/hàng trong bảng, các data points trong biểu đồ, hoặc các nút/liên kết trong sơ đồ).
2. Thực hiện chính xác yêu cầu chỉnh sửa/bổ sung của người dùng (Ví dụ: "thêm nút X kết nối từ Y", "thay đổi giá trị quý 4 thành 95", "thêm cột Độ chính xác").
3. Chỉ chỉnh sửa những thành phần liên quan trực tiếp đến yêu cầu. Giữ nguyên tối đa các thành phần và vị trí hiện có để duy trì tính liên tục của tài liệu nghiên cứu.
4. Trả về cấu trúc JSON hoàn chỉnh sau khi đã cập nhật, giữ nguyên 'type' của hình gốc trừ khi có yêu cầu chuyển đổi đặc biệt.`;
    }

    const aiResult = await callGeminiWithFallback(req, {
      systemInstruction: systemPrompt,
      prompt: `Yêu cầu nhà nghiên cứu: "${prompt}"\nChế độ chỉnh sửa: ${editMode ? 'Bật' : 'Tắt'}\nBối cảnh hình vẽ hiện tại (currentContext): ${JSON.stringify(currentContext || {})}`,
      schema: responseSchema,
      temperature: 0.2
    });

    if (!aiResult.ok) {
      if (aiResult.errorCode === 'AI_QUOTA_EXCEEDED') {
        // Return 200 for quota errors to prevent proxy intercept
        return res.status(200).json(aiResult);
      }
      return res.status(503).json(aiResult);
    }

    const textOutput = aiResult.text;
    if (!textOutput) {
      throw new Error('Không có kết quả trả về từ mô hình AI.');
    }

    const rawResult = JSON.parse(textOutput);
    validateAiResponse(rawResult);
    const normalized = normalizeAiResponse(rawResult);
    res.json({
      ok: true,
      modelUsed: aiResult.modelUsed,
      fallbackUsed: aiResult.fallbackUsed,
      data: normalized
    });
  } catch (error: any) {
    if (error.message === 'CRITICAL_KEY_MISSING') {
      return res.status(401).json({
        key_required: true,
        error: 'Thiếu API Key thiết lập hoặc đã hết hạn. Hãy nhập một Gemini API Key để tiếp tục sử dụng AI!'
      });
    }
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message || 'Lỗi xử lý yêu cầu.' });
  }
});

// Configure Vite or Static Asset delivery
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    // DEV MODE: Setup Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // PROD MODE: Serve built frontend
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Academic Visual server] Running on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
});
