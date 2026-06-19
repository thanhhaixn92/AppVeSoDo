import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { interpretCommandByAI } from '../src/commands/aiCommandInterpreter';
import { SavedFigure } from '../src/types';

describe('aiCommandInterpreter', () => {
  const mockFigure: SavedFigure = {
    id: 'fig-1',
    type: 'chart',
    title: 'Test Figure',
    chart: { type: 'bar_chart', data: [], config: {} } as any,
    theme: 'classic_academic_bw',
    createdAt: new Date().toISOString()
  };

  const apiKey = 'test-api-key';

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts ok: true response without success field', async () => {
    const mockResponse = {
      ok: true,
      data: {
        type: 'chart',
        explanation: 'Updated the chart',
        chart: { type: 'bar_chart', data: [], config: { title: 'New Title' } }
      }
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse
    });

    const result = await interpretCommandByAI('change title', mockFigure, apiKey);

    expect(result.errors).toHaveLength(0);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].afterSnapshot.title).toBe('New Title');
  });

  it('preserves legacy compat by accepting success: true', async () => {
    const mockResponse = {
      success: true,
      data: {
        type: 'chart',
        explanation: 'Updated the chart',
        chart: { type: 'bar_chart', data: [], config: { title: 'Legacy Title' } }
      }
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse
    });

    const result = await interpretCommandByAI('legacy update', mockFigure, apiKey);

    expect(result.errors).toHaveLength(0);
    expect(result.operations[0].afterSnapshot.title).toBe('Legacy Title');
  });

  it('handles ok: false with error message', async () => {
    const mockResponse = {
      ok: false,
      error: 'AI Model Error'
    };

    (global.fetch as any).mockResolvedValue({
      ok: true, // HTTP OK but API ok: false
      status: 200,
      json: async () => mockResponse
    });

    const result = await interpretCommandByAI('bad request', mockFigure, apiKey);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toBe('AI Model Error');
  });

  it('handles HTTP error gracefully', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error' })
    });

    const result = await interpretCommandByAI('trigger 500', mockFigure, apiKey);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toBe('Internal Server Error');
  });

  it('handles missing data payload with controlled error', async () => {
    const mockResponse = {
      ok: true
      // data missing
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse
    });

    const result = await interpretCommandByAI('missing data', mockFigure, apiKey);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Không có dữ liệu trả về');
  });
});
