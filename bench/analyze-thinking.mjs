/**
 * Thinking-quality analyzer for Codex session transcripts.
 *
 * Codex hides the UI chain, but the DeepSeek provider surfaces plain
 * `reasoning_text` / `summary_text` content inside `reasoning` response
 * items, which the session rollout stores verbatim. This tool extracts those
 * texts and scores the visible reasoning quality with behavior proxies:
 * spec restatement, edge-case enumeration, verification, decision markers,
 * self-correction, anti-patterns (environment checks / loops).
 *
 * Usage: node analyze-thinking.mjs <run-dir>   (run dir has events.jsonl +
 * workspace; the matching session rollout is resolved via the thread id)
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

function findSessionFile(threadId) {
  const root = join(homedir(), '.codex', 'sessions')
  const stack = [root]
  while (stack.length > 0) {
    const dir = stack.pop()
    let entries = []
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { continue }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else if (entry.name.includes(threadId) && entry.name.endsWith('.jsonl')) return full
    }
  }
  return null
}

function extractReasoning(file) {
  const texts = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line.trim() === '') continue
    let event
    try { event = JSON.parse(line) } catch { continue }
    const payload = event.payload ?? event
    if (payload?.type === 'reasoning' && Array.isArray(payload.content)) {
      for (const block of payload.content) {
        if ((block?.type === 'reasoning_text' || block?.type === 'summary_text') && typeof block.text === 'string') {
          texts.push(block.text)
        }
      }
    }
    if (Array.isArray(payload?.summary)) {
      for (const block of payload.summary) {
        if ((block?.type === 'summary_text' || block?.type === 'reasoning_text') && typeof block.text === 'string') {
          texts.push(block.text)
        }
      }
    }
  }
  return texts
}

function count(text, pattern) {
  return (text.match(pattern) ?? []).length
}

function analyze(runDir) {
  const eventsFile = join(runDir, 'events.jsonl')
  if (!existsSync(eventsFile)) return { error: 'no events.jsonl' }
  const first = JSON.parse(readFileSync(eventsFile, 'utf8').split('\n').find(Boolean))
  const threadId = first.thread_id ?? ''
  const sessionFile = threadId ? findSessionFile(threadId) : null
  if (!sessionFile) return { threadId, error: 'session file not found' }

  const texts = extractReasoning(sessionFile)
  const joined = texts.join('\n')
  const metrics = {
    threadId,
    sessionFile,
    reasoningBlocks: texts.length,
    reasoningChars: joined.length,
    specRestate: count(joined, /signature|parameter|return contract|return value|task_func|function (name|takes)|implement .* (function|interface)|规格|签名|参数|返回值|实现.*函数/i),
    edgeCases: count(joined, /edge case|boundary|empty (input|list|string)|negative|zero|rounding|None|nan|empty|边界|空|负|舍入|极端|越界/i),
    verification: count(joined, /verify|verification|check|run (the )?test|test case|self-check|验证|检查|测试|自检/i),
    decisions: count(joined, /\b(I will|therefore|approach|decide|plan to|strategy|decision)\b|所以我|决定|方案|策略|打算/i),
    selfCorrection: count(joined, /retry|try again|not (working|correct)|failed|fix (the )?cause|重新|失败|修正|改.*(原因|根因)/i),
    environmentChecks: count(joined, /whoami|uname|pwd|echo |environment check|环境检查/i),
    letMe: count(joined, /let me/gi),
    we: count(joined, /\bwe\b/gi),
    iNeed: count(joined, /\bI need to\b|我需要/gi),
    iWill: count(joined, /\bI will\b|我会/gi),
  }
  metrics.avgCharsPerBlock = texts.length > 0 ? Math.round(joined.length / texts.length) : 0
  return metrics
}

const runDir = process.argv[2]
if (!runDir) {
  process.stderr.write('usage: node analyze-thinking.mjs <run-dir>\n')
  process.exit(1)
}
process.stdout.write(JSON.stringify(analyze(runDir), null, 2) + '\n')
