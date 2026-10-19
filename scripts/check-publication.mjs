import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
const files = [
  ...new Set(
    execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean),
  ),
];
const issues = [];
for (const file of files) {
  if (
    /^(?:\.local\/|data\/|node_modules\/|dist\/)|(?:\.sqlite(?:-wal|-shm)?$|\.(?:pem|key|p12|pfx)$)|(?:^|\/)\.env(?:\.|$)/.test(
      file,
    ) &&
    file !== '.env.example'
  )
    issues.push(file + ': private/runtime file');
  let bytes;
  try {
    if (!statSync(file).isFile()) continue;
    bytes = readFileSync(file);
  } catch {
    continue;
  }
  if (bytes.includes(0)) continue;
  const s = bytes.toString('utf8');
  if (/-----BEGIN (?:OPENSSH|RSA|EC|DSA) PRIVATE KEY-----|\bgh[opusr]_[A-Za-z0-9]{25,}\b/.test(s))
    issues.push(file + ': possible credential');
  if (/\bvps-[a-z0-9-]+\.(?:vps\.)?ovh\./i.test(s))
    issues.push(file + ': instance-specific deployment hostname');
  for (const ip of s.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || []) {
    if (ip.split('.').some((n) => +n > 255)) continue;
    if (!/^(?:127\.|0\.0\.0\.0$|192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/.test(ip))
      issues.push(file + ': non-example network address');
  }
  for (const email of s.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []) {
    if (
      !/@(?:example\.(?:com|org|net)|[a-z0-9.-]+\.(?:test|invalid)|users\.noreply\.github\.com)$/i.test(
        email,
      )
    )
      issues.push(file + ': non-example email address');
  }
}
if (issues.length) {
  console.error([...new Set(issues)].join('\n'));
  process.exit(1);
}
console.log('Public source check passed (runtime files, credentials, addresses and hostnames).');
