import {
  transformUser,
  transformUserList,
  transformSpeciesStat,
  transformSpeciesStatList,
  transformAchievement,
  transformAchievementList,
  transformUserAchievement,
  transformUserAchievementList,
} from '../../../src/services/transformers/userTransformer';

const makeUserRow = (overrides?: Record<string, unknown>) => ({
  id: 'user-1',
  device_id: 'device-1',
  email: 'test@example.com',
  auth_id: 'auth-1',
  anonymous_user_id: null,
  first_name: 'Test',
  last_name: 'Angler',
  zip_code: '27601',
  profile_image_url: null,
  preferred_area_code: '34',
  preferred_area_label: 'Pamlico Sound',
  has_license: true,
  wrc_id: 'NC12345',
  phone: '919-555-1234',
  wants_text_confirmation: true,
  wants_email_confirmation: false,
  license_type: 'Annual',
  license_issue_date: '2026-01-01',
  license_expiry_date: '2026-12-31',
  primary_harvest_area: 'Pamlico Sound',
  primary_fishing_method: 'Hook and Line',
  total_reports: 15,
  total_fish_reported: 42,
  current_streak_days: 5,
  longest_streak_days: 12,
  last_active_at: '2026-02-01T00:00:00Z',
  rewards_opted_in_at: '2026-01-15T00:00:00Z',
  created_at: '2025-06-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
  ...overrides,
});

describe('transformUser', () => {
  it('maps all snake_case fields to camelCase', () => {
    const result = transformUser(makeUserRow());
    expect(result.id).toBe('user-1');
    expect(result.deviceId).toBe('device-1');
    expect(result.firstName).toBe('Test');
    expect(result.lastName).toBe('Angler');
    expect(result.hasLicense).toBe(true);
    expect(result.wrcId).toBe('NC12345');
    expect(result.totalReports).toBe(15);
    expect(result.totalFish).toBe(42);
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(12);
    expect(result.lastReportDate).toBe('2026-02-01T00:00:00Z');
    expect(result.wantsTextConfirmation).toBe(true);
    expect(result.wantsEmailConfirmation).toBe(false);
  });

  it('handles null optional fields', () => {
    const result = transformUser(makeUserRow({
      anonymous_user_id: null,
      profile_image_url: null,
      last_active_at: null,
    }));
    expect(result.anonymousUserId).toBeNull();
    expect(result.profileImageUrl).toBeNull();
    expect(result.lastReportDate).toBeNull();
  });

  it('defaults wantsTextConfirmation to false when undefined', () => {
    const result = transformUser(makeUserRow({ wants_text_confirmation: undefined }));
    expect(result.wantsTextConfirmation).toBe(false);
  });

  it('defaults wantsEmailConfirmation to false when undefined', () => {
    const result = transformUser(makeUserRow({ wants_email_confirmation: undefined }));
    expect(result.wantsEmailConfirmation).toBe(false);
  });
});

describe('transformUserList', () => {
  it('transforms multiple rows', () => {
    const rows = [makeUserRow({ id: 'u1' }), makeUserRow({ id: 'u2' })];
    const result = transformUserList(rows);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('u1');
  });
});

describe('transformSpeciesStat', () => {
  it('maps species stat fields', () => {
    const result = transformSpeciesStat({
      species: 'Red Drum',
      total_count: 10,
      largest_length: 24.5,
      last_caught_at: '2026-01-15',
    });
    expect(result).toEqual({
      species: 'Red Drum',
      totalCount: 10,
      largestLength: 24.5,
      lastCaughtDate: '2026-01-15',
    });
  });

  it('handles null values', () => {
    const result = transformSpeciesStat({
      species: 'Flounder',
      total_count: 0,
      largest_length: null,
      last_caught_at: null,
    });
    expect(result.largestLength).toBeNull();
    expect(result.lastCaughtDate).toBeNull();
  });
});

describe('transformSpeciesStatList', () => {
  it('transforms list', () => {
    const result = transformSpeciesStatList([
      { species: 'A', total_count: 1, largest_length: null, last_caught_at: null },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].species).toBe('A');
  });
});

describe('transformAchievement', () => {
  it('maps achievement fields including icon -> iconName', () => {
    const result = transformAchievement({
      id: 'ach-1',
      code: 'first_catch',
      name: 'First Catch',
      description: 'Catch your first fish',
      icon: 'trophy',
      category: 'milestone',
      requirement: { count: 1 },
      sort_order: 1,
      is_active: true,
    });
    expect(result.iconName).toBe('trophy');
    expect(result.isActive).toBe(true);
    expect(result.sortOrder).toBe(1);
    expect(result.category).toBe('milestone');
  });

  it('handles null icon', () => {
    const result = transformAchievement({
      id: 'a', code: 'x', name: 'X', description: 'x',
      icon: null, category: 'streak', is_active: false,
    });
    expect(result.iconName).toBeNull();
  });
});

describe('transformUserAchievement', () => {
  const achievement = transformAchievement({
    id: 'ach-1', code: 'first', name: 'First', description: 'First catch',
    icon: 'star', category: 'milestone', is_active: true,
  });

  it('maps user achievement fields', () => {
    const result = transformUserAchievement(
      { id: 'ua-1', achievement_id: 'ach-1', earned_at: '2026-01-15', progress: 100 },
      achievement
    );
    expect(result.id).toBe('ua-1');
    expect(result.achievementId).toBe('ach-1');
    expect(result.earnedAt).toBe('2026-01-15');
    expect(result.progress).toBe(100);
    expect(result.achievement).toBe(achievement);
  });
});

describe('transformUserAchievementList', () => {
  it('looks up achievements from map', () => {
    const ach = transformAchievement({
      id: 'ach-1', code: 'x', name: 'X', description: 'x',
      icon: null, category: 'milestone', is_active: true,
    });
    const map = new Map([['ach-1', ach]]);
    const result = transformUserAchievementList(
      [{ id: 'ua-1', achievement_id: 'ach-1', earned_at: '2026-01-15', progress: null }],
      map
    );
    expect(result).toHaveLength(1);
    expect(result[0].achievement).toBe(ach);
  });

  it('falls back to empty object for missing achievement', () => {
    const result = transformUserAchievementList(
      [{ id: 'ua-1', achievement_id: 'missing', earned_at: '2026-01-15', progress: null }],
      new Map()
    );
    expect(result).toHaveLength(1);
  });
});
