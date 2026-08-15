/**
 * Trajectory fingerprint without relying on hidden reasoning.
 *
 * Codex does not surface chain-of-thought: OpenAI models return only encrypted
 * reasoning summaries, and the UI never shows the chain. Verification is
 * therefore based on VISIBLE behavior that the anchored working mode changes:
 *   - number of visible assistant replies (anchored mode: ~1, the final summary)
 *   - the shape of the final summary (changed / verified / risks)
 *   - tool-call count and pace
 * If the transcript happens to contain plain reasoning text (responses
 * `reasoning` items with `reasoning_text` / `summary_text` content, which the
 * DeepSeek provider surfaces), the let-me / we fingerprint and block counts
 * are reported too - opportunistically, never as a hard requirement.
 *
 * Usage: node verify-trajectory.mjs <transcript.jsonl>
 */

import { readFileSync, statSync } from 'node:fs'

const MAX_BYTES = 32 * 1024 * 1024
const SUMMARY_MARKERS = [
  /\bchanged?\b/gi, /\bverify|verified|verification\b/gi, /\brisk(s)?\b/gi,
  /变更/gu, /验证/gu, /风险/gu,
]

export function analyzeTranscript(file) {
  let size = 0
  try { size = statSync(file).size } catch { return { error: 'transcript not found' } }
  const buffer = readFileSync(file)
  const text = buffer.length > MAX_BYTES ? buffer.subarray(buffer.length - MAX_BYTES).toString('utf8') : buffer.toString('utf8')
  const lines = text.split('\n')

  const stats = {
    reasoningTextAvailable: false,
    reasoningBlocks: 0,
    letMe: 0,
    we: 0,
    visibleReplies: 0,
    firstVisibleText: '',
    lastVisibleText: '',
    summaryCompleteness: 0,
    toolCalls: 0,
    bytes: size,
  }

  const count = (regex, value) => (value.match(regex) ?? []).length

  for (const line of lines) {
    if (line.trim() === '') continue
    let parsed
    try { parsed = JSON.parse(line) } catch { continue }
    const payload = parsed.payload ?? parsed.data ?? parsed
    const content = payload?.content
    const reasoningTexts = []
    if (payload?.type === 'reasoning' && Array.isArray(payload.content)) {
      for (const block of payload.content) {
        if ((block?.type === 'reasoning_text' || block?.type === 'summary_text') && typeof block?.text === 'string') {
          reasoningTexts.push(block.text)
        }
      }
    }
    if (Array.isArray(payload?.summary)) {
      for (const block of payload.summary) {
        if ((block?.type === 'summary_text' || block?.type === 'reasoning_text') && typeof block?.text === 'string') {
          reasoningTexts.push(block.text)
        }
      }
    }
    if (reasoningTexts.length > 0) {
      stats.reasoningTextAvailable = true
      stats.reasoningBlocks += reasoningTexts.length
      for (const text of reasoningTexts) {
        stats.letMe += count(/let me/gi, text)
        stats.we += count(/\bwe\b/gi, text)
      }
    }
    if (Array.isArray(content)) {
      for (const block of content) {
        const type = block?.type ?? ''
        const blockText = typeof block?.text === 'string' ? block.text : ''
        if (type === 'reasoning' || type === 'reasoning_block') {
          stats.reasoningBlocks += 1
          if (blockText.trim() !== '') {
            stats.reasoningTextAvailable = true
            stats.letMe += count(/let me/gi, blockText)
            stats.we += count(/\bwe\b/gi, blockText)
          }
        } else if ((type === 'text' || type === 'output_text') && blockText.trim() !== '') {
          stats.visibleReplies += 1
          stats.letMe += count(/let me/gi, blockText)
          stats.we += count(/\bwe\b/gi, blockText)
          if (stats.firstVisibleText === '') stats.firstVisibleText = blockText.trim().slice(0, 200)
          stats.lastVisibleText = blockText.trim()
        } else if (type === 'function_call' || type === 'tool_call') {
          stats.toolCalls += 1
        }
      }
    }
    if (typeof payload?.reasoning === 'string' && payload.reasoning.trim() !== '') {
      stats.reasoningTextAvailable = true
      stats.reasoningBlocks += 1
      stats.letMe += count(/let me/gi, payload.reasoning)
      stats.we += count(/\bwe\b/gi, payload.reasoning)
    }
    if (typeof payload?.type === 'string' && /function_call|tool_call/i.test(payload.type)) {
      stats.toolCalls += 1
    }
    if (typeof payload?.text === 'string' && payload.text.trim() !== '') {
      stats.visibleReplies += 1
      stats.letMe += count(/let me/gi, payload.text)
      stats.we += count(/\bwe\b/gi, payload.text)
      if (stats.firstVisibleText === '') stats.firstVisibleText = payload.text.trim().slice(0, 200)
      stats.lastVisibleText = payload.text.trim()
    }
  }

  stats.summaryCompleteness = SUMMARY_MARKERS
    .filter(marker => marker.test(stats.lastVisibleText))
    .length

  return stats
}

const file = process.argv[2]
if (file === undefined) {
  process.stderr.write('usage: node verify-trajectory.mjs <transcript.jsonl>\n')
  process.exit(1)
}
process.stdout.write(JSON.stringify(analyzeTranscript(file), null, 2) + '\n')
