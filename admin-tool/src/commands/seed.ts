// admin-tool/src/commands/seed.ts
//
// Seed test data into the database for development.

import { supabaseAdmin } from '../client';
import chalk from 'chalk';
import { randomUUID } from 'crypto';

interface SeedOptions {
  users?: number;
  reports?: number;
  clean?: boolean;
}

const SPECIES = ['Red Drum', 'Flounder', 'Spotted Seatrout', 'Weakfish', 'Striped Bass'];
const AREAS = [
  { code: 'NR', label: 'Northern Region' },
  { code: 'CR', label: 'Central Region' },
  { code: 'SR', label: 'Southern Region' },
  { code: 'PML', label: 'Pamlico Sound' },
  { code: 'ALB', label: 'Albemarle Sound' },
];
const FIRST_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(0, daysBack));
  return d.toISOString().split('T')[0];
}

export async function seedData(options: SeedOptions): Promise<void> {
  const userCount = options.users || 5;
  const reportsPerUser = options.reports || 10;

  if (options.clean) {
    console.log(chalk.yellow('\nCleaning existing test data...'));
    // Delete in FK order
    await supabaseAdmin.from('fish_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('catch_likes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('user_achievements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('user_rewards_entries').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('user_species_stats').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('harvest_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('feedback').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log(chalk.green('Cleaned.'));
  }

  console.log(chalk.cyan(`\nSeeding ${userCount} users with ${reportsPerUser} reports each...`));

  // Seed anonymous users first
  const anonUsers: string[] = [];
  for (let i = 0; i < userCount; i++) {
    const deviceId = randomUUID();
    const { data, error } = await supabaseAdmin
      .from('anonymous_users')
      .insert({ device_id: deviceId })
      .select('id')
      .single();

    if (error) {
      console.error(chalk.red(`Failed to create anonymous user: ${error.message}`));
      continue;
    }
    anonUsers.push(data.id);
  }
  console.log(chalk.green(`  Created ${anonUsers.length} anonymous users`));

  // Seed rewards members (linked to anonymous users)
  const memberUsers: Array<{ id: string; anonId: string }> = [];
  for (let i = 0; i < userCount; i++) {
    const firstName = randomElement(FIRST_NAMES);
    const lastName = randomElement(LAST_NAMES);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@test.fishlog.dev`;

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        device_id: randomUUID(),
        anonymous_user_id: anonUsers[i] || null,
        email,
        first_name: firstName,
        last_name: lastName,
        zip_code: String(27000 + randomInt(0, 999)),
        has_license: Math.random() > 0.3,
        wrc_id: `WRC${randomInt(100000, 999999)}`,
        rewards_opted_in_at: new Date().toISOString(),
        total_reports: 0,
        total_fish_reported: 0,
        current_streak_days: 0,
        longest_streak_days: 0,
      })
      .select('id')
      .single();

    if (error) {
      console.error(chalk.red(`Failed to create user: ${error.message}`));
      continue;
    }
    memberUsers.push({ id: data.id, anonId: anonUsers[i] });
  }
  console.log(chalk.green(`  Created ${memberUsers.length} rewards members`));

  // Seed harvest reports for each user
  let totalReports = 0;
  let totalFishEntries = 0;

  for (const user of memberUsers) {
    for (let r = 0; r < reportsPerUser; r++) {
      const area = randomElement(AREAS);
      const counts = {
        red_drum_count: randomInt(0, 3),
        flounder_count: randomInt(0, 2),
        spotted_seatrout_count: randomInt(0, 4),
        weakfish_count: randomInt(0, 2),
        striped_bass_count: randomInt(0, 3),
      };

      const { data: report, error: reportError } = await supabaseAdmin
        .from('harvest_reports')
        .insert({
          user_id: user.id,
          anonymous_user_id: user.anonId || null,
          harvest_date: randomDate(90),
          area_code: area.code,
          area_label: area.label,
          used_hook_and_line: Math.random() > 0.2,
          gear_code: 'HL',
          gear_label: 'Hook and Line',
          ...counts,
          reporting_for: Math.random() > 0.8 ? 'family' : 'self',
          family_count: Math.random() > 0.8 ? randomInt(2, 5) : null,
          has_license: true,
          first_name: 'Test',
          last_name: 'User',
          zip_code: '27601',
          dmf_status: 'submitted',
          entered_rewards: true,
        })
        .select('id')
        .single();

      if (reportError) {
        console.error(chalk.red(`Report error: ${reportError.message}`));
        continue;
      }

      totalReports++;

      // Create fish entries for species with count > 0
      const fishEntries = Object.entries(counts)
        .filter(([, count]) => count > 0)
        .map(([key, count]) => {
          const speciesMap: Record<string, string> = {
            red_drum_count: 'Red Drum',
            flounder_count: 'Flounder',
            spotted_seatrout_count: 'Spotted Seatrout',
            weakfish_count: 'Weakfish',
            striped_bass_count: 'Striped Bass',
          };
          return {
            report_id: report.id,
            species: speciesMap[key],
            count,
            lengths: Array.from({ length: count }, () => randomInt(10, 36)),
          };
        });

      if (fishEntries.length > 0) {
        const { error: feError } = await supabaseAdmin
          .from('fish_entries')
          .insert(fishEntries);
        if (feError) {
          console.error(chalk.red(`Fish entries error: ${feError.message}`));
        } else {
          totalFishEntries += fishEntries.length;
        }
      }
    }
  }

  console.log(chalk.green(`  Created ${totalReports} harvest reports`));
  console.log(chalk.green(`  Created ${totalFishEntries} fish entries`));

  // Update user stats
  for (const user of memberUsers) {
    const { data: stats } = await supabaseAdmin
      .from('harvest_reports')
      .select('red_drum_count, flounder_count, spotted_seatrout_count, weakfish_count, striped_bass_count')
      .eq('user_id', user.id);

    if (stats) {
      const totalFish = stats.reduce(
        (sum, r) =>
          sum +
          (r.red_drum_count || 0) +
          (r.flounder_count || 0) +
          (r.spotted_seatrout_count || 0) +
          (r.weakfish_count || 0) +
          (r.striped_bass_count || 0),
        0
      );

      await supabaseAdmin
        .from('users')
        .update({
          total_reports: stats.length,
          total_fish_reported: totalFish,
        })
        .eq('id', user.id);
    }
  }
  console.log(chalk.green('  Updated user stats'));

  console.log(chalk.cyan('\nSeeding complete!'));
  console.log(
    chalk.dim(
      `  ${memberUsers.length} users, ${totalReports} reports, ${totalFishEntries} fish entries`
    )
  );
}
