// admin-tool/src/commands/query.ts
//
// Execute arbitrary SQL against the database (bypasses RLS via service_role).

import { supabaseAdmin } from '../client';
import chalk from 'chalk';

export async function executeQuery(sql: string): Promise<void> {
  console.log(chalk.cyan('\nExecuting SQL:'));
  console.log(chalk.dim(sql));
  console.log();

  try {
    const { data, error } = await supabaseAdmin.rpc('', {} as any);

    // Use the REST endpoint for raw SQL since rpc won't work for arbitrary SQL.
    // We'll use the Supabase management API or postgres function instead.
    const result = await supabaseAdmin
      .from('_raw_sql' as any)
      .select()
      .limit(0);

    // For arbitrary SQL, we need to use a helper function.
    // First, check if our helper exists, if not create guidance.
    const { data: fnData, error: fnError } = await supabaseAdmin.rpc(
      'admin_execute_sql',
      { query_text: sql }
    );

    if (fnError) {
      // If the function doesn't exist, fall back to direct table queries
      if (fnError.message.includes('Could not find the function')) {
        console.log(
          chalk.yellow(
            'The admin_execute_sql function is not installed yet.\n' +
            'Falling back to table-based queries.\n' +
            'To enable arbitrary SQL, run Migration 5 first.\n'
          )
        );

        // Try to parse as a simple SELECT from table
        const selectMatch = sql.match(
          /SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+(.*))?/i
        );
        if (selectMatch) {
          const [, columns, table, rest] = selectMatch;
          let query = supabaseAdmin.from(table).select(
            columns.trim() === '*' ? '*' : columns.trim()
          );

          // Parse LIMIT
          const limitMatch = rest?.match(/LIMIT\s+(\d+)/i);
          if (limitMatch) {
            query = query.limit(parseInt(limitMatch[1]));
          }

          // Parse WHERE simple conditions
          const whereMatch = rest?.match(
            /WHERE\s+(\w+)\s*=\s*'([^']+)'/i
          );
          if (whereMatch) {
            query = query.eq(whereMatch[1], whereMatch[2]);
          }

          const { data: tableData, error: tableError } = await query;

          if (tableError) {
            console.error(chalk.red('Query error:'), tableError.message);
            return;
          }

          printResults(tableData);
          return;
        }

        console.error(
          chalk.red('Cannot parse this SQL without admin_execute_sql function.')
        );
        return;
      }

      console.error(chalk.red('Error:'), fnError.message);
      return;
    }

    printResults(fnData);
  } catch (err: any) {
    console.error(chalk.red('Unexpected error:'), err.message);
  }
}

function printResults(data: any): void {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    console.log(chalk.yellow('No results returned.'));
    return;
  }

  const rows = Array.isArray(data) ? data : [data];
  console.log(chalk.green(`${rows.length} row(s) returned:\n`));

  // Print as table
  if (rows.length > 0) {
    const keys = Object.keys(rows[0]);
    // Truncate wide values for readability
    const formatted = rows.map((row) => {
      const obj: Record<string, string> = {};
      for (const key of keys) {
        const val = row[key];
        const str =
          val === null
            ? chalk.dim('NULL')
            : typeof val === 'object'
            ? JSON.stringify(val).substring(0, 60)
            : String(val).substring(0, 60);
        obj[key] = str;
      }
      return obj;
    });
    console.table(formatted);
  }
}
