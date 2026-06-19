import { AIAnalysisResult, AIRecommendedFigure, VisualCandidate, FigureKind, VisualIntentType } from '../types';

/**
 * AIAnalyzer: Calls Gemini API to get structured visual recommendations.
 */
export interface AIAnalysisOptions {
  apiKey?: string;
  pipelineVersion?: string;
}

const CACHE_VERSION = "v1-2026-06";
const MAX_CACHE_ENTRIES = 20;

function getCacheKey(text: string, pipelineVersion: string): string {
  // Normalize line endings and trim. Keep internal whitespace intact for table semantics.
  const normalizedText = text.replace(/\r\n/g, '\n').trim();
  
  // A simple hash function for strings
  let hash = 0;
  for (let i = 0; i < normalizedText.length; i++) {
    hash = ((hash << 5) - hash) + normalizedText.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return `ai_cache_${CACHE_VERSION}_${pipelineVersion}_${hash}`;
}

function getCachedResult(key: string): AIAnalysisResult | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const entry = JSON.parse(cached);
    // TTL: 24 hours
    if (Date.now() - entry.createdAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(key);
      return null;
    }
    console.log("CACHE_HIT", "Đã dùng kết quả phân tích đã lưu");
    return entry.result;
  } catch (err) {
    return null;
  }
}

function saveToCache(key: string, result: AIAnalysisResult) {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`ai_cache_${CACHE_VERSION}`)) {
        keys.push(k);
      }
    }
    if (keys.length >= MAX_CACHE_ENTRIES) {
      let oldestKey = keys[0];
      let oldestTime = Infinity;
      for (const k of keys) {
        const item = localStorage.getItem(k);
        if (item) {
          const entry = JSON.parse(item);
          if (entry.createdAt < oldestTime) {
            oldestTime = entry.createdAt;
            oldestKey = k;
          }
        }
      }
      localStorage.removeItem(oldestKey);
    }
    localStorage.setItem(key, JSON.stringify({
      createdAt: Date.now(),
      result
    }));
  } catch (err) {
    // Ignore quota errors or disabled localStorage
  }
}

export async function runAIAnalysis(text: string, options: AIAnalysisOptions = {}): Promise<AIAnalysisResult> {
  const { apiKey, pipelineVersion = 'v2-parallel' } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (apiKey) {
    headers['x-gemini-key'] = apiKey;
  }

  try {
    const cacheKey = getCacheKey(text, pipelineVersion);
    const cachedResult = getCachedResult(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const response = await fetch('/api/gemini/extract-candidates', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, pipeline_version: pipelineVersion })
    });

    const contentType = response.headers.get("content-type");
    if (!response.ok && (!contentType || !contentType.includes("application/json"))) {
      console.warn("AI_ROUTE_NON_JSON_RESPONSE:", response.status);
      return {
        recommendedFigures: [],
        extractedEntities: [],
        extractedMetrics: [],
        extractedRelations: [],
        confidence: 0,
        rationale: "Lỗi kết nối máy chủ AI hoặc phản hồi không hợp lệ.",
        warnings: ['AI_ROUTE_NON_JSON_RESPONSE', 'AI_HTTP_ERROR']
      };
    }

    let result;
    try {
      result = await response.json();
    } catch (err) {
      console.error("AI Analysis JSON Parse Error:", err);
      return {
        recommendedFigures: [],
        extractedEntities: [],
        extractedMetrics: [],
        extractedRelations: [],
        confidence: 0,
        rationale: "Không thể phân tích dữ liệu AI.",
        warnings: ['AI_ROUTE_NON_JSON_RESPONSE']
      };
    }
    
    if (result.ok === false) {
      const errorCode = result.errorCode || '';
      const msg = result.message || '';
      console.warn(`AI extraction business error: ${errorCode} - ${msg}`);
      
      const retryAfter = result.retryAfterSeconds ? ` (Thử lại sau ${result.retryAfterSeconds}s)` : '';
      return {
        recommendedFigures: [],
        extractedEntities: [],
        extractedMetrics: [],
        extractedRelations: [],
        confidence: 0,
        rationale: "Dịch vụ AI đang tạm thời gián đoạn." + retryAfter,
        warnings: [errorCode || 'AI_ANALYSIS_FAILED']
      };
    }

    const rawCandidates = result.candidates || [];
    
    // Map raw AI items to AIRecommendedFigure
    const recommendedFigures: AIRecommendedFigure[] = rawCandidates.map((c: any) => {
      const figureType = mapVisualTypeToFigureKind(c.visualType);
      return {
        title: c.title || `Đề xuất AI: ${c.visualType}`,
        figureType: figureType,
        visualType: c.visualType,
        intent: mapVisualTypeToIntent(c.visualType),
        reason: c.reason,
        confidence: c.confidence || 0.7,
        extractedDataHint: c.entities // hints for later generation
      };
    });

    const finalResult = {
      detectedIntent: recommendedFigures[0]?.intent,
      recommendedFigures,
      extractedEntities: recommendedFigures.flatMap(f => (f.extractedDataHint as any[])?.map(e => e.label) || []),
      extractedMetrics: [],
      extractedRelations: [],
      confidence: recommendedFigures.length > 0 ? Math.max(...recommendedFigures.map(f => f.confidence)) : 0,
      rationale: "AI phân tích dựa trên ngữ nghĩa và ngữ cảnh học thuật của văn bản.",
      warnings: [] as string[]
    };
    
    saveToCache(cacheKey, finalResult);
    return finalResult;

  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return {
      recommendedFigures: [],
      extractedEntities: [],
      extractedMetrics: [],
      extractedRelations: [],
      confidence: 0,
      rationale: "Không thể kết nối với dịch vụ AI.",
      warnings: [error.message]
    };
  }
}

function mapVisualTypeToFigureKind(vt: string): FigureKind {
  if (vt.includes('chart')) return 'chart';
  if (vt.includes('table') || vt.includes('matrix')) return 'table';
  return 'diagram';
}

function mapVisualTypeToIntent(vt: string): VisualIntentType {
  const low = vt.toLowerCase();
  if (low.includes('flowchart') || low.includes('roadmap') || low.includes('sequence')) return 'process';
  if (low.includes('matrix') || low.includes('policy')) return 'matrix';
  if (low.includes('comparison')) return 'compare';
  if (low.includes('line_chart')) return 'trend';
  if (low.includes('relationship') || low.includes('link')) return 'relationship';
  return 'summary';
}
