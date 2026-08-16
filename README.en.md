# DeepSeek Mini-Router for Codex

[中文](README.md) | **English**

A Codex plugin that fixes weak default reasoning for **DeepSeek models**
(`deepseek-v4-pro` / `deepseek-v4-flash`). It classifies each task, locks a
working mode per session, and injects the matching persona as developer
context - via hooks on desktop and CLI, with the bundled skill as a
self-checking fallback.

**Who this is for**: anyone running DeepSeek inside Codex (desktop or CLI,
official Responses API) who wants Pro to plan-before-fix on maintenance tasks,
build-first on creation tasks, and Flash to decide-and-verify instead of
rambling.

Measured on a 6-task BigCodeBench subset (`deepseek-v4-flash`):
**baseline 8/12 -> router v0 10/12 -> router v4 "decide & verify" 16/18**.
Full methodology, per-task matrix, and honest limits:
[docs/evidence.md](docs/evidence.md). Reproducible harness:
[bench/](bench/README.md).

## Quick start

```sh
git clone https://github.com/hccccc01333/codex-deepseek-mini-router
cd codex-deepseek-mini-router
codex plugin marketplace add .
codex plugin add deepseek-minimal-anchor@codex-deepseek-mini-router
```

Then:

1. Trust the hooks once (app plugin settings, or `/hooks` in the CLI). Trust is
   hash-keyed: after a plugin update, re-trust and start a new thread.
2. Open a new thread with a DeepSeek model - the contract applies automatically.
3. Ask *"Is the mini-router active?"* any time; the assistant answers from the
   audit log (`~/.codex/deepseek-minimal-anchor-reports/hook-log.jsonl`).

Environment:

- `DEEPSEEK_MINIMAL_ANCHOR=always|never` - force / disable
- `DEEPSEEK_MINIMAL_ANCHOR_MODE=auto|spec|react|flash` - route manually

## How it works

| Mode | Trigger | Contract |
| --- | --- | --- |
| spec | Pro + maintenance/fix tasks | read first, reproduce the failure, plan the smallest change, then edit |
| react | Pro + build/create tasks | produce the working result directly, then verify |
| flash | `deepseek-v4-flash` (auto) | **decide & verify**: decide task type in one step, end every reasoning block with a decision or an information need, run a concrete check after writing, retry once on failure |

The mode is locked per session and never flipped mid-session. Per-turn guidance
adapts to task complexity (decision-closure deep anchor for complex tasks).
Delivery is dual-channel: hooks are the main channel (desktop + CLI) and inject
the contract as developer context; the bundled skill is the fallback and tells
you which channel is active. Every injection is written to the audit log.

## What "v4" means (naming, once and for all)

Two different version numbers have been conflated:

- **Plugin versions**: v1 = static minimal anchor -> **v2 = mini-router
  (current)**. This is the plugin generation.
- **Persona variants**: v0-v6 are internal screening IDs for the Flash working
  contract. They are **not** plugin versions.

| Persona variant | Flash working contract | Result (BigCodeBench 6-task) |
| --- | --- | --- |
| v0 | five anchors (community w7 lineage) | 10/12 (n=2) |
| v1 | reproduce first | 5/6 (n=1) |
| v2 | spec-to-code | 4/6 (n=1) |
| v3 | converge fast | 3/6 (n=1) |
| **v4** | **decide & verify (current default)** | **16/18 (n=3)** |
| v5 | verify first | 4/6 (n=1) |
| v6 | decisive first person ("I need" / "I will") | 10/12 (n=2) |

So when the README or charts say "router v4", it means **persona variant 4
(decide & verify)**, not plugin version 4. v4 is the only variant that beat
v0; v6 tied v0 but its gain was task-level noise on a small sample (details in
[docs/evidence.md](docs/evidence.md)).

## Evidence

![Pass rate by arm](docs/pass-rate-by-arm.png)

![Per-task pass-rate heatmap](docs/per-task-heatmap.png)

![Reasoning-style metrics by persona variant](docs/thinking-metrics.png)

Core numbers (BigCodeBench v0.1.4, 6-task subset, local scoring):

| Arm | Pass rate |
| --- | --- |
| Flash baseline (no plugin, n=2) | 8/12 (67%) |
| Flash v0 five anchors (n=2) | 10/12 (83%) |
| Flash v4 decide & verify (n=3) | **16/18 (89%)** |
| Pro baseline (n=1) | 5/6 (83%) |
| Pro static-spec forced (n=1) | 4/6 (67%) |
| Pro router (n=1) | 5/6 (83%) |

Seven persona variants were screened; v4 (decide & verify) is the only one that
beat v0. Reasoning text is extracted from session transcripts
(`reasoning_text`) and scored for decisions / verification / let-me / we.

Honest limits: small samples (n=1-3), a single "implement from spec" benchmark
(react side) - the spec/maintenance side is not yet measured in Codex; phrasing
("I need" vs "let me") changes which task fails, not the pass rate; third-party
"beats Opus 4.8" claims are not endorsed by this project.

## Development

```sh
cd plugins/deepseek-minimal-anchor
npm test            # 14 unit + hook tests
```

Benchmark reproduction: see [bench/README.md](bench/README.md).
Charts: `python bench/make-charts.py`.

Official Plugins Directory submission pack and self-check checklist:
[docs/publish-checklist.md](docs/publish-checklist.md).

## License

MIT ([LICENSE](LICENSE)). Design and persona wording reference
dsh-router-standard, dsh-anchored-standard, and modeltest (MIT, see
[NOTICE.md](plugins/deepseek-minimal-anchor/NOTICE.md)). Community project,
not affiliated with DeepSeek or OpenAI.
