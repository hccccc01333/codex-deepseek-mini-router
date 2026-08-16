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
  return JSON.parse(res.stdout.trim())
}

function context(output) {
  return output.hookSpecificOutput.additionalContext
}

test('SessionStart with message injects spec persona and locks mode', () => {
  const out = runHook('anchor-session.mjs', {
    session_id: `fn-sessionstart-spec-${Date.now()}`,
    model: 'deepseek-v4-pro',
    message: 'Fix the bug in shipping.js and run the tests',
  })
  assert.ok(context(out).includes('spec mode'))
})

test('SessionStart without message injects neutral contract', () => {
  const out = runHook('anchor-session.mjs', {
    session_id: `fn-sessionstart-neutral-${Date.now()}`,
    model: 'deepseek-v4-pro',
  })
  assert.ok(!context(out).includes('spec mode'))
  assert.ok(context(out).includes('Working contract'))
})

test('maintain: first turn persona, later turns simple/complex guidance', () => {
  const sid = `fn-maintain-flow-${Date.now()}`
  const first = runHook('maintain-mode.mjs', {
    session_id: sid,
    model: 'deepseek-v4-pro',
    message: 'Build a new CLI tool from scratch and simulate a mock API',
  })
  assert.ok(context(first).includes('react mode'))

  const second = runHook('maintain-mode.mjs', {
    session_id: sid,
    model: 'deepseek-v4-pro',
    message: 'now check the output',
  })
  assert.ok(context(second).includes('Continue the established'))
  assert.ok(!context(second).includes('Think deeply about the architecture'))

  const third = runHook('maintain-mode.mjs', {
    session_id: sid,
    model: 'deepseek-v4-pro',
    message: 'integrate this with the distributed pipeline service and database across the entire project',
  })
  assert.ok(context(third).includes('Continue the established'))
  assert.ok(context(third).includes('Think deeply about the architecture'))
})

test('maintain: flash model gets flash persona', () => {
  const out = runHook('maintain-mode.mjs', {
    session_id: `fn-flash-${Date.now()}`,
    model: 'deepseek-v4-flash',
    message: 'whatever',
  })
  assert.ok(context(out).includes('flash mode'))
})

test('SessionStart compact without message re-injects the locked persona', () => {
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
  assert.ok(context(out).includes('spec mode'))
})

test('SessionStart compact with a message keeps the locked mode', () => {
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
  assert.ok(context(out).includes('spec mode'))
  assert.ok(!context(out).includes('react mode'))
})

test('SessionStart clear without a message falls back to the neutral contract', () => {
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
  assert.ok(!context(out).includes('spec mode'))
  assert.ok(context(out).includes('Working contract'))
})
