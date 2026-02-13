// admin-tool/src/commands/test-rls.ts
//
// Test RLS policies by simulating queries as different user roles.
// Compares service_role results (full access) vs anon-key results (RLS enforced).

import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin, SUPABASE_URL } from '../client';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env.development') });

const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export async function testRLS(options: {
  table?: string;
  asUser?: string;
}): Promise<void> {
  console.log(chalk.cyan('\n=== RLS Policy Test ===\n'));

  if (!ANON_KEY) {
    console.error(
      chalk.red(
        'Cannot find anon key. Ensure .env.development exists with EXPO_PUBLIC_SUPABASE_ANON_KEY.'
      )
    );
    return;
  }

  // Create an anon-key client (RLS enforced)
  const supabaseAnon = createClient(SUPABASE_URL!, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tablesToTest = options.table
    ? [options.table]
    : [
        'users',
        'anonymous_users',
        'harvest_reports',
        'fish_entries',
        'user_achievements',
        'user_rewards_entries',
        'user_species_stats',
        'feedback',
        'pending_submissions',
        'catch_likes',
        'achievements',
        'advertisements',
        'fish_species',
        'prizes',
        'rewards_config',
        'rewards_drawings',
      ];

  console.log(chalk.dim('Comparing service_role (full access) vs anon key (RLS enforced):\n'));

  for (const table of tablesToTest) {
    // Service role query (full access)
    const { count: adminCount, error: adminError } = await supabaseAdmin
      .from(table)
      .select('*', { count: 'exact', head: true });

    // Anon key query (RLS enforced)
    const { count: anonCount, error: anonError } = await supabaseAnon
      .from(table)
      .select('*', { count: 'exact', head: true });

    const adminCountStr = adminError
      ? chalk.red('ERROR')
      : String(adminCount).padStart(5);
    const anonCountStr = anonError
      ? chalk.red(anonError.code || 'ERROR')
      : String(anonCount).padStart(5);

    // Determine security status
    let status: string;
    if (anonError) {
      status = chalk.green('BLOCKED');
    } else if (anonCount === 0 && (adminCount || 0) > 0) {
      status = chalk.green('FILTERED');
    } else if (anonCount === adminCount) {
      // Check if this is a public-read table
      const publicTables = [
        'achievements', 'advertisements', 'fish_species', 'prizes',
        'rewards_config', 'rewards_drawings', 'drawing_prizes',
      ];
      if (publicTables.includes(table)) {
        status = chalk.blue('PUBLIC (expected)');
      } else if (adminCount === 0) {
        status = chalk.yellow('EMPTY');
      } else {
        status = chalk.red('EXPOSED');
      }
    } else {
      status = chalk.green('PARTIAL');
    }

    console.log(
      `  ${table.padEnd(25)} admin: ${adminCountStr}  anon: ${anonCountStr}  ${status}`
    );
  }

  // Test write operations on sensitive tables
  console.log(chalk.cyan('\n--- Write Access Tests ---\n'));

  const writeTests = [
    {
      table: 'users',
      data: { email: 'rls-test@invalid.test', first_name: 'RLS', last_name: 'Test' },
    },
    {
      table: 'harvest_reports',
      data: { harvest_date: '2025-01-01', area_code: 'TEST', red_drum_count: 0, flounder_count: 0, spotted_seatrout_count: 0, weakfish_count: 0, striped_bass_count: 0, reporting_for: 'self' },
    },
    {
      table: 'feedback',
      data: { type: 'feedback', message: 'RLS test' },
    },
  ];

  for (const test of writeTests) {
    const { error: writeError } = await supabaseAnon
      .from(test.table)
      .insert(test.data as any)
      .select()
      .single();

    if (writeError) {
      console.log(
        `  ${chalk.green('BLOCKED')} INSERT into ${test.table}: ${chalk.dim(writeError.message.substring(0, 60))}`
      );
    } else {
      console.log(
        `  ${chalk.red('ALLOWED')} INSERT into ${test.table} ${chalk.red('(SECURITY ISSUE)')}`
      );
      // Clean up test row
      await supabaseAdmin
        .from(test.table)
        .delete()
        .match(test.data as any);
    }
  }

  console.log(chalk.dim('\nDone.\n'));
}
