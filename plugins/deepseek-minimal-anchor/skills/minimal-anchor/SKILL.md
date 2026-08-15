---
name: deepseek-minimal-anchor
description: Work in the DeepSeek mini-router mode inside Codex. Use when the active model is DeepSeek (deepseek-v4-pro or deepseek-v4-flash), when the user asks for minimal mode, less chatter, the anchored working contract, task-aware reasoning modes, or when you need to verify whether the anchor engaged.
---

# DeepSeek Mini-Router

DeepSeek models condition strongly on the first-visible persona, and behavior
collapses into stable bands (spec / mixed / react) instead of a continuum.
This plugin classifies the task, locks a mode per session, and injects the
matching persona as developer context - Codex's system prompt and tool catalog
cannot be replaced by a plugin, so this is an approximation, not an exact
reproduction of the harness presets.

## Modes

- `spec` (default for Pro): plan-and-fix. Read the essential files and
  reproduce the failure before changing anything; plan the smallest change;
  verify; summarize changed / verified / risks.
- `react`: build-and-verify. Produce working code or a working result
  directly, then verify it with the relevant checks; same summary discipline.
- `flash` (auto-selected for deepseek-v4-flash): weak-mode persona with five
  anchors - classify the task type, review what is done, skip environment
  checks, think deeply about architecture/edge cases, and end each reasoning
  block with a decision or an information need.

Mode resolution order: `DEEPSEEK_MINIMAL_ANCHOR_MODE` env (spec / react /
flash / auto) > model slug (flash) > keyword classifier (ties default to spec).
The mode is locked per session and never flipped mid-session.

## Per-turn guidance

- Simple tasks: fast-convergence maintenance (verify through tool calls, keep
  narration internal, finish with changed / verified / risks).
- Complex tasks (long message or architecture keywords): the same guidance
  plus the decision-closure deep anchor.
- First prompt: the classified persona itself, in case SessionStart carried no
  message.

## Enforcement and scope

- `SessionStart` / `UserPromptSubmit` hooks inject context only when the active
  model slug contains `deepseek` (or `DEEPSEEK_MINIMAL_ANCHOR=always`).
- `DEEPSEEK_MINIMAL_ANCHOR=never` disables everything.
- Customize text by creating `anchor.txt` / `react.txt` / `flash.txt` /
  `maintenance.txt` / `deep.txt` next to the plugin root (they override the
  built-in defaults).

## Verification

Codex hides chain-of-thought, so verification uses VISIBLE behavior:

- Number of visible assistant replies (anchored modes: roughly one, the final
  summary).
- Final-summary shape (changed / verified / risks, scored 0-3).
- Tool-call count and pace.
- Audit log `~/.codex/deepseek-minimal-anchor-reports/hook-log.jsonl` records
  every injection with session, model, mode, source, complexity, and size.
- Mode state `session-modes.json` and session reports include the locked mode.
- If a gateway passes DeepSeek reasoning through, `let me` / `we` counts are
  reported opportunistically.

## Honest limitations

- This changes the prompt context, not the model; "removing overfitting" is not
  possible from a plugin.
- Wording is a trajectory fingerprint, not a capability proof; the band/scores
  evidence comes from third-party self-tests (n=2 scale) and needs local
  re-measurement.
- The transcript wire format is not a stable hook API, so reports are
  best-effort.
