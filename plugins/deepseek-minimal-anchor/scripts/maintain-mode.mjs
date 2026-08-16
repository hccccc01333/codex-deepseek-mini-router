/**
 * UserPromptSubmit hook: inject the persona on the first prompt (when the
 * SessionStart payload had no message), then per-turn guidance afterwards.
 * Guidance is Flash-only: Pro sessions stay on the one-sentence Minimal
 * anchor and get no further injections.
 */
import {
  emitContext, getModeState, isComplex, isEnabled, logInjection, maintenanceFor,
  messageText, parseInput, personaFor, resolveMode, setModeState,
} from './common.mjs'

const input = parseInput()
if (!isEnabled(input)) process.exit(0)

const message = messageText(input)
const state = getModeState(input.session_id)
const complexity = isComplex(message) ? 'complex' : 'simple'

if (state?.personaDelivered) {
  if (state.mode === 'pro') process.exit(0)
  const text = maintenanceFor(complexity)
  emitContext('UserPromptSubmit', text)
  logInjection(input, 'UserPromptSubmit', text, {
    mode: state.mode,
    source: 'maintenance',
    complexity,
  })
} else {
  const resolved = resolveMode(input, message)
  const text = personaFor(resolved.mode)
  setModeState(input.session_id, resolved.mode, input.model, resolved.source, true)
  emitContext('UserPromptSubmit', text)
  logInjection(input, 'UserPromptSubmit', text, {
    mode: resolved.mode,
    source: resolved.source,
    complexity,
  })
}
