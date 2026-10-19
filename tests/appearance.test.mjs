import test from 'node:test';
import assert from 'node:assert/strict';
import { appearance, themes } from '../src/appearance.mjs';
test('appearance has safe defaults for old accounts and invalid imported preferences', () => {
  assert.deepEqual(appearance(), { color: 'forest', mode: 'light' });
  assert.deepEqual(appearance({ color: 'unknown', mode: 'invalid' }), {
    color: 'forest',
    mode: 'light',
  });
  for (const theme of themes)
    assert.deepEqual(appearance({ color: theme.id, mode: 'dark' }), {
      color: theme.id,
      mode: 'dark',
    });
  assert.equal(appearance({ mode: 'system' }).mode, 'system');
});
