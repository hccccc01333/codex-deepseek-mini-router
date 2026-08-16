# Evidence & methodology

This page collects the measured evidence behind the plugin. Every claim below
comes from runs on this machine (Codex CLI/desktop + official
`api.deepseek.com`, `wire_api = "responses"`), scored with BigCodeBench v0.1.4
(complete subset) executed locally.

## Claims that are supported

1. **The Flash persona measurably changes outcomes.** On a 6-task BigCodeBench
   subset, `deepseek-v4-flash` with no injection scored 4/6 twice (8/12). With
   the router persona it scored 5/6 twice (10/12). Task 736 flipped
   fail -> pass in both rounds (2/2), then stayed pass in the v4 rounds.
2. **"Decide & verify" beat the original five-anchor persona.** After
   screening seven persona variants (v0-v6), the v4 contract (decide the task
   type in one step, end every reasoning block with a decision or information
   need, run a concrete check after writing, retry once on failure) scored
   16/18 across three rounds, including task 150 passing 2/3 (it had never
   passed in any earlier Flash or Pro arm).
3. **A one-size-fits-all spec anchor hurts build tasks.** Forcing the spec
   persona on Pro dropped the same subset from 5/6 to 4/6 (task 736 failed).
   The router avoids that damage by choosing the mode per task.
4. **Reasoning content is readable in the transcript.** Codex hides the UI
   chain, but the DeepSeek provider stores plaintext `reasoning_text` /
   `summary_text` in `~/.codex/sessions/*.jsonl`. `verify-trajectory.mjs` and
   `bench/analyze-thinking.mjs` extract and score it (let-me / we, decision
   markers, verification hits, environment-check anti-patterns).

## What the charts show

![Pass rate by arm](pass-rate-by-arm.png)

![Per-task pass-rate heatmap](per-task-heatmap.png)

![Reasoning-style metrics by persona variant](thinking-metrics.png)

## Methodology

- Benchmark: BigCodeBench v0.1.4, `complete` subset, 6 tasks
  (150, 33, 900, 874, 736, 747), executed locally with bigcodebench 0.2.5.
- Arms:
  - `baseline`: official Codex + DeepSeek, plugin disabled
    (`DEEPSEEK_MINIMAL_ANCHOR=never`).
  - `router`: plugin enabled, auto mode (Flash -> flash persona; Pro ->
    spec/react classifier).
  - `static`: plugin forced to spec mode (v1-style one-size-fits-all anchor).
- Sample sizes: Flash baseline n=2, Flash router v0 n=2, Flash router v4 n=3,
  Pro arms n=1 each. Every run uses a fresh workspace copy; hidden tests and
  `package.json` hashes are checked for tampering.
- Control verification: every run's injections are recorded in
  `~/.codex/deepseek-minimal-anchor-reports/hook-log.jsonl` (baseline arms
  always show 0 injections).
- Cost: roughly ¥0.4-0.5 per 6-task arm with DeepSeek pricing
  (cache-hit input ¥0.025/M, cache-miss ¥3/M, output ¥6/M).

## Honest limits

- Small samples (n=1-3 per cell); the 736/150 flips are directional, not
  statistically decisive.
- Single benchmark, and it is "implement from spec" work - the react side of
  the router. The spec side (maintenance/fix tasks) has not been measured on a
  hard benchmark in Codex yet.
- Third-party claims ("Flash+router beats Opus 4.8", "I need is better than
  let me") are explicitly not supported by our data. Phrasing swaps which
  task fails, not the pass rate.
- The desktop app's hook channel requires trusting hooks; the bundled skill
  is the fallback channel and the same contract applies.

## Reproduce

See `bench/README.md` for the runnable scripts.
