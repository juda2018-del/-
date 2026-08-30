#!/usr/bin/env node
/**
 * Run Vercel CLI without a stale anonymous vcn_* token in the environment.
 */
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Usage: node scripts/vercel-cli.js <vercel args...>');
  process.exit(1);
}

const env = { ...process.env };
if (env.VERCEL_TOKEN?.startsWith('vcn_')) {
  delete env.VERCEL_TOKEN;
}

const result = spawnSync('npx', ['vercel', ...args], {
  stdio: 'inherit',
  env,
  shell: false,
});

process.exit(result.status ?? 1);
