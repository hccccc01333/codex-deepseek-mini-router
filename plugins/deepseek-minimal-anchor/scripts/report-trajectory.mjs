/**
 * SessionEnd hook (advisory): write a trajectory fingerprint for the session
 * to ~/.codex/deepseek-minimal-anchor-reports/. Best-effort and time-boxed;
 * a failure here never blocks Codex. Does not depend on hidden reasoning:
 * visible-reply count, final-summary shape, tool-call count, plus reasoning
 * markers only when the transcript actually contains plain reasoning text.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { analyzeTranscript } from './verify-trajectory.mjs'
import { isEnabled, modeForReport, parseInput } from './common.mjs'

const input = parseInput()
if (!isEnabled(input)) process.exit(0)

const transcript = typeof input.transcript_path === 'string' ? input.transcript_path : ''
if (transcript === '') process.exit(0)

try {
  const stats = analyzeTranscript(transcript)
  const dir = join(homedir(), '.codex', 'deepseek-minimal-anchor-reports')
  mkdirSync(dir, { recursive: true })

  // Count how many times this session's hooks actually injected context.
  const logFile = join(dir, 'hook-log.jsonl')
  let injections = 0
  try {
    const lines = readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean)
    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        if (entry.sessionId === input.session_id) injections += 1
      } catch {
        // skip malformed audit lines
      }
    }
  } catch {
    // no audit log yet
  }

  const file = join(dir, `${input.session_id ?? 'session'}-${Date.now()}.json`)
  writeFileSync(file, JSON.stringify({
    sessionId: input.session_id ?? null,
    model: input.model ?? null,
    mode: modeForReport(input.session_id),
    injections,
    reasoningHidden: !stats.reasoningTextAvailable,
    ...stats,
    generatedAt: new Date().toISOString(),
  }, null, 2))
} catch {
  // Advisory only: never surface a hook failure for a statistics report.
}
process.exit(0)
