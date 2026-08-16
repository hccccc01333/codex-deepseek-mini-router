import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  DEFAULT_MAINTENANCE, DEEP_SUFFIX, classifyTask, getModeState, isComplex,
  isEnabled, maintenanceFor, messageText, modeForReport, personaFor,
  resolveMode, setModeState,
} from '../../scripts/common.mjs'

const SPEC_MSG = 'Fix the bug in shipping.js: clamp bounds and free shipping threshold are wrong, tests fail.'
const REACT_MSG = 'Build a new CLI tool from scratch: create a script that simulates a mock API and generates reports.'
const AMBIGUOUS_MSG = 'Hello.'
const COMPLEX_MSG = 'Refactor this module so it integrates with the distributed pipeline service; architecture must stay clean.'

test('classifyTask: spec / react / tie-default', () => {
  assert.equal(classifyTask(SPEC_MSG), 'spec')
  assert.equal(classifyTask(REACT_MSG), 'react')
  assert.equal(classifyTask(AMBIGUOUS_MSG), 'spec')
})

test('isComplex: length and architecture keywords', () => {
  assert.equal(isComplex('short'), false)
  assert.equal(isComplex('x'.repeat(801)), true)
  assert.equal(isComplex('integrate with the distributed service and database'), true)
  assert.equal(isComplex(SPEC_MSG), false)
})

test('resolveMode: env force beats model', () => {
  const prev = process.env.DEEPSEEK_MINIMAL_ANCHOR_MODE
  process.env.DEEPSEEK_MINIMAL_ANCHOR_MODE = 'react'
  assert.deepEqual(resolveMode({ model: 'deepseek-v4-pro' }, SPEC_MSG), { mode: 'react', source: 'env' })
  process.env.DEEPSEEK_MINIMAL_ANCHOR_MODE = 'spec'
  assert.deepEqual(resolveMode({ model: 'deepseek-v4-flash' }, REACT_MSG), { mode: 'spec', source: 'env' })
  process.env.DEEPSEEK_MINIMAL_ANCHOR_MODE = 'flash'
  assert.deepEqual(resolveMode({ model: 'deepseek-v4-pro' }, REACT_MSG), { mode: 'flash', source: 'env' })
  process.env.DEEPSEEK_MINIMAL_ANCHOR_MODE = 'auto'
  if (prev === undefined) delete process.env.DEEPSEEK_MINIMAL_ANCHOR_MODE
  else process.env.DEEPSEEK_MINIMAL_ANCHOR_MODE = prev
})

test('resolveMode: flash router / pro minimal', () => {
  assert.deepEqual(resolveMode({ model: 'deepseek-v4-flash' }, SPEC_MSG), { mode: 'flash', source: 'model' })
  assert.deepEqual(resolveMode({ model: 'deepseek-v4-pro' }, REACT_MSG), { mode: 'pro', source: 'model' })
  assert.deepEqual(resolveMode({ model: 'deepseek-v4-pro' }, SPEC_MSG), { mode: 'pro', source: 'model' })
  assert.deepEqual(resolveMode({ model: 'deepseek-v4-pro' }, ''), { mode: 'pro', source: 'model' })
})

test('personaFor: distinct modes with markers', () => {
  const pro = personaFor('pro')
  const spec = personaFor('spec')
  const react = personaFor('react')
  const flash = personaFor('flash')
  assert.equal(pro, 'You are a helpful software engineer assistant.')
  assert.ok(!pro.includes('spec mode'))
  assert.ok(spec.includes('spec mode'))
  assert.ok(react.includes('react mode'))
  assert.ok(flash.includes('flash mode'))
  assert.ok(!spec.includes('react mode'))
  assert.ok(pro.length <= 2500 && spec.length <= 2500 && react.length <= 2500 && flash.length <= 2500)
})

test('maintenanceFor: simple vs complex', () => {
  const simple = maintenanceFor(false)
  const complex = maintenanceFor(true)
  assert.equal(simple, DEFAULT_MAINTENANCE)
  assert.ok(complex.startsWith(DEFAULT_MAINTENANCE))
  assert.ok(complex.includes('decision'))
  assert.equal(complex, DEFAULT_MAINTENANCE + DEEP_SUFFIX)
  assert.ok(complex.length <= 2500)
})

test('messageText: common payload shapes', () => {
  assert.equal(messageText({ message: 'fix it' }), 'fix it')
  assert.equal(messageText({ prompt: 'build it' }), 'build it')
  assert.equal(messageText({ userMessage: 'x' }), 'x')
  assert.equal(messageText({ message: { content: 'nested content' } }), 'nested content')
  assert.equal(messageText({ message: [{ type: 'text', text: 'part text' }] }), 'part text')
  assert.equal(messageText({ message: '  ' }), '')
  assert.equal(messageText({}), '')
})

test('isEnabled: never / always / model gating', () => {
  const prevNever = process.env.DEEPSEEK_MINIMAL_ANCHOR
  process.env.DEEPSEEK_MINIMAL_ANCHOR = 'never'
  assert.equal(isEnabled({ model: 'deepseek-v4-pro' }), false)
  process.env.DEEPSEEK_MINIMAL_ANCHOR = 'always'
  assert.equal(isEnabled({ model: 'gpt-5' }), true)
  delete process.env.DEEPSEEK_MINIMAL_ANCHOR
  assert.equal(isEnabled({ model: 'deepseek-v4-flash' }), true)
  assert.equal(isEnabled({ model: 'gpt-5' }), false)
  if (prevNever === undefined) delete process.env.DEEPSEEK_MINIMAL_ANCHOR
  else process.env.DEEPSEEK_MINIMAL_ANCHOR = prevNever
})

test('mode state: lock, read, report', () => {
  const sid = 'unit-test-mode-lock'
  setModeState(sid, 'react', 'deepseek-v4-pro', 'classifier', false)
  const state = getModeState(sid)
  assert.equal(state.mode, 'react')
  assert.equal(state.personaDelivered, false)
  setModeState(sid, 'react', 'deepseek-v4-pro', 'classifier', true)
  assert.equal(getModeState(sid).personaDelivered, true)
  assert.deepEqual(modeForReport(sid), { mode: 'react', source: 'classifier', model: 'deepseek-v4-pro' })
  assert.equal(getModeState('unit-test-missing'), null)
  assert.equal(modeForReport('unit-test-missing'), null)
})

test('overrideText: env override dir takes precedence', async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = mkdtempSync(join(tmpdir(), 'dsh-variant-'))
  try {
    writeFileSync(join(dir, 'flash.txt'), 'VARIANT FLASH TEXT')
    const prev = process.env.DEEPSEEK_MINIMAL_ANCHOR_OVERRIDE_DIR
    process.env.DEEPSEEK_MINIMAL_ANCHOR_OVERRIDE_DIR = dir
    assert.equal(personaFor('flash'), 'VARIANT FLASH TEXT')
    if (prev === undefined) delete process.env.DEEPSEEK_MINIMAL_ANCHOR_OVERRIDE_DIR
    else process.env.DEEPSEEK_MINIMAL_ANCHOR_OVERRIDE_DIR = prev
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
