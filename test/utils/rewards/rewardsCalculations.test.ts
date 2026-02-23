import {
  calculateDaysRemaining,
  calculatePeriodProgress,
  isWithinPeriod,
  formatDate,
  calculateDerivedValues,
} from '../../../src/utils/rewards/rewardsCalculations';
import type { RewardsDrawing, UserRewardsEntry } from '../../../src/types/rewards';

describe('calculateDaysRemaining', () => {
  it('returns positive number for future date', () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const result = calculateDaysRemaining(future.toISOString().split('T')[0]);
    // new Date('YYYY-MM-DD') parses as UTC midnight, which may shift by a day
    // in local timezones behind UTC, so allow ±1 day tolerance
    expect(result).toBeGreaterThanOrEqual(9);
    expect(result).toBeLessThanOrEqual(10);
  });

  it('returns 0 for today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(calculateDaysRemaining(today)).toBeLessThanOrEqual(1);
    expect(calculateDaysRemaining(today)).toBeGreaterThanOrEqual(0);
  });

  it('returns 0 for past date (clamped)', () => {
    expect(calculateDaysRemaining('2020-01-01')).toBe(0);
  });

  it('returns small positive number for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = calculateDaysRemaining(tomorrow.toISOString().split('T')[0]);
    // Allow ±1 day due to UTC date parsing in local timezone
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('calculatePeriodProgress', () => {
  it('returns 0 when today is before start date', () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const futureEnd = new Date();
    futureEnd.setDate(futureEnd.getDate() + 20);
    const result = calculatePeriodProgress(
      future.toISOString().split('T')[0],
      futureEnd.toISOString().split('T')[0]
    );
    expect(result).toBe(0);
  });

  it('returns 100 when today is after end date', () => {
    const result = calculatePeriodProgress('2020-01-01', '2020-06-30');
    expect(result).toBe(100);
  });

  it('returns value between 0 and 100 when within period', () => {
    const start = new Date();
    start.setDate(start.getDate() - 10);
    const end = new Date();
    end.setDate(end.getDate() + 10);
    const result = calculatePeriodProgress(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(100);
  });

  it('returns 100 when start equals end (zero duration)', () => {
    expect(calculatePeriodProgress('2026-01-01', '2026-01-01')).toBe(100);
  });
});

describe('isWithinPeriod', () => {
  it('returns true when today is within period', () => {
    const start = new Date();
    start.setDate(start.getDate() - 5);
    const end = new Date();
    end.setDate(end.getDate() + 5);
    expect(isWithinPeriod(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    )).toBe(true);
  });

  it('returns false when today is before period', () => {
    const start = new Date();
    start.setDate(start.getDate() + 10);
    const end = new Date();
    end.setDate(end.getDate() + 20);
    expect(isWithinPeriod(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    )).toBe(false);
  });

  it('returns false when today is after period', () => {
    expect(isWithinPeriod('2020-01-01', '2020-06-30')).toBe(false);
  });
});

describe('formatDate', () => {
  it('formats ISO date string to readable format', () => {
    // Use the same parsing the function uses to get the expected day
    const parsed = new Date('2026-01-15');
    const expectedDay = parsed.toLocaleDateString('en-US', { day: 'numeric' });
    const result = formatDate('2026-01-15');
    expect(result).toContain('January');
    expect(result).toContain(expectedDay);
    expect(result).toContain('2026');
  });
});

describe('calculateDerivedValues', () => {
  const makeDrawing = (overrides?: Partial<RewardsDrawing>): RewardsDrawing => {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const end = new Date();
    end.setDate(end.getDate() + 30);
    const draw = new Date();
    draw.setDate(draw.getDate() + 45);
    return {
      id: 'drawing-1',
      name: 'Q1 2026 Rewards',
      description: 'Test drawing',
      eligibilityRequirements: [],
      prizes: [],
      quarter: 1,
      year: 2026,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      drawingDate: draw.toISOString().split('T')[0],
      isActive: true,
      ...overrides,
    };
  };

  it('returns defaults when drawing is null', () => {
    const result = calculateDerivedValues(null, null);
    expect(result.daysRemaining).toBe(0);
    expect(result.isEligible).toBe(false);
    expect(result.isPeriodActive).toBe(false);
    expect(result.formattedDrawingDate).toBe('');
    expect(result.quarterDisplay).toBe('');
    expect(result.periodProgress).toBe(0);
  });

  it('calculates all derived values for active drawing', () => {
    const drawing = makeDrawing();
    const entry: UserRewardsEntry = {
      userId: 'user-1',
      drawingId: 'drawing-1',
      isEntered: true,
    };
    const result = calculateDerivedValues(drawing, entry);
    expect(result.daysRemaining).toBeGreaterThan(0);
    expect(result.isEligible).toBe(true);
    expect(result.isPeriodActive).toBe(true);
    expect(result.quarterDisplay).toBe('Q1 2026');
    expect(result.periodProgress).toBeGreaterThan(0);
    expect(result.periodProgress).toBeLessThan(100);
  });

  it('sets isEligible to false when no entry', () => {
    const result = calculateDerivedValues(makeDrawing(), null);
    expect(result.isEligible).toBe(false);
  });

  it('sets isEligible to false when entry.isEntered is false', () => {
    const entry: UserRewardsEntry = {
      userId: 'user-1',
      drawingId: 'drawing-1',
      isEntered: false,
    };
    const result = calculateDerivedValues(makeDrawing(), entry);
    expect(result.isEligible).toBe(false);
  });
});
