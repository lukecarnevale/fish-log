import {
  getCategoryLabel,
  getCategoryIcon,
} from '../../src/services/promotionsService';

describe('promotionsService', () => {
  describe('getCategoryLabel', () => {
    it('returns correct label for each category', () => {
      expect(getCategoryLabel('promotion')).toBe('Deals');
      expect(getCategoryLabel('charter')).toBe('Charters');
      expect(getCategoryLabel('gear')).toBe('Gear');
      expect(getCategoryLabel('service')).toBe('Services');
      expect(getCategoryLabel('experience')).toBe('Experiences');
    });
  });

  describe('getCategoryIcon', () => {
    it('returns correct icon name for each category', () => {
      expect(getCategoryIcon('promotion')).toBe('tag');
      expect(getCategoryIcon('charter')).toBe('navigation');
      expect(getCategoryIcon('gear')).toBe('tool');
      expect(getCategoryIcon('service')).toBe('life-buoy');
      expect(getCategoryIcon('experience')).toBe('compass');
    });
  });
});
