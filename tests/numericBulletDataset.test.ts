import { describe, it, expect } from 'vitest';
import { extractNumericBullets } from '../src/analysis/numericBulletDataset';

describe('Numeric Bullet Dataset Extractor', () => {
  it('extracts standard Vietnamese numeric bullet rows', () => {
    const text = `
      - Hải Phòng - ca nô: 5 phương tiện
      Quảng Ninh - tàu: 4 phương tiện
      * Quảng Ninh - ca nô: 5.5 phương tiện
    `;
    const result = extractNumericBullets(text);
    
    expect(result.rows).toHaveLength(3);
    
    expect(result.rows[0]).toEqual({
      area: 'Hải Phòng',
      category: 'ca nô',
      value: 5,
      unit: 'phương tiện',
      displayLabel: 'Hải Phòng - ca nô'
    });
    
    expect(result.rows[1]).toEqual({
      area: 'Quảng Ninh',
      category: 'tàu',
      value: 4,
      unit: 'phương tiện',
      displayLabel: 'Quảng Ninh - tàu'
    });
    
    expect(result.rows[2]).toEqual({
      area: 'Quảng Ninh',
      category: 'ca nô',
      value: 5.5,
      unit: 'phương tiện',
      displayLabel: 'Quảng Ninh - ca nô'
    });
    
    expect(result.canonicalUnit).toBe('phương tiện');
  });

  it('handles simple label: value format without area', () => {
    const text = `
      1. Ô tô: 120 xe
      2. Xe máy: 450 xe
    `;
    const result = extractNumericBullets(text);
    
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].area).toBeUndefined();
    expect(result.rows[0].category).toBe('Ô tô');
    expect(result.rows[0].value).toBe(120);
    expect(result.rows[0].unit).toBe('xe');
    
    expect(result.canonicalUnit).toBe('xe');
  });

  it('handles Vietnamese comma as decimal separator', () => {
    const text = `Doanh thu: 12,5 tỷ đồng`;
    const result = extractNumericBullets(text);
    expect(result.rows[0].value).toBe(12.5);
  });

  it('ignores lines that do not match the numeric format', () => {
    const text = `
      Báo cáo tổng kết:
      - Hà Nội: 100
      Đây là một đoạn text bình thường
      - TP.HCM: 200
    `;
    const result = extractNumericBullets(text);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].category).toBe('Hà Nội');
    expect(result.rows[1].category).toBe('TP.HCM');
  });

  it('does not set canonicalUnit if units differ', () => {
    const text = `
      - Gạo: 100 kg
      - Nước: 50 lít
    `;
    const result = extractNumericBullets(text);
    expect(result.rows).toHaveLength(2);
    expect(result.canonicalUnit).toBeUndefined();
  });
});
