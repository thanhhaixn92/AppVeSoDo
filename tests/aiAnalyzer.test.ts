import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAIAnalysis } from '../src/analysis/aiAnalyzer';

// Mock the global fetch
const globalFetch = vi.fn();
global.fetch = globalFetch;

describe('AI Analyzer', () => {
  beforeEach(() => {
    globalFetch.mockReset();
  });

  it('handles non-JSON HTML response without throwing', async () => {
    globalFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      headers: new Headers({ 'content-type': 'text/html' }),
      json: vi.fn().mockRejectedValue(new Error('Unexpected token <')),
      text: vi.fn().mockResolvedValue('<html><body>Bad Gateway</body></html>')
    });

    const result = await runAIAnalysis('test text');

    expect(result.warnings).toContain('AI_ROUTE_NON_JSON_RESPONSE');
    expect(result.recommendedFigures).toEqual([]);
  });

  it('handles quota error smoothly', async () => {
    globalFetch.mockResolvedValueOnce({
      ok: true, // HTTP 200 to prevent proxy intercept
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({
        ok: false,
        errorCode: 'AI_QUOTA_EXCEEDED',
        message: 'AI_RESOURCES_EXHAUSTED'
      })
    });

    const result = await runAIAnalysis('test text');

    expect(result.warnings).toContain('AI_QUOTA_EXCEEDED');
    expect(result.recommendedFigures).toEqual([]);
  });
});
