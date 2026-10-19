import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
export async function testServer(port, env = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'saldo-http-')),
    tokens = new Map();
  const child = spawn(process.execPath, ['server.mjs'], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DEMO_MODE: 'false',
      REGISTRATION_MODE: 'open',
      TRUST_PROXY: 'false',
      PORT: String(port),
      DATA_DIR: dir,
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let errors = '';
  child.stderr.on('data', (d) => {
    errors += d;
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Server startup timed out: ' + errors)), 10000);
    child.stdout.on('data', (d) => {
      if (d.toString().includes('Saldo running')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(Error('Server exited ' + code + ': ' + errors));
    });
  });
  const base = `http://127.0.0.1:${port}`;
  const request = async (path, method = 'GET', body, cookie, headers = {}) => {
    const response = await fetch(base + '/api/' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Saldo-Request': '1',
        ...(cookie ? { Cookie: cookie, 'X-CSRF-Token': tokens.get(cookie) || '' } : {}),
        ...headers,
      },
      ...(body !== undefined && body !== null ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    const result = {
      status: response.status,
      body: data,
      cookie: response.headers.get('set-cookie')?.split(';')[0],
      headers: response.headers,
    };
    if (data.csrfToken) tokens.set(result.cookie || cookie, data.csrfToken);
    return result;
  };
  return {
    dir,
    base,
    request,
    tokens,
    async stop() {
      child.kill();
      await new Promise((resolve) => child.once('exit', resolve));
      await rm(dir, { recursive: true, force: true });
    },
  };
}
