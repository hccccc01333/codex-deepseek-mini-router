import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PLUGIN = dirname(dirname(dirname(fileURLToPath(import.meta.url))))

function runHook(script, payload) {
  const res = spawnSync(process.execPath, [join(PLUGIN, 'scripts', script)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  })
  assert.equal(res.status, 0, res.stderr)
  const out = res.stdout.trim()
  return out === '' ? null : JSON.parse(out)
}

function context(output) {
  return output.hookSpecificOutput.additionalContext
}

test('SessionStart with message injects the minimal Pro anchor and locks mode', () => {
  const out = runHook('anchor-session.mjs', {
    session_id: `fn-sessionstart-spec-${Date.now()}`,
    model: 'deepseek-v4-pro',
    message: 'Fix the bug in shipping.js and run the tests',
  })
  assert.ok(context(out).includes('You are a helpful software engineer assistant.'))
  assert.ok(!context(out).includes('spec mode'))
})

test('SessionStart without message injects the minimal anchor', () => {
  const out = runHook('anchor-session.mjs', {
    session_id: `fn-sessionstart-neutral-${Date.now()}`,
    model: 'deepseek-v4-pro',
  })
  assert.ok(context(out).includes('You are a helpful software engineer assistant.'))
})

test('maintain: Pro gets the one-sentence anchor and no per-turn guidance', () => {
  const sid = `fn-maintain-flow-${Date.now()}`
  const first = runHook('maintain-mode.mjs', {
    session_id: sid,
    model: 'deepseek-v4-pro',
    message: 'Build a new CLI tool from scratch and simulate a mock API',
  })
  assert.ok(context(first).includes('You are a helpful software engineer assistant.'))

  const second = runHook('maintain-mode.mjs', {
    session_id: sid,
    model: 'deepseek-v4-pro',
    message: 'now check the output',
  })
  assert.equal(second, null)

  const third = runHook('maintain-mode.mjs', {
    session_id: sid,
    model: 'deepseek-v4-pro',
    message: 'integrate this with the distributed pipeline service and database across the entire project',
  })
  assert.equal(third, null)
})

test('maintain: flash model gets flash persona', () => {
  const out = runHook('maintain-mode.mjs', {
    session_id: `fn-flash-${Date.now()}`,
    model: 'deepseek-v4-flash',
    message: 'whatever',
  })
  assert.ok(context(out).includes('flash mode'))
})

test('SessionStart compact without message re-injects the minimal Pro anchor', () => {
  const sid = `fn-compact-${Date.now()}`
  runHook('anchor-session.mjs', {
    session_id: sid,
    model: 'deepseek-v4-pro',
    message: 'Fix the bug in shipping.js and run the tests',
  })
  const out = runHook('anchor-session.mjs', {
    session_id: sid,
    model: 'deepseek-v4-pro',
    source: 'compact',
  })
  assert.ok(context(out).includes('You are a helpful software engineer assistant.'))
  assert.ok(!context(out).includes('spec mode'))
})

test('SessionStart compact with a message keeps the minimal Pro anchor', () => {
  const sid = `fn-compact-msg-${Date.now()}`
  runHook('anchor-session.mjs', {
    session_id: sid,
    model: 'deepseek-v4-pro',
    message: 'Fix the bug in shipping.js and run the tests',
  })
  const out = runHook('anchor-session.mjs', {
    session_id: sid,
    model: 'deepseek-v4-pro',
    source: 'compact',
    message: 'Build a brand new CLI tool from scratch',
  })
  assert.ok(context(out).includes('You are a helpful software engineer assistant.'))
  assert.ok(!context(out).includes('react mode'))
})

test('SessionStart clear without a message falls back to the minimal anchor', () => {
  const sid = `fn-clear-${Date.now()}`
  runHook('anchor-session.mjs', {
    session_id: sid,
    model: 'deepseek-v4-pro',
    message: 'Fix the bug in shipping.js and run the tests',
  })
  const out = runHook('anchor-session.mjs', {
    session_id: sid,
    model: 'deepseek-v4-pro',
    source: 'clear',
  })
  assert.ok(context(out).includes('You are a helpful software engineer assistant.'))
  assert.ok(!context(out).includes('spec mode'))
})
