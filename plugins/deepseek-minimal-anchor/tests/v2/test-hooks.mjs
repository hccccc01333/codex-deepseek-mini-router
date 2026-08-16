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

function compactPayload(eventName, sessionId, model = 'deepseek-v4-pro') {
  return { hook_event_name: eventName, session_id: sessionId, model }
}

test('PreCompact asks the summary to preserve the locked contract', () => {
  const sid = `fn-precompact-${Date.now()}`
  runHook('anchor-session.mjs', {
    session_id: sid,
    model: 'deepseek-v4-pro',
    message: 'Fix the bug in shipping.js and run the tests',
  })
  const out = runHook('re-anchor.mjs', compactPayload('PreCompact', sid))
  assert.ok(context(out).toLowerCase().includes('preserve'))
  assert.ok(context(out).includes('spec'))
})

test('PostCompact re-injects the persona for the locked mode', () => {
  const sid = `fn-postcompact-${Date.now()}`
  runHook('anchor-session.mjs', {
    session_id: sid,
    model: 'deepseek-v4-pro',
    message: 'Fix the bug in shipping.js and run the tests',
  })
  const out = runHook('re-anchor.mjs', compactPayload('PostCompact', sid))
  assert.ok(context(out).includes('spec mode'))
})

test('PostCompact re-anchors the flash persona for flash sessions', () => {
  const sid = `fn-postcompact-flash-${Date.now()}`
  runHook('anchor-session.mjs', {
    session_id: sid,
    model: 'deepseek-v4-flash',
    message: 'whatever',
  })
  const out = runHook('re-anchor.mjs', compactPayload('PostCompact', sid, 'deepseek-v4-flash'))
  assert.ok(context(out).includes('flash mode'))
})

test('PostCompact with no locked mode injects the neutral contract', () => {
  const out = runHook('re-anchor.mjs', compactPayload('PostCompact', `fn-postcompact-neutral-${Date.now()}`))
  assert.ok(context(out).includes('Working contract'))
  assert.ok(!context(out).includes('spec mode'))
})
