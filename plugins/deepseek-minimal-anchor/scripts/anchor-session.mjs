/**
 * SessionStart hook: lock the reasoning mode and inject the matching persona
 * when the first message is available; otherwise inject a neutral contract so
 * the first model request is never persona-locked to the wrong mode.
 */
import {
  DEFAULT_NEUTRAL, emitContext, getModeState, isEnabled, logInjection,
  messageText, parseInput, personaFor, resolveMode, setModeState,
  startSourceOf,
} from './common.mjs'

const input = parseInput()
if (!isEnabled(input)) process.exit(0)

const message = messageText(input)
const startSource = startSourceOf(input)
const state = getModeState(input.session_id)
const locked = state?.mode && state.mode !== 'neutral' ? state.mode : null
const reanchor = locked !== null && startSource !== 'clear'

if (message !== '' && !reanchor) {
  const resolved = resolveMode(input, message)
  const text = personaFor(resolved.mode)
  setModeState(input.session_id, resolved.mode, input.model, resolved.source, true)
  emitContext('SessionStart', text)
  logInjection(input, 'SessionStart', text, { mode: resolved.mode, source: resolved.source })
} else if (reanchor) {
  // Compact / resume / unknown restart with a locked mode: keep the lock and
  // re-inject the same persona instead of re-classifying or falling back to
  // the neutral contract.
  const text = personaFor(locked)
  emitContext('SessionStart', text)
  logInjection(input, 'SessionStart', text, { mode: locked, source: 're-anchor' })
} else {
  emitContext('SessionStart', DEFAULT_NEUTRAL)
  logInjection(input, 'SessionStart', DEFAULT_NEUTRAL, { mode: 'neutral', source: 'no-message' })
}
