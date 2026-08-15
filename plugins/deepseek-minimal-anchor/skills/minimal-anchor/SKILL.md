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
- **Hook trust is a Codex security mechanism the plugin cannot bypass or set
  itself.** Installing or enabling the plugin does not trust its hooks; until
  the user reviews and trusts them (app plugin settings, or `/hooks` in the
  CLI), the skill below still loads but NO context is injected.

## Is the router actually on?

When a user asks whether the mini-router is active (or you need to verify it
yourself), answer from the audit trail, not from assumptions:

- Read `~/.codex/deepseek-minimal-anchor-reports/hook-log.jsonl` and
  `~/.codex/deepseek-minimal-anchor-reports/session-modes.json`.
- If the current session id (or a recent DeepSeek session) appears with
  `SessionStart` / `UserPromptSubmit` entries: report the locked mode and
  source (`spec` / `react` / `flash`, from env / model / classifier).
- If there is no matching entry: hooks are not trusted or not running. Tell
  the user to trust the hooks (app plugin settings, or `/hooks` in the CLI),
  then start a NEW thread - this thread cannot be retro-fitted.
- If the plugin is disabled by `DEEPSEEK_MINIMAL_ANCHOR=never`, say so and
  explain the env var.

Keep the answer short: on/off, mode, and the one next action if off.

## Proactive notice

Because hook trust is manual, a user can have the plugin installed with the
router silently off. On DeepSeek-model sessions, check the audit log once at
the start of meaningful work (not on trivial chit-chat):

- If `hook-log.jsonl` has no entry for this session and no entry within the
  last few minutes for a DeepSeek session, briefly tell the user the
  mini-router is NOT active and give the two-step fix: trust the hooks
  (app plugin settings, or `/hooks` in the CLI), then start a new thread.
- Do not repeat the notice in the same session once the user has acknowledged
  it, has disabled the plugin (`DEEPSEEK_MINIMAL_ANCHOR=never`), or the log
  shows this session's injections.
- One or two sentences max; lead with the actionable fact, not a wall of text.

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
- Hook trust is manual by design; a plugin that silently trusted itself would
  defeat Codex's hook review. The audit log is the source of truth for whether
  the anchor actually delivered.
