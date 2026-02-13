#!/usr/bin/env ts-node
// admin-tool/src/index.ts
//
// Fish-Log Admin CLI
// Uses service_role key for development operations that bypass RLS.

import { Command } from 'commander';
import chalk from 'chalk';
import { executeQuery } from './commands/query';
import { seedData } from './commands/seed';
import {
  inspectRLS,
  inspectUsers,
  inspectIntegrity,
  inspectTableStats,
} from './commands/inspect';
import { testRLS } from './commands/test-rls';

const program = new Command();

program
  .name('fish-log-admin')
  .description(
    chalk.cyan('Fish-Log Admin CLI') +
      chalk.dim(' - Supabase development tool (service_role)')
  )
  .version('1.0.0');

// ── Query Command ──
program
  .command('query <sql>')
  .description('Execute arbitrary SQL against the database (bypasses RLS)')
  .action(async (sql: string) => {
    await executeQuery(sql);
  });

// ── Seed Command ──
program
  .command('seed')
  .description('Seed test data into the database')
  .option('-u, --users <count>', 'Number of test users to create', '5')
  .option('-r, --reports <count>', 'Reports per user', '10')
  .option('--clean', 'Delete existing test data before seeding', false)
  .action(async (options) => {
    await seedData({
      users: parseInt(options.users),
      reports: parseInt(options.reports),
      clean: options.clean,
    });
  });

// ── Inspect Command ──
program
  .command('inspect [target]')
  .description(
    'Inspect database state. Targets: rls, users, integrity, stats (default: stats)'
  )
  .action(async (target: string = 'stats') => {
    switch (target) {
      case 'rls':
        await inspectRLS();
        break;
      case 'users':
        await inspectUsers();
        break;
      case 'integrity':
        await inspectIntegrity();
        break;
      case 'stats':
      default:
        await inspectTableStats();
        break;
    }
  });

// ── Test RLS Command ──
program
  .command('test-rls')
  .description(
    'Test RLS policies by comparing service_role vs anon key access'
  )
  .option('-t, --table <table>', 'Test a specific table only')
  .option('--as-user <auth_id>', 'Simulate as a specific authenticated user')
  .action(async (options) => {
    await testRLS({
      table: options.table,
      asUser: options.asUser,
    });
  });

// Handle no command
program.action(() => {
  console.log(chalk.cyan('\n  Fish-Log Admin CLI\n'));
  console.log(chalk.dim('  Available commands:\n'));
  console.log('    query <sql>        Execute SQL (bypasses RLS)');
  console.log('    seed               Seed test data');
  console.log('    inspect [target]   Inspect DB state (rls|users|integrity|stats)');
  console.log('    test-rls           Compare service_role vs anon access');
  console.log(chalk.dim('\n  Run with --help for options.\n'));
});

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red('Fatal error:'), err.message);
  process.exit(1);
});
