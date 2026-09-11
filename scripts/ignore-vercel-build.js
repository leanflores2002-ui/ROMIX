// Optional Ignored Build Step: node scripts/ignore-vercel-build.js
// 0 = skip, 1 = build. Unknown conditions always build.
// Do not activate until the remote root/build configuration is verified.
const {execFileSync} = require('node:child_process');
const previous = process.env.VERCEL_GIT_PREVIOUS_SHA;
const current = process.env.VERCEL_GIT_COMMIT_SHA;
if (![previous,current].every(s=>/^[a-f0-9]{40}$/i.test(s||''))) process.exit(1);
try {
  const files = execFileSync('git',['diff','--name-only','-z',previous,current],{encoding:'utf8'}).split('\0').filter(Boolean);
  const documentationOnly = files.length > 0 && files.every(f => /^(docs\/|tests\/|storage-audit-(before|after)\.(json|txt)$)/.test(f));
  console.log(documentationOnly ? 'Only docs/tests/audit reports changed; skip.' : 'Runtime or unknown changes; build.');
  process.exit(documentationOnly ? 0 : 1);
} catch { process.exit(1); }
