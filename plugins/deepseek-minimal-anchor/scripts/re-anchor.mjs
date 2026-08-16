/**
 * PreCompact / PostCompact hooks: keep the locked working contract alive
 * across context compaction.
 *
 * PreCompact emits a short preservation instruction so the compaction summary
 * keeps the contract; PostCompact re-injects the full persona for the
 * still-locked mode (or the neutral contract when no mode was locked yet).
 * Both events consume `additionalContext`, like SessionStart.
 */
import {
  DEFAULT_NEUTRAL, emitContext, getModeState, isEnabled, logInjection,
  parseInput, personaFor,
} from './common.mjs'

const input = parseInput()
if (!isEnabled(input)) process.exit(0)

const eventName =
  typeof input.hook_event_name === 'string' && input.hook_event_name !== ''
    ? input.hook_event_name
    : (process.argv[2] ?? 'PostCompact')
if (eventName !== 'PreCompact' && eventName !== 'PostCompact') process.exit(0)

const state = getModeState(input.session_id)
const mode = state?.mode ?? 'neutral'

if (eventName === 'PreCompact') {
  const text = mode === 'neutral'
    ? `${DEFAULT_NEUTRAL}\nPreserve this working contract in the summary; it must keep applying after compaction.`
    : `Working contract for this session is locked to ${mode} mode. Preserve the contract and this mode in the summary; the persona must keep applying after compaction.`
  emitContext(eventName, text)
  logInjection(input, eventName, text, { mode, source: 're-anchor' })
} else {
  const text = mode === 'neutral' ? DEFAULT_NEUTRAL : personaFor(mode)
  emitContext(eventName, text)
  logInjection(input, eventName, text, { mode, source: 're-anchor' })
}
