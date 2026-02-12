// admin-tool/src/commands/inspect.ts
//
// Inspect database state: RLS policies, table stats, user data, data integrity.

import { supabaseAdmin } from '../client';
import chalk from 'chalk';

export async function inspectRLS(): Promise<void> {
  console.log(chalk.cyan('\n=== RLS Policy Audit ===\n'));

  const { data, error } = await supabaseAdmin.rpc('admin_execute_sql', {
    query_text: `
      SELECT schemaname, tablename, policyname, permissive, roles::text, cmd,
             substring(qual::text, 1, 80) as qual_preview,
             substring(with_check::text, 1, 80) as with_check_preview
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, cmd
    `,
  });

  if (error) {
    // Fallback: use the Supabase client to list tables with RLS status
    console.log(chalk.yellow('admin_execute_sql not available. Using fallback inspection.\n'));
    await inspectRLSFallback();
    return;
  }

  if (!data || data.length === 0) {
    console.log(chalk.yellow('No RLS policies found.'));
    return;
  }

  // Group by table
  const byTable: Record<string, any[]> = {};
  for (const row of data) {
    const table = row.tablename;
    if (!byTable[table]) byTable[table] = [];
    byTable[table].push(row);
  }

  for (const [table, policies] of Object.entries(byTable)) {
    console.log(chalk.bold.white(`\n  ${table}`));
    for (const p of policies) {
      const isOpen = p.qual_preview === 'true' || p.qual_preview === null;
      const status = isOpen ? chalk.red('OPEN') : chalk.green('OK');
      console.log(
        `    ${status} [${p.cmd.padEnd(6)}] ${p.policyname}`
      );
      if (p.qual_preview && p.qual_preview !== 'true') {
        console.log(chalk.dim(`           qual: ${p.qual_preview}`));
      }
      if (p.with_check_preview && p.with_check_preview !== 'true') {
        console.log(chalk.dim(`           check: ${p.with_check_preview}`));
      }
    }
  }
}

async function inspectRLSFallback(): Promise<void> {
  const tables = [
    'users', 'anonymous_users', 'harvest_reports', 'fish_entries',
    'user_achievements', 'user_rewards_entries', 'user_species_stats',
    'feedback', 'pending_submissions', 'catch_likes',
    'achievements', 'advertisements', 'fish_species', 'prizes',
    'rewards_config', 'rewards_drawings', 'drawing_prizes',
    'device_merge_requests',
  ];

  for (const table of tables) {
    const { count, error } = await supabaseAdmin
      .from(table)
      .select('*', { count: 'exact', head: true });

    const status = error ? chalk.red('ERROR') : chalk.green('OK');
    const countStr = count !== null ? `${count} rows` : 'unknown';
    console.log(`  ${status} ${table.padEnd(25)} ${countStr}`);
    if (error) {
      console.log(chalk.dim(`    ${error.message}`));
    }
  }
}

export async function inspectUsers(): Promise<void> {
  console.log(chalk.cyan('\n=== Users Summary ===\n'));

  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, email, first_name, last_name, total_reports, total_fish_reported, rewards_opted_in_at, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error(chalk.red('Error:'), error.message);
    return;
  }

  if (!users || users.length === 0) {
    console.log(chalk.yellow('No users found.'));
    return;
  }

  console.log(chalk.green(`${users.length} most recent users:\n`));
  for (const u of users) {
    const name = `${u.first_name || '?'} ${u.last_name || '?'}`;
    const rewards = u.rewards_opted_in_at ? chalk.green('rewards') : chalk.dim('no rewards');
    console.log(
      `  ${chalk.bold(name.padEnd(20))} ${(u.email || 'no email').padEnd(35)} ` +
      `${String(u.total_reports || 0).padStart(3)} reports  ${rewards}`
    );
  }

  // Anonymous users count
  const { count: anonCount } = await supabaseAdmin
    .from('anonymous_users')
    .select('*', { count: 'exact', head: true });

  console.log(chalk.dim(`\n  Anonymous users: ${anonCount || 0}`));
}

export async function inspectIntegrity(): Promise<void> {
  console.log(chalk.cyan('\n=== Data Integrity Checks ===\n'));

  // Check for orphaned fish entries
  const { data: orphanedEntries } = await supabaseAdmin
    .from('fish_entries')
    .select('id, report_id')
    .not('report_id', 'in', `(SELECT id FROM harvest_reports)`)
    .limit(5);

  // Check for reports without user OR anonymous user
  const { data: ownerlessReports } = await supabaseAdmin
    .from('harvest_reports')
    .select('id, created_at')
    .is('user_id', null)
    .is('anonymous_user_id', null)
    .limit(5);

  // Check negative counts
  const { data: negativeCounts } = await supabaseAdmin
    .from('harvest_reports')
    .select('id')
    .or('red_drum_count.lt.0,flounder_count.lt.0,spotted_seatrout_count.lt.0,weakfish_count.lt.0,striped_bass_count.lt.0')
    .limit(5);

  const checks = [
    {
      name: 'Orphaned fish entries (no matching report)',
      data: orphanedEntries,
    },
    {
      name: 'Reports without user or anonymous user',
      data: ownerlessReports,
    },
    {
      name: 'Reports with negative species counts',
      data: negativeCounts,
    },
  ];

  for (const check of checks) {
    const count = check.data?.length || 0;
    const status = count === 0 ? chalk.green('PASS') : chalk.red('FAIL');
    console.log(`  ${status} ${check.name}: ${count} found`);
    if (count > 0 && check.data) {
      for (const row of check.data.slice(0, 3)) {
        console.log(chalk.dim(`    id: ${row.id}`));
      }
    }
  }
}

export async function inspectTableStats(): Promise<void> {
  console.log(chalk.cyan('\n=== Table Row Counts ===\n'));

  const tables = [
    'users', 'anonymous_users', 'harvest_reports', 'fish_entries',
    'user_achievements', 'user_rewards_entries', 'user_species_stats',
    'feedback', 'catch_likes', 'achievements', 'fish_species',
    'rewards_drawings', 'prizes', 'advertisements',
  ];

  for (const table of tables) {
    const { count, error } = await supabaseAdmin
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`  ${chalk.red('ERR')} ${table.padEnd(25)} ${error.message}`);
    } else {
      console.log(`  ${chalk.green('OK')}  ${table.padEnd(25)} ${String(count).padStart(6)} rows`);
    }
  }
}
