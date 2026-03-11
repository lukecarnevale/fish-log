import {
  formatRelativeTime,
  formatMemberSince,
  getCurrentQuarter,
  getCurrentYear,
  getQuarterStartDate,
  getQuarterEndDate,
  formatQuarterDisplay,
} from '../../src/utils/dateUtils';

describe('formatRelativeTime', () => {
  // Use fake timers pinned to a fixed date to avoid DST boundary issues.
  // When real Date math crosses a DST change the ms diff drifts by ±1 hour,
  // causing Math.floor to round down unexpectedly.
  const FIXED_NOW = new Date('2026-01-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "Just now" for less than 1 minute ago', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('Just now');
  });

  it('returns minutes ago for < 60 minutes', () => {
    const d = new Date(FIXED_NOW.getTime() - 30 * 60 * 1000);
    expect(formatRelativeTime(d.toISOString())).toBe('30m ago');
  });

  it('returns hours ago for < 24 hours', () => {
    const d = new Date(FIXED_NOW.getTime() - 5 * 60 * 60 * 1000);
    expect(formatRelativeTime(d.toISOString())).toBe('5h ago');
  });

  it('returns days ago for < 7 days', () => {
    const d = new Date(FIXED_NOW.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(d.toISOString())).toBe('3d ago');
  });

  it('returns weeks ago for < 4 weeks', () => {
    const d = new Date(FIXED_NOW.getTime() - 14 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(d.toISOString())).toBe('2w ago');
  });

  it('returns months ago for < 12 months', () => {
    const d = new Date(FIXED_NOW.getTime() - 60 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(d.toISOString())).toBe('2mo ago');
  });

  it('returns formatted date for > 12 months', () => {
    const result = formatRelativeTime('2020-06-15T12:00:00Z');
    expect(result).toContain('Jun');
    expect(result).toContain('15');
  });
});

describe('formatMemberSince', () => {
  it('formats date as "Month Year"', () => {
    const result = formatMemberSince('2026-01-15T00:00:00Z');
    expect(result).toContain('January');
    expect(result).toContain('2026');
  });
});

describe('getCurrentQuarter', () => {
  it('returns a value between 1 and 4', () => {
    const q = getCurrentQuarter();
    expect(q).toBeGreaterThanOrEqual(1);
    expect(q).toBeLessThanOrEqual(4);
  });
});

describe('getCurrentYear', () => {
  it('returns current year', () => {
    expect(getCurrentYear()).toBe(new Date().getFullYear());
  });
});

describe('getQuarterStartDate', () => {
  it.each([
    [1 as const, 2026, '2026-01-01'],
    [2 as const, 2026, '2026-04-01'],
    [3 as const, 2026, '2026-07-01'],
    [4 as const, 2026, '2026-10-01'],
  ])('Q%i %i starts on %s', (quarter, year, expected) => {
    expect(getQuarterStartDate(quarter, year)).toBe(expected);
  });
});

describe('getQuarterEndDate', () => {
  it.each([
    [1 as const, 2026, '2026-03-31'],
    [2 as const, 2026, '2026-06-30'],
    [3 as const, 2026, '2026-09-30'],
    [4 as const, 2026, '2026-12-31'],
  ])('Q%i %i ends on %s', (quarter, year, expected) => {
    expect(getQuarterEndDate(quarter, year)).toBe(expected);
  });

  it('handles leap year (Feb 29)', () => {
    expect(getQuarterEndDate(1, 2024)).toBe('2024-03-31');
  });
});

describe('formatQuarterDisplay', () => {
  it('formats as "QN YYYY"', () => {
    expect(formatQuarterDisplay(1, 2026)).toBe('Q1 2026');
    expect(formatQuarterDisplay(4, 2025)).toBe('Q4 2025');
  });
});
