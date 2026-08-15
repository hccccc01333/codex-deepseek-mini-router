/**
 * SessionStart hook: lock the reasoning mode and inject the matching persona
 * when the first message is available; otherwise inject a neutral contract so
 * the first model request is never persona-locked to the wrong mode.
 */
import {
  DEFAULT_NEUTRAL, emitContext, isEnabled, logInjection, messageText,
  parseInput, personaFor, resolveMode, setModeState,
} from './common.mjs'

const input = parseInput()
if (!isEnabled(input)) process.exit(0)

const message = messageText(input)
if (message !== '') {
  const resolved = resolveMode(input, message)
  const text = personaFor(resolved.mode)
  setModeState(input.session_id, resolved.mode, input.model, resolved.source, true)
  emitContext('SessionStart', text)
  logInjection(input, 'SessionStart', text, { mode: resolved.mode, source: resolved.source })
} else {
  emitContext('SessionStart', DEFAULT_NEUTRAL)
  logInjection(input, 'SessionStart', DEFAULT_NEUTRAL, { mode: 'neutral', source: 'no-message' })
}
