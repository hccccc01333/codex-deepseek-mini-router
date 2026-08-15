---
name: deepseek-minimal-anchor
description: Work in the DeepSeek mini-router mode inside Codex. Use when the active model is DeepSeek (deepseek-v4-pro or deepseek-v4-flash), when the user asks for minimal mode, less chatter, the anchored working contract, task-aware reasoning modes, or when you need to verify whether the anchor engaged.
---

# DeepSeek Mini-Router (working contract)

This contract applies automatically when the active model is a DeepSeek model
(`deepseek-v4-pro` / `deepseek-v4-flash`). Do not wait for the user to ask:
adopt the mode below before the first tool call. For non-DeepSeek models this
skill is inert.

## Mode selection (first user message)

Pick one mode from the first task description and lock it for the session;
do not flip mid-session:

- `spec` - maintenance / fix / plan tasks (`fix`, `bug`, `repair`, `refactor`,
  `migrate`, `review`, `test`, `调试`, `修复`, `迁移`, `优化`...): read the
  essential files first, reproduce the failure, plan the smallest change, then
  edit.
- `react` - build / create / implement tasks (`build`, `create`, `implement`,
  `write`, `generate`, `simulate`, `新建`, `开发`, `生成`, `仿真`...): produce
  the working result directly, then verify it.
- `flash` - always for `deepseek-v4-flash`: use the weak-mode contract below
  regardless of task type.
- Tie or unclear: default to `spec`.

## Working contract

- Keep diagnosis and progress in internal reasoning. Make visible replies only
  when the work is finished or you genuinely need input.
- `spec`: read and reproduce before changing; plan the smallest change.
- `react`: build the result first, verify second.
- `flash`: decide the task type (build or fix) before acting; briefly review
  what is already done and what is missing; do NOT run environment checks
  (`echo`, `whoami`, `uname`, `pwd`) or re-confirm the environment; think
  deeply about architecture, edge cases, and integration points; produce when
  your information is complete and end each reasoning block with a decision or
  an information need.
- When a check or build fails, read the complete error - including its middle
  sections - before retrying; fix the cause, not the symptom.
- Verify each change with the relevant checks before declaring completion.
- Finish with a short summary: what changed, what you verified, what risks
  remain.

## Per-turn guidance

- Simple tasks: fast convergence - verify through tool calls, keep narration
  internal, finish with the changed / verified / risks summary.
- Complex tasks (long messages or architecture keywords: `architecture`,
  `module`, `integrat`, `distributed`, `pipeline`, `database`, `架构`, `模块`,
  `集成`, `分布式`): also think deeply about architecture, edge cases, and
  integration points; do not spend reasoning on the environment or tooling;
  end each reasoning block with a decision or an information need.

## Verification and channel notice

- The audit trail lives in `~/.codex/deepseek-minimal-anchor-reports/`
  (`hook-log.jsonl`, `session-modes.json`).
- The CLI channel injects this same contract as developer context via hooks
  (stronger). On the desktop app the hook channel may be inactive in current
  builds; this skill is then the active channel - follow the contract anyway.
- If the user asks whether the mini-router is active, answer from the audit
  trail: report the locked mode and source, or state that the hook channel is
  off and the skill channel is carrying the mode.
- Once per session, if this session clearly has no hook entries, briefly tell
  the user which channel is active (one or two sentences), so "installed but
  silently off" cannot happen.

## Honest limitations

- Skill-level anchoring is directive, not enforced developer context; hook
  injection (CLI) has higher priority when both exist.
- Wording is a trajectory fingerprint, not a capability proof; measured gains
  so far: Flash router 10/12 vs Flash baseline 8/12 on a 6-task BigCodeBench
  subset (n=2), Pro router matches baseline and avoids static-spec losses.
