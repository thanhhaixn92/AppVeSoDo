import { describe, it, expect } from 'vitest';
import { 
  formatVietnameseNumber, 
  getDisplayUnitFromCanonicalUnit, 
  formatVietnameseValueWithUnit,
  formatTableCellDisplayValue,
  isTableNumericValue 
} from '../src/lib/workflowUtils';

describe('Vietnamese Display Number Formatter', () => {

  it('Test A - formatVietnameseNumber', () => {
    expect(formatVietnameseNumber(1000000)).toBe('1.000.000');
    expect(formatVietnameseNumber(914691)).toBe('914.691');
    expect(formatVietnameseNumber(18649)).toBe('18.649');
    expect(formatVietnameseNumber(42.86, { minimumFractionDigits: 0 })).toBe('42,86');
    expect(formatVietnameseNumber(0)).toBe('0');
    expect(formatVietnameseNumber(-1234)).toBe('-1.234');
  });

  it('Test B - getDisplayUnitFromCanonicalUnit', () => {
    expect(getDisplayUnitFromCanonicalUnit('currency_vnd_billion')).toBe('tỷ đồng');
    expect(getDisplayUnitFromCanonicalUnit('currency_vnd_million')).toBe('Tr. đồng');
    expect(getDisplayUnitFromCanonicalUnit('percentage')).toBe('%');
    expect(getDisplayUnitFromCanonicalUnit('income_vnd_per_person_month')).toBe('đồng/người/tháng');
    expect(getDisplayUnitFromCanonicalUnit('person_count')).toBe('người');
    expect(getDisplayUnitFromCanonicalUnit('vehicle_count')).toBe('phương tiện');
    expect(getDisplayUnitFromCanonicalUnit('vessel_trip_count')).toBe('lượt tàu');
    expect(getDisplayUnitFromCanonicalUnit('volume_or_output_tr_gthl')).toBe('Tr.GTHL');
    expect(getDisplayUnitFromCanonicalUnit('unknown', 'tháng')).toBe('tháng');
    expect(getDisplayUnitFromCanonicalUnit(undefined, undefined)).toBeUndefined();
  });

  it('Test C - formatVietnameseValueWithUnit', () => {
    expect(formatVietnameseValueWithUnit(18649, 'lượt')).toBe('18.649 lượt');
    expect(formatVietnameseValueWithUnit(914691, 'Tr. đồng')).toBe('914.691 Tr. đồng');
    expect(formatVietnameseValueWithUnit(42.86, '%')).toBe('42,86%');
    expect(formatVietnameseValueWithUnit(1234, undefined)).toBe('1.234');
  });

  it('Test D - formatTableCellDisplayValue', () => {
    // Basic numbers
    expect(formatTableCellDisplayValue('914691')).toBe('914.691');
    expect(formatTableCellDisplayValue('1000000')).toBe('1.000.000');
    expect(formatTableCellDisplayValue('42.86')).toBe('42,86');
    expect(formatTableCellDisplayValue('914.691')).toBe('914.691'); // already formatted stays same
    expect(formatTableCellDisplayValue('42,86%')).toBe('42,86%');
    
    // Numbers with units
    expect(formatTableCellDisplayValue('914691 tr. đồng')).toBe('914.691 tr. đồng');
    expect(formatTableCellDisplayValue('12,5 tỷ đồng')).toBe('12,5 tỷ đồng');

    // Non-numeric text
    expect(formatTableCellDisplayValue('Q1/2024')).toBe('Q1/2024');
    expect(formatTableCellDisplayValue('Công ty Hoa tiêu hàng hải II')).toBe('Công ty Hoa tiêu hàng hải II');
    expect(formatTableCellDisplayValue('Mã 2024-A')).toBe('Mã 2024-A');
    expect(formatTableCellDisplayValue('01/2024')).toBe('01/2024');
    expect(formatTableCellDisplayValue('')).toBe('');
    expect(formatTableCellDisplayValue('-')).toBe('-');
  });

  it('Test E - isTableNumericValue', () => {
    expect(isTableNumericValue('914691')).toBe(true);
    expect(isTableNumericValue('42,86%')).toBe(true);
    expect(isTableNumericValue('12,5 tỷ đồng')).toBe(true);
    
    expect(isTableNumericValue('Q1/2024')).toBe(false);
    expect(isTableNumericValue('01/2024')).toBe(false);
    expect(isTableNumericValue('Công ty Hoa tiêu hàng hải II')).toBe(false);
    expect(isTableNumericValue('')).toBe(false);
    expect(isTableNumericValue('-')).toBe(false);
  });

});
