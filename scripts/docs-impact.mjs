import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
if (!process.env.GITHUB_EVENT_PATH) {
  console.log('Documentation impact check runs against the push/PR base in CI.');
  process.exit(0);
}
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')),
  base = event.pull_request?.base?.sha || event.before;
if (!base || /^0+$/.test(base)) {
  console.log('Initial publication: generated docs and link checks apply.');
  process.exit(0);
}
const files = execFileSync('git', ['diff', '--name-only', base, 'HEAD'], { encoding: 'utf8' })
  .trim()
  .split('\n');
const code = files.some((f) =>
  /^(?:src\/|deploy\/|server\.mjs$|package\.json$|vite\.config\.js$|Dockerfile$|compose.*\.yaml$)/.test(
    f,
  ),
);
const docs = files.some((f) => /^(?:README\.md$|SECURITY\.md$|docs\/.*\.md$)/.test(f));
if (code && !docs) {
  console.error(
    'Application changes require a README, SECURITY or docs update. Add an accurate docs/changelog entry if user-facing behavior is unchanged.',
  );
  process.exit(1);
}
console.log('Documentation impact check passed.');
