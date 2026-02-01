// services/statsService.ts
//
// Service for updating user statistics after report submissions.
// Handles species stats, user stats, and achievement checking.
//

import { supabase, isSupabaseConnected } from '../config/supabase';
import { StoredReport } from '../types/report';

// Species mapping from report fields to display names
const SPECIES_MAP: Record<string, string> = {
  redDrumCount: 'Red Drum',
  flounderCount: 'Flounder',
  spottedSeatroutCount: 'Spotted Seatrout',
  weakfishCount: 'Weakfish',
  stripedBassCount: 'Striped Bass',
};

// =============================================================================
// Species Stats
// =============================================================================

interface SpeciesStatUpdate {
  species: string;
  count: number;
  harvestDate: string;
}

/**
 * Update user_species_stats for a user after a report is submitted.
 * Uses upsert to create or update stats for each species.
 */
export async function updateSpeciesStats(
  userId: string,
  report: StoredReport
): Promise<{ success: boolean; error?: string }> {
  const connected = await isSupabaseConnected();
  if (!connected) {
    return { success: false, error: 'Not connected to Supabase' };
  }

  try {
    // Build list of species to update
    const updates: SpeciesStatUpdate[] = [];

    if (report.redDrumCount > 0) {
      updates.push({ species: 'Red Drum', count: report.redDrumCount, harvestDate: report.harvestDate });
    }
    if (report.flounderCount > 0) {
      updates.push({ species: 'Flounder', count: report.flounderCount, harvestDate: report.harvestDate });
    }
    if (report.spottedSeatroutCount > 0) {
      updates.push({ species: 'Spotted Seatrout', count: report.spottedSeatroutCount, harvestDate: report.harvestDate });
    }
    if (report.weakfishCount > 0) {
      updates.push({ species: 'Weakfish', count: report.weakfishCount, harvestDate: report.harvestDate });
    }
    if (report.stripedBassCount > 0) {
      updates.push({ species: 'Striped Bass', count: report.stripedBassCount, harvestDate: report.harvestDate });
    }

    if (updates.length === 0) {
      return { success: true }; // No species to update
    }

    // Process each species
    for (const update of updates) {
      // First, try to get existing stats for this species
      const { data: existing, error: fetchError } = await supabase
        .from('user_species_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('species', update.species)
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.warn(`Failed to fetch species stats for ${update.species}:`, fetchError.message);
        continue;
      }

      if (existing) {
        // Update existing record
        const newTotal = (existing.total_count || 0) + update.count;
        const { error: updateError } = await supabase
          .from('user_species_stats')
          .update({
            total_count: newTotal,
            last_caught_at: update.harvestDate,
          })
          .eq('id', existing.id);

        if (updateError) {
          console.warn(`Failed to update species stats for ${update.species}:`, updateError.message);
        } else {
          console.log(`📊 Updated ${update.species} stats: +${update.count} (total: ${newTotal})`);
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('user_species_stats')
          .insert({
            user_id: userId,
            species: update.species,
            total_count: update.count,
            largest_length: null,
            last_caught_at: update.harvestDate,
          });

        if (insertError) {
          console.warn(`Failed to insert species stats for ${update.species}:`, insertError.message);
        } else {
          console.log(`📊 Created ${update.species} stats: ${update.count}`);
        }
      }
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to update species stats:', error);
    return { success: false, error: message };
  }
}

// =============================================================================
// User Stats (Denormalized)
// =============================================================================

/**
 * Update denormalized stats on the users table after a report is submitted.
 * Increments total_reports and total_fish, updates last_report_date.
 */
export async function updateUserStats(
  userId: string,
  report: StoredReport
): Promise<{ success: boolean; error?: string }> {
  const connected = await isSupabaseConnected();
  if (!connected) {
    return { success: false, error: 'Not connected to Supabase' };
  }

  try {
    // Calculate total fish in this report
    const fishCount =
      report.redDrumCount +
      report.flounderCount +
      report.spottedSeatroutCount +
      report.weakfishCount +
      report.stripedBassCount;

    // Get current user stats
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('total_reports, total_fish_reported, current_streak_days, longest_streak_days, last_active_at')
      .eq('id', userId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch user: ${fetchError.message}`);
    }

    // Calculate new stats
    const newTotalReports = (user.total_reports || 0) + 1;
    const newTotalFish = (user.total_fish_reported || 0) + fishCount;

    // Calculate streak (simplified - consecutive days)
    let newCurrentStreak = user.current_streak_days || 0;
    let newLongestStreak = user.longest_streak_days || 0;

    if (user.last_active_at) {
      const lastDate = new Date(user.last_active_at);
      const reportDate = new Date(report.harvestDate);
      const today = new Date();

      // Reset dates to midnight for comparison
      lastDate.setHours(0, 0, 0, 0);
      reportDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((reportDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        // Consecutive day - increment streak
        newCurrentStreak += 1;
      } else if (daysDiff > 1) {
        // Gap in reporting - reset streak
        newCurrentStreak = 1;
      }
      // If daysDiff === 0, same day - don't change streak
    } else {
      // First report
      newCurrentStreak = 1;
    }

    // Update longest streak if current exceeds it
    if (newCurrentStreak > newLongestStreak) {
      newLongestStreak = newCurrentStreak;
    }

    // Update user record
    const { error: updateError } = await supabase
      .from('users')
      .update({
        total_reports: newTotalReports,
        total_fish_reported: newTotalFish,
        current_streak_days: newCurrentStreak,
        longest_streak_days: newLongestStreak,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update user stats: ${updateError.message}`);
    }

    console.log(`📈 Updated user stats: reports=${newTotalReports}, fish=${newTotalFish}, streak=${newCurrentStreak}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to update user stats:', error);
    return { success: false, error: message };
  }
}

// =============================================================================
// Achievements
// =============================================================================

/**
 * Full achievement data returned when an achievement is awarded.
 * Compatible with AchievementModal component.
 */
export interface AwardedAchievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  iconName?: string;
}

/**
 * Check and award any achievements the user has earned.
 * Called after updating stats.
 * Returns full achievement data for display in modals, sorted by priority.
 * @param userId - The user ID to check achievements for
 * @param reportId - Optional report ID that triggered this check (stored with awarded achievements)
 */
export async function checkAndAwardAchievements(
  userId: string,
  reportId?: string
): Promise<{ success: boolean; awarded: AwardedAchievement[]; error?: string }> {
  const connected = await isSupabaseConnected();
  if (!connected) {
    return { success: false, awarded: [], error: 'Not connected to Supabase' };
  }

  try {
    // Get all active achievements
    const { data: achievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true);

    if (achievementsError) {
      throw new Error(`Failed to fetch achievements: ${achievementsError.message}`);
    }

    if (!achievements || achievements.length === 0) {
      return { success: true, awarded: [] };
    }

    // Build a map of achievement id -> code for sorting later
    const codeMap = new Map<string, string>();
    achievements.forEach((a) => codeMap.set(a.id, a.code));

    // Get user's current achievements
    const { data: userAchievements, error: userAchError } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    if (userAchError) {
      throw new Error(`Failed to fetch user achievements: ${userAchError.message}`);
    }

    const earnedIds = new Set((userAchievements || []).map((ua) => ua.achievement_id));

    // Get user stats for checking requirements
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('total_reports, total_fish_reported, current_streak_days, longest_streak_days, rewards_opted_in_at')
      .eq('id', userId)
      .single();

    if (userError) {
      throw new Error(`Failed to fetch user: ${userError.message}`);
    }

    // Count reports with photos for photo achievements
    const { count: reportsWithPhotos, error: photoCountError } = await supabase
      .from('harvest_reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('photo_url', 'is', null);

    if (photoCountError) {
      console.warn('Failed to count reports with photos:', photoCountError.message);
    }

    // Map to expected format for checkAchievementRequirement
    const userStats: ExtendedUserStats = {
      total_reports: user.total_reports || 0,
      total_fish: user.total_fish_reported || 0,
      current_streak: user.current_streak_days || 0,
      longest_streak: user.longest_streak_days || 0,
      reports_with_photos: reportsWithPhotos || 0,
      is_rewards_member: !!user.rewards_opted_in_at,
    };

    console.log('🏆 Checking achievements with stats:', {
      total_reports: userStats.total_reports,
      reports_with_photos: userStats.reports_with_photos,
      is_rewards_member: userStats.is_rewards_member,
    });

    // Get species stats
    const { data: speciesStats, error: speciesError } = await supabase
      .from('user_species_stats')
      .select('species, total_count')
      .eq('user_id', userId);

    if (speciesError) {
      console.warn('Failed to fetch species stats for achievement check:', speciesError.message);
    }

    const speciesMap = new Map<string, number>();
    (speciesStats || []).forEach((s) => {
      speciesMap.set(s.species, s.total_count);
    });

    // Check each achievement
    const awarded: AwardedAchievement[] = [];

    for (const achievement of achievements) {
      // Skip if already earned
      if (earnedIds.has(achievement.id)) {
        continue;
      }

      const earned = checkAchievementRequirement(
        achievement.code,
        achievement.category,
        userStats,
        speciesMap
      );

      if (earned) {
        // Award the achievement
        const { error: awardError } = await supabase
          .from('user_achievements')
          .insert({
            user_id: userId,
            achievement_id: achievement.id,
            earned_at: new Date().toISOString(),
            report_id: reportId || null,
          });

        if (awardError) {
          console.warn(`Failed to award achievement ${achievement.name}:`, awardError.message);
        } else {
          console.log(`🏆 Achievement unlocked: ${achievement.name}`);
          awarded.push({
            id: achievement.id,
            code: achievement.code,
            name: achievement.name,
            description: achievement.description,
            category: achievement.category,
            iconName: achievement.icon,
          });
        }
      }
    }

    // Sort achievements by priority (rewards_entered first, then photo_second, etc.)
    const sortedAwarded = sortAchievementsByPriority(awarded, codeMap);

    return { success: true, awarded: sortedAwarded };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to check achievements:', error);
    return { success: false, awarded: [], error: message };
  }
}

/**
 * Priority order for achievements when displaying multiple at once.
 * Lower number = higher priority (shown first).
 */
const ACHIEVEMENT_PRIORITY: Record<string, number> = {
  // Special achievements (highest priority)
  rewards_entered: 1,

  // First-time achievements
  first_report: 10,
  photo_first: 12, // This actually requires 2nd photo (named oddly in DB)

  // Milestone achievements
  reports_10: 20,
  reports_50: 21,
  reports_100: 22,

  // Fish count achievements
  fish_100: 30,
  fish_500: 31,

  // Streak achievements
  streak_3: 40,
  streak_7: 41,
  streak_30: 42,

  // Species achievements
  species_all_5: 50,
};

/**
 * Sort achievements by priority for display.
 */
function sortAchievementsByPriority(
  achievements: AwardedAchievement[],
  codeMap: Map<string, string>
): AwardedAchievement[] {
  return [...achievements].sort((a, b) => {
    const codeA = codeMap.get(a.id) || '';
    const codeB = codeMap.get(b.id) || '';
    const priorityA = ACHIEVEMENT_PRIORITY[codeA] ?? 100;
    const priorityB = ACHIEVEMENT_PRIORITY[codeB] ?? 100;
    return priorityA - priorityB;
  });
}

/**
 * Extended user stats for achievement checking.
 */
interface ExtendedUserStats {
  total_reports: number;
  total_fish: number;
  current_streak: number;
  longest_streak: number;
  reports_with_photos: number;
  is_rewards_member: boolean;
}

/**
 * Check if a specific achievement requirement is met.
 */
function checkAchievementRequirement(
  code: string,
  category: string,
  user: ExtendedUserStats,
  speciesMap: Map<string, number>
): boolean {
  // Handle achievements by their code
  // The database uses codes like "first_report", "reports_10", "streak_3", etc.
  switch (code) {
    // Special achievements
    case 'rewards_entered':
      return user.is_rewards_member && user.total_reports >= 1;

    // Milestone achievements (reporting)
    case 'first_report':
      return user.total_reports >= 1;
    case 'reports_10':
      return user.total_reports >= 10;
    case 'reports_50':
      return user.total_reports >= 50;
    case 'reports_100':
      return user.total_reports >= 100;

    // Photo achievements
    // Note: 'photo_first' in DB actually triggers on the SECOND report with a photo
    case 'photo_first':
      return user.reports_with_photos >= 2;

    // Fish count achievements
    case 'fish_100':
      return user.total_fish >= 100;
    case 'fish_500':
      return user.total_fish >= 500;

    // Streak achievements
    case 'streak_3':
      return user.longest_streak >= 3;
    case 'streak_7':
      return user.longest_streak >= 7;
    case 'streak_30':
      return user.longest_streak >= 30;

    // Species achievements
    case 'species_all_5':
      const allSpecies = ['Red Drum', 'Flounder', 'Spotted Seatrout', 'Weakfish', 'Striped Bass'];
      return allSpecies.every((s) => (speciesMap.get(s) || 0) > 0);

    default:
      console.log(`Unknown achievement code: ${code}`);
      return false;
  }
}

// =============================================================================
// Main Update Function
// =============================================================================

/**
 * Update all user statistics after a report is submitted.
 * This is the main function to call after creating a report.
 */
export async function updateAllStatsAfterReport(
  userId: string,
  report: StoredReport
): Promise<{
  success: boolean;
  speciesStatsUpdated: boolean;
  userStatsUpdated: boolean;
  achievementsAwarded: AwardedAchievement[];
  error?: string;
}> {
  console.log('📊 Updating stats for user:', userId);

  // Update species stats
  const speciesResult = await updateSpeciesStats(userId, report);

  // Update user denormalized stats
  const userResult = await updateUserStats(userId, report);

  // Check and award achievements (pass report ID to associate with earned achievements)
  const achievementResult = await checkAndAwardAchievements(userId, report.id);

  const allSuccess = speciesResult.success && userResult.success;

  if (allSuccess) {
    console.log('✅ All stats updated successfully');
  } else {
    console.warn('⚠️ Some stats failed to update');
  }

  return {
    success: allSuccess,
    speciesStatsUpdated: speciesResult.success,
    userStatsUpdated: userResult.success,
    achievementsAwarded: achievementResult.awarded,
    error: speciesResult.error || userResult.error || achievementResult.error,
  };
}

// =============================================================================
// Backfill Function (for new rewards members)
// =============================================================================

/**
 * Backfill user stats from historical reports.
 * Call this when a user converts from anonymous to rewards member
 * to include their historical reports in their stats.
 */
export async function backfillUserStatsFromReports(
  userId: string
): Promise<{
  success: boolean;
  totalReports: number;
  totalFish: number;
  speciesUpdated: number;
  achievementsAwarded: AwardedAchievement[];
  error?: string;
}> {
  const connected = await isSupabaseConnected();
  if (!connected) {
    return {
      success: false,
      totalReports: 0,
      totalFish: 0,
      speciesUpdated: 0,
      achievementsAwarded: [],
      error: 'Not connected to Supabase',
    };
  }

  console.log('📊 Backfilling stats for user:', userId);

  try {
    // Fetch all reports linked to this user
    const { data: reports, error: reportsError } = await supabase
      .from('harvest_reports')
      .select('*')
      .eq('user_id', userId)
      .order('harvest_date', { ascending: true });

    if (reportsError) {
      throw new Error(`Failed to fetch reports: ${reportsError.message}`);
    }

    if (!reports || reports.length === 0) {
      console.log('📊 No reports to backfill');
      return {
        success: true,
        totalReports: 0,
        totalFish: 0,
        speciesUpdated: 0,
        achievementsAwarded: [],
      };
    }

    console.log(`📊 Found ${reports.length} reports to backfill`);

    // Calculate totals from all reports
    let totalFish = 0;
    const speciesStats: Map<string, { count: number; lastCaughtAt: string }> = new Map();

    for (const report of reports) {
      // Sum up fish counts
      const redDrum = report.red_drum_count || 0;
      const flounder = report.flounder_count || 0;
      const spottedSeatrout = report.spotted_seatrout_count || 0;
      const weakfish = report.weakfish_count || 0;
      const stripedBass = report.striped_bass_count || 0;

      totalFish += redDrum + flounder + spottedSeatrout + weakfish + stripedBass;

      // Aggregate species stats
      const harvestDate = report.harvest_date;
      if (redDrum > 0) {
        const existing = speciesStats.get('Red Drum') || { count: 0, lastCaughtAt: harvestDate };
        speciesStats.set('Red Drum', {
          count: existing.count + redDrum,
          lastCaughtAt: harvestDate > existing.lastCaughtAt ? harvestDate : existing.lastCaughtAt,
        });
      }
      if (flounder > 0) {
        const existing = speciesStats.get('Flounder') || { count: 0, lastCaughtAt: harvestDate };
        speciesStats.set('Flounder', {
          count: existing.count + flounder,
          lastCaughtAt: harvestDate > existing.lastCaughtAt ? harvestDate : existing.lastCaughtAt,
        });
      }
      if (spottedSeatrout > 0) {
        const existing = speciesStats.get('Spotted Seatrout') || { count: 0, lastCaughtAt: harvestDate };
        speciesStats.set('Spotted Seatrout', {
          count: existing.count + spottedSeatrout,
          lastCaughtAt: harvestDate > existing.lastCaughtAt ? harvestDate : existing.lastCaughtAt,
        });
      }
      if (weakfish > 0) {
        const existing = speciesStats.get('Weakfish') || { count: 0, lastCaughtAt: harvestDate };
        speciesStats.set('Weakfish', {
          count: existing.count + weakfish,
          lastCaughtAt: harvestDate > existing.lastCaughtAt ? harvestDate : existing.lastCaughtAt,
        });
      }
      if (stripedBass > 0) {
        const existing = speciesStats.get('Striped Bass') || { count: 0, lastCaughtAt: harvestDate };
        speciesStats.set('Striped Bass', {
          count: existing.count + stripedBass,
          lastCaughtAt: harvestDate > existing.lastCaughtAt ? harvestDate : existing.lastCaughtAt,
        });
      }
    }

    // Calculate streak from reports (simplified - count consecutive days)
    let currentStreak = 0;
    let longestStreak = 0;
    let lastReportDate: Date | null = null;

    // Sort reports by harvest_date for streak calculation
    const sortedReports = [...reports].sort(
      (a, b) => new Date(a.harvest_date).getTime() - new Date(b.harvest_date).getTime()
    );

    for (const report of sortedReports) {
      const reportDate = new Date(report.harvest_date);
      reportDate.setHours(0, 0, 0, 0);

      if (lastReportDate) {
        const daysDiff = Math.floor(
          (reportDate.getTime() - lastReportDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
          currentStreak += 1;
        } else if (daysDiff > 1) {
          currentStreak = 1;
        }
        // daysDiff === 0 means same day, don't change streak
      } else {
        currentStreak = 1;
      }

      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }

      lastReportDate = reportDate;
    }

    // Get the most recent report date for last_active_at
    const mostRecentReport = sortedReports[sortedReports.length - 1];
    const lastActiveAt = mostRecentReport?.harvest_date || new Date().toISOString();

    // Update user stats
    const { error: updateError } = await supabase
      .from('users')
      .update({
        total_reports: reports.length,
        total_fish_reported: totalFish,
        current_streak_days: currentStreak,
        longest_streak_days: longestStreak,
        last_active_at: lastActiveAt,
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update user stats: ${updateError.message}`);
    }

    console.log(`📈 Backfilled user stats: reports=${reports.length}, fish=${totalFish}, streak=${longestStreak}`);

    // Update species stats using upsert
    let speciesUpdated = 0;
    for (const [species, stats] of speciesStats) {
      const { error: upsertError } = await supabase
        .from('user_species_stats')
        .upsert(
          {
            user_id: userId,
            species,
            total_count: stats.count,
            last_caught_at: stats.lastCaughtAt,
          },
          { onConflict: 'user_id,species' }
        );

      if (upsertError) {
        console.warn(`Failed to upsert species stats for ${species}:`, upsertError.message);
      } else {
        speciesUpdated++;
        console.log(`📊 Backfilled ${species} stats: ${stats.count}`);
      }
    }

    // Check and award achievements based on backfilled stats
    const achievementResult = await checkAndAwardAchievements(userId);

    console.log('✅ Stats backfill complete');

    return {
      success: true,
      totalReports: reports.length,
      totalFish,
      speciesUpdated,
      achievementsAwarded: achievementResult.awarded,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to backfill stats:', error);
    return {
      success: false,
      totalReports: 0,
      totalFish: 0,
      speciesUpdated: 0,
      achievementsAwarded: [],
      error: message,
    };
  }
}
