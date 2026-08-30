#!/usr/bin/env node
/**
 * Trigger a Vercel production redeploy via Deploy Hook.
 * Create hook: Vercel → JAZAL → Settings → Git → Deploy Hooks → main
 *
 * Usage:
 *   VERCEL_DEPLOY_HOOK=https://api.vercel.com/v1/integrations/deploy/... npm run vercel:deploy
 */
const HOOK = process.env.VERCEL_DEPLOY_HOOK;

if (!HOOK) {
  console.error('Missing VERCEL_DEPLOY_HOOK.');
  console.error('Create one: Vercel → JAZAL → Settings → Git → Deploy Hooks (branch: main)');
  process.exit(1);
}

async function main() {
  const res = await fetch(HOOK, { method: 'POST' });
  const text = await res.text();
  if (!res.ok) {
    console.error('Deploy hook failed:', res.status, text);
    process.exit(1);
  }
  console.log('Vercel production deploy triggered.');
  if (text) console.log(text);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
