#!/usr/bin/env node
/**
 * Runs supabase/tests/rls_and_integrity.sql against DATABASE_URL
 * or the local Supabase Postgres URL.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const sqlFiles = [
  resolve('supabase/tests/rls_and_integrity.sql'),
  resolve('supabase/tests/financial_behaviour.sql'),
];
const missing = sqlFiles.filter((file) => !existsSync(file));
if (missing.length) {
  console.error('Missing SQL test file(s):', missing.join(', '));
  process.exit(1);
}

const url =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const args = [url, '-v', 'ON_ERROR_STOP=1', ...sqlFiles.flatMap((file) => ['-f', file])];
const result = spawnSync('psql', args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(
    'psql failed to start. Install PostgreSQL client tools or set DATABASE_URL.\n',
    result.error.message,
  );
  process.exit(1);
}

process.exit(result.status ?? 1);
