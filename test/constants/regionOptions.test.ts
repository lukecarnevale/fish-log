import {
  REGION_OPTIONS,
  getRegionByCode,
  getRegionLabel,
} from '../../src/constants/regionOptions';

describe('regionOptions', () => {
  it('has all expected regions', () => {
    expect(REGION_OPTIONS.length).toBeGreaterThanOrEqual(7);
    const codes = REGION_OPTIONS.map(r => r.value);
    expect(codes).toContain('OBX');
    expect(codes).toContain('CRC');
    expect(codes).toContain('WIL');
  });

  it('getRegionByCode returns correct region', () => {
    const region = getRegionByCode('OBX');
    expect(region).toBeDefined();
    expect(region?.label).toBe('Outer Banks');
    expect(region?.shortLabel).toBe('OBX');
  });

  it('getRegionByCode returns undefined for unknown code', () => {
    expect(getRegionByCode('UNKNOWN')).toBeUndefined();
  });

  it('getRegionLabel returns label for valid code', () => {
    expect(getRegionLabel('CRC')).toBe('Crystal Coast');
  });

  it('getRegionLabel returns code as fallback for unknown', () => {
    expect(getRegionLabel('XYZ')).toBe('XYZ');
  });
});
