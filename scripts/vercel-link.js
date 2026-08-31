#!/usr/bin/env node
/**
 * Link GitHub repo to existing Vercel JAZAL project and configure build settings.
 *
 * Usage:
 *   VERCEL_TOKEN=xxx VERCEL_ORG_ID=team_xxx node scripts/vercel-link.js
 *
 * Get token: https://vercel.com/account/tokens
 * Get org id: Vercel → Team Settings → General (or `vercel teams ls`)
 */
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_9e9ngS2Ku57628F3qUUtDgz6SN55';
const TEAM_ID = process.env.VERCEL_ORG_ID || '';
const TOKEN = process.env.VERCEL_TOKEN;
const REPO = process.env.VERCEL_GIT_REPO || 'juda2018-del/-';
const REPO_ID = Number(process.env.GITHUB_REPO_ID || '1256517499');
const PRODUCTION_BRANCH = process.env.VERCEL_PRODUCTION_BRANCH || 'main';

function tokenLooksInvalid(value) {
  if (!value) return true;
  // Anonymous claim tokens (vcn_*) expire and cannot call the Vercel API.
  if (value.startsWith('vcn_')) return true;
  return false;
}

if (!TOKEN || tokenLooksInvalid(TOKEN)) {
  if (TOKEN?.startsWith('vcn_')) {
    console.error('VERCEL_TOKEN looks like an expired anonymous claim token (vcn_*).');
    console.error('Create a real API token: https://vercel.com/account/tokens');
  } else {
    console.error('Missing VERCEL_TOKEN. Create one at https://vercel.com/account/tokens');
  }
  process.exit(1);
}

function apiUrl(path) {
  const base = `https://api.vercel.com${path}`;
  if (!TEAM_ID) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}teamId=${encodeURIComponent(TEAM_ID)}`;
}

async function vercel(path, { method = 'GET', body } = {}) {
  const res = await fetch(apiUrl(path), {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || data?.message || `HTTP ${res.status}`);
    err.data = data;
    throw err;
  }
  return data;
}

async function main() {
  console.log(`Linking ${REPO} → project ${PROJECT_ID} (branch: ${PRODUCTION_BRANCH})`);

  await vercel(`/v9/projects/${PROJECT_ID}`, {
    method: 'PATCH',
    body: {
      buildCommand: 'npm run build',
      outputDirectory: 'www',
      framework: null,
      rootDirectory: null,
    },
  });
  console.log('Updated build settings: npm run build → www/');

  await vercel(`/v9/projects/${PROJECT_ID}/link`, {
    method: 'POST',
    body: { type: 'github', repo: REPO },
  });
  console.log('GitHub repository linked.');

  const deploy = await vercel('/v13/deployments', {
    method: 'POST',
    body: {
      name: 'jazal',
      project: PROJECT_ID,
      target: 'production',
      gitSource: {
        type: 'github',
        ref: PRODUCTION_BRANCH,
        repoId: REPO_ID,
      },
    },
  });
  console.log('Production deployment triggered:', deploy.url || deploy.id);

  const project = await vercel(`/v9/projects/${PROJECT_ID}`);
  const prodUrl = project?.targets?.production?.alias?.[0] || project?.alias?.[0] || 'https://jazal.vercel.app';
  console.log('Production URL:', prodUrl);
  console.log('Verify:', `curl -s ${prodUrl}/app.js | rg jazal-fusion-v3`);
}

main().catch(err => {
  console.error('Vercel link failed:', err.message);
  if (err.data) console.error(JSON.stringify(err.data, null, 2));
  process.exit(1);
});
