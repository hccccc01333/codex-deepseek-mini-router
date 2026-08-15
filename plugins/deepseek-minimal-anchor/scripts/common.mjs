/**
 * Shared helpers for the DeepSeek minimal-anchor v2 hooks.
 *
 * v2 is a task-aware mini-router: it classifies the first task (spec / react),
 * locks the mode per session, injects the matching persona at session start
 * and on the first user prompt, then adapts per-turn guidance to complexity.
 * It follows the dsh-router-standard finding that persona is the dominant
 * trigger and that mode selection must come from outside the model.
 *
 * Hooks receive one JSON object on stdin and may print JSON on stdout. Only
 * SessionStart / UserPromptSubmit events consume
 * `hookSpecificOutput.additionalContext`; SessionEnd is advisory.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PLUGIN_ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
export const REPORTS_DIR = join(homedir(), '.codex', 'deepseek-minimal-anchor-reports')
export const MODE_STATE_FILE = join(REPORTS_DIR, 'session-modes.json')
export const HOOK_LOG_FILE = join(REPORTS_DIR, 'hook-log.jsonl')

// ---------------------------------------------------------------------------
// Built-in text blocks
// ---------------------------------------------------------------------------

export const DEFAULT_NEUTRAL = `You are a helpful software engineer assistant.
Working contract for this session: diagnose and verify through tool calls, keep narration in internal reasoning, and finish with a short changed / verified / risks summary.`

export const DEFAULT_SPEC = `You are a helpful software engineer assistant.
Working contract for this session (spec mode):
- Before changing anything, read the essential project files and reproduce the current failure or behavior.
- Plan the smallest change that satisfies the task; keep diagnosis and progress in internal reasoning.
- Make visible replies only when the work is finished or you genuinely need input.
- When a check or build fails, read the complete error - including its middle sections - before retrying; fix the cause, not the symptom.
- Verify each change with the relevant checks, then finish with a short summary: what changed, what you verified, and what risks remain.`

export const DEFAULT_REACT = `You are a helpful software engineer assistant.
Working contract for this session (react mode):
- Treat the task as a build goal: produce working code or a working result directly, then verify it with the relevant checks.
- Keep diagnosis and progress in internal reasoning; make visible replies only when the work is finished or you genuinely need input.
- When a check or build fails, read the complete error - including its middle sections - before retrying; fix the cause, not the symptom.
- Verify each change with the relevant checks, then finish with a short summary: what changed, what you verified, and what risks remain.`

export const DEFAULT_FLASH = `You are a helpful assistant.
Working contract for this session (flash mode):
- Before acting, decide the task type (build or fix) and follow the matching path.
- Before acting, briefly review what you have already done and what is still missing.
- Do not run environment checks (echo, whoami, uname, pwd) or re-confirm the environment; go straight to the work.
- Think deeply about the architecture, edge cases, and integration points before producing code.
- Produce when your information is complete; end each reasoning block with a decision or an information need.
- Keep narration in internal reasoning; verify with the relevant checks; finish with a short changed / verified / risks summary.`

export const DEFAULT_MAINTENANCE = `Continue the established working contract: verify through tool calls, keep narration internal, read full errors before retrying, and finish with a short changed / verified / risks summary.`

export const DEEP_SUFFIX = ` Think deeply about the architecture, edge cases, and integration points. Do not spend reasoning on the environment or tooling. End each reasoning block with a decision or an information need.`

// ---------------------------------------------------------------------------
// Input helpers
// ---------------------------------------------------------------------------

/** Read stdin to a string (hooks are small JSON objects). */
export function readStdin() {
  try {
    return readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

/** Parse hook input; never throws - a malformed payload just disables the hook. */
export function parseInput() {
  const raw = readStdin().trim()
  if (raw === '') return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/**
 * Extract the user message from a hook payload. The payload key is not
 * documented as stable, so probe the common shapes defensively.
 */
export function messageText(input) {
  if (typeof input === 'string') return input
  for (const key of ['message', 'prompt', 'user_message', 'userMessage', 'text', 'content', 'arguments']) {
    const value = input[key]
    if (typeof value === 'string' && value.trim() !== '') return value
    if (value && typeof value === 'object') {
      if (typeof value.content === 'string' && value.content.trim() !== '') return value.content
      if (typeof value.text === 'string' && value.text.trim() !== '') return value.text
      if (Array.isArray(value)) {
        for (const part of value) {
          if (typeof part?.text === 'string' && part.text.trim() !== '') return part.text
          if (typeof part?.content === 'string' && part.content.trim() !== '') return part.content
        }
      }
    }
  }
  return ''
}

/** Field names seen on the payload (values excluded) - for tuning the extractor. */
export function inputKeys(input) {
  return Object.keys(input).filter((key) => key !== 'cwd')
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

const SPEC_WORDS = [
  'fix', 'bug', 'repair', 'refactor', 'migrat', 'review', 'audit', 'debug',
  'analy', 'maintain', 'regression', 'upgrade', 'optim', 'port', 'understand',
  'read', 'test', '修', '修复', '调试', '分析', '维护', '迁移', '优化', '升级', '理解',
]

const REACT_WORDS = [
  'build', 'create', 'implement', 'write', 'generat', 'from scratch',
  'greenfield', 'add feature', 'feature', 'script', 'simulat', 'mock',
  'prototype', 'make', 'construct', 'design', 'compose', '写', '新建', '开发',
  '生成', '仿真', '原型', '设计', '脚本', '功能',
]

const ARCHITECTURE_WORDS = [
  'architecture', 'module', 'integrat', 'entire project', 'multi-module',
  'distributed', 'pipeline', 'service', 'database', '架构', '模块', '集成',
  '整个', '分布式', '多模块', '服务', '数据库',
]

function countHits(text, words) {
  const lower = text.toLowerCase()
  return words.reduce((sum, word) => {
    let i = 0
    let at = lower.indexOf(word)
    while (at !== -1) {
      i += 1
      at = lower.indexOf(word, at + word.length)
    }
    return sum + i
  }, 0)
}

/** spec / react resolution for a prompt; ties default to spec. */
export function classifyTask(text) {
  const spec = countHits(text, SPEC_WORDS)
  const react = countHits(text, REACT_WORDS)
  if (react > spec) return 'react'
  return 'spec'
}

/** Complex tasks get the decision-closure guidance; simple tasks converge fast. */
export function isComplex(text) {
  if (text.length > 800) return true
  return countHits(text, ARCHITECTURE_WORDS) > 0
}

/**
 * Resolve the locked mode for a session. env beats model routing beats
 * classifier; ties default to spec (the measured stable top band).
 */
export function resolveMode(input, text) {
  const forced = process.env.DEEPSEEK_MINIMAL_ANCHOR_MODE
  if (forced === 'spec' || forced === 'react' || forced === 'flash') {
    return { mode: forced, source: 'env' }
  }
  const model = typeof input.model === 'string' ? input.model : ''
  if (/flash/i.test(model)) return { mode: 'flash', source: 'model' }
  if (text.trim() === '') return { mode: 'spec', source: 'default' }
  return { mode: classifyTask(text), source: 'classifier' }
}

export function personaFor(mode) {
  if (mode === 'react') return overrideText('react.txt', DEFAULT_REACT)
  if (mode === 'flash') return overrideText('flash.txt', DEFAULT_FLASH)
  return overrideText('anchor.txt', DEFAULT_SPEC)
}

export function maintenanceFor(complex) {
  const base = overrideText('maintenance.txt', DEFAULT_MAINTENANCE)
  const deep = complex === true || complex === 'complex'
  if (!deep) return base
  return base + overrideText('deep.txt', DEEP_SUFFIX)
}

// ---------------------------------------------------------------------------
// Overrides / gating / emission
// ---------------------------------------------------------------------------

/** Read an override text file beside the plugin (anchor.txt etc.). */
export function overrideText(name, fallback) {
  const file = join(PLUGIN_ROOT, name)
  if (!existsSync(file)) return fallback
  const text = readFileSync(file, 'utf8').trim()
  return text === '' ? fallback : text
}

/**
 * Whether this hook should act. Gated on the active model slug by default so
 * the plugin is inert for non-DeepSeek models. Set
 * DEEPSEEK_MINIMAL_ANCHOR=always to force, or =never to disable entirely.
 */
export function isEnabled(input) {
  const env = process.env.DEEPSEEK_MINIMAL_ANCHOR
  if (env === 'never') return false
  if (env === 'always') return true
  const model = typeof input.model === 'string' ? input.model : ''
  return /deepseek/i.test(model)
}

/** Emit additionalContext for SessionStart / UserPromptSubmit. */
export function emitContext(eventName, text) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: eventName,
      additionalContext: text,
    },
  }) + '\n')
}

/**
 * Append one injection record to the plugin audit log. Best-effort: a logging
 * failure must never affect the hook result. This is the proof the anchor was
 * actually delivered even though reasoning stays hidden.
 */
export function logInjection(input, eventName, text, extra = {}) {
  try {
    mkdirSync(REPORTS_DIR, { recursive: true })
    appendFileSync(HOOK_LOG_FILE, JSON.stringify({
      time: new Date().toISOString(),
      event: eventName,
      sessionId: input.session_id ?? null,
      model: input.model ?? null,
      mode: extra.mode ?? null,
      source: extra.source ?? null,
      complexity: extra.complexity ?? null,
      textBytes: text.length,
      keys: eventName === 'SessionStart' ? inputKeys(input) : undefined,
    }) + '\n')
  } catch {
    // audit logging is advisory
  }
}

// ---------------------------------------------------------------------------
// Per-session mode state (mode lock + persona-delivered flag)
// ---------------------------------------------------------------------------

function loadModes() {
  try {
    return JSON.parse(readFileSync(MODE_STATE_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function saveModes(modes) {
  try {
    mkdirSync(REPORTS_DIR, { recursive: true })
    writeFileSync(MODE_STATE_FILE, JSON.stringify(modes, null, 2))
  } catch {
    // state persistence is advisory
  }
}

export function getModeState(sessionId) {
  if (!sessionId) return null
  return loadModes()[sessionId] ?? null
}

export function setModeState(sessionId, mode, model, source, personaDelivered = false) {
  if (!sessionId) return
  const modes = loadModes()
  modes[sessionId] = {
    mode,
    model: model ?? null,
    source: source ?? null,
    personaDelivered: Boolean(personaDelivered),
    updatedAt: new Date().toISOString(),
  }
  saveModes(modes)
}

export function modeForReport(sessionId) {
  const state = getModeState(sessionId)
  return state
    ? { mode: state.mode, source: state.source, model: state.model }
    : null
}
