import { describe, expect, it } from 'vitest';
import { validateRenderableFigurePayload } from '../src/lib/workflowUtils';

// Helper to create a generic figure object
const createFigure = (type: string, payload: any) => ({
  id: `test-${type}`,
  title: 'Test Figure',
  type,
  createdAt: '2026-06-11T00:00:00.000Z',
  updatedAt: '2026-06-11T00:00:00.000Z',
  ...payload,
});

/**
 * Diagram payload tests
 */
describe('validateRenderableFigurePayload – diagram', () => {
  it('rejects empty diagram payload', () => {
    const fig = createFigure('diagram', {});
    const result = validateRenderableFigurePayload(fig);
    expect(result.valid).toBe(false);
  });

  it('rejects diagram without nodes', () => {
    const fig = createFigure('diagram', {
      diagram: { nodes: [], connections: [] },
    });
    const result = validateRenderableFigurePayload(fig);
    expect(result.valid).toBe(false);
  });

  it('rejects diagram node without id', () => {
    const fig = createFigure('diagram', {
      diagram: {
        nodes: [{ id: '', label: 'A', x: 0, y: 0, w: 10, h: 10 }],
        connections: [],
      },
    });
    const result = validateRenderableFigurePayload(fig);
    expect(result.valid).toBe(false);
  });

  it('rejects diagram connection with missing node', () => {
    const fig = createFigure('diagram', {
      diagram: {
        nodes: [{ id: 'n1', label: 'A', x: 0, y: 0, w: 10, h: 10 }],
        connections: [{ fromId: 'n1', toId: 'n2' }],
      },
    });
    const result = validateRenderableFigurePayload(fig);
    expect(result.valid).toBe(false);
  });

  it('accepts valid diagram with one node', () => {
    const fig = createFigure('diagram', {
      diagram: {
        nodes: [{ id: 'n1', label: 'A', x: 0, y: 0, w: 10, h: 10 }],
        connections: [],
      },
    });
    const result = validateRenderableFigurePayload(fig);
    expect(result.valid).toBe(true);
  });
});

/**
 * Chart payload tests
 */
describe('validateRenderableFigurePayload – chart', () => {
  it('rejects empty chart payload', () => {
    const fig = createFigure('chart', {});
    const result = validateRenderableFigurePayload(fig);
    expect(result.valid).toBe(false);
  });

  it('rejects chart without data points', () => {
    const fig = createFigure('chart', {
      chart: { config: { type: 'bar' }, data: [] },
    });
    const result = validateRenderableFigurePayload(fig);
    expect(result.valid).toBe(false);
  });

  it('rejects chart with non-finite value', () => {
    const fig = createFigure('chart', {
      chart: { config: { type: 'line' }, data: [{ label: 'X', value: Number.NaN }] },
    });
    const result = validateRenderableFigurePayload(fig);
    expect(result.valid).toBe(false);
  });

  it('accepts valid chart with finite value', () => {
    const fig = createFigure('chart', {
      chart: { config: { type: 'pie' }, data: [{ label: 'A', value: 42 }] },
    });
    const result = validateRenderableFigurePayload(fig);
    expect(result.valid).toBe(true);
  });
});

/**
 * Table payload tests
 */
describe('validateRenderableFigurePayload – table', () => {
  it('rejects empty table payload', () => {
    const fig = createFigure('table', {});
    const result = validateRenderableFigurePayload(fig);
    expect(result.valid).toBe(false);
  });

  it('rejects table without columns', () => {
    const fig = createFigure('table', {
      table: { columns: [], rows: [{ a: 1 }] },
    });
    const result = validateRenderableFigurePayload(fig);
    expect(result.valid).toBe(false);
  });

  it('rejects table without rows', () => {
    const fig = createFigure('table', {
      table: { columns: [{ key: 'a', header: 'A' }], rows: [] },
    });
    const result = validateRenderableFigurePayload(fig);
    expect(result.valid).toBe(false);
  });

  it('accepts valid table with columns and rows', () => {
    const fig = createFigure('table', {
      table: {
        columns: [{ key: 'a', header: 'A' }, { key: 'b', header: 'B' }],
        rows: [{ a: 1, b: 2 }, { a: 3, b: 4 }],
      },
    });
    const result = validateRenderableFigurePayload(fig);
    expect(result.valid).toBe(true);
  });
});
